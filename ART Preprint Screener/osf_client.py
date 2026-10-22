"""Minimal OSF API v2 client for preprint moderation.

Deliberately exposes exactly one moderation action: reject(). There is no
accept function anywhere in this project, so no model output can cause a
preprint to be accepted.

Endpoint shapes follow the OSF API v2 (JSON:API). They were written without
live access to api.osf.io; run the screener in trial mode first to confirm
the read endpoints before enabling live rejections.
"""
import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from typing import Iterator

from config import config

logger = logging.getLogger(__name__)

JSONAPI = "application/vnd.api+json"
MAX_FILE_BYTES = 100 * 1024 * 1024


class OSFError(RuntimeError):
    pass


def _request(method: str, url: str, body: dict | None = None, raw: bool = False):
    if not url.startswith("http"):
        url = f"{config.osf_api_base}/{url.lstrip('/')}"
    headers = {"Authorization": f"Bearer {config.osf_token}", "Accept": JSONAPI}
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = JSONAPI
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            payload = resp.read(MAX_FILE_BYTES + 1) if raw else resp.read()
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")[:500]
        raise OSFError(f"{method} {url} -> HTTP {e.code}: {detail}") from e
    if raw:
        if len(payload) > MAX_FILE_BYTES:
            raise OSFError(f"File at {url} exceeds {MAX_FILE_BYTES} bytes")
        return payload
    return json.loads(payload) if payload else {}


def _paginate(url: str) -> Iterator[dict]:
    while url:
        page = _request("GET", url)
        yield from page.get("data", [])
        url = (page.get("links") or {}).get("next")


def _related_url(resource: dict, rel: str) -> str | None:
    links = ((resource.get("relationships") or {}).get(rel) or {}).get("links") or {}
    related = links.get("related")
    return related.get("href") if isinstance(related, dict) else related


# ---------------------------------------------------------------------------
# Reads
# ---------------------------------------------------------------------------

def pending_preprints() -> list[dict]:
    """Submissions to the provider awaiting moderation (requires a moderator token)."""
    query = urllib.parse.urlencode({"filter[reviews_state]": "pending", "page[size]": 100})
    return list(_paginate(f"providers/preprints/{config.provider_id}/preprints/?{query}"))


def submitter_id(preprint: dict) -> str | None:
    """OSF user GUID of whoever triggered the 'submit' review action."""
    url = _related_url(preprint, "review_actions") or f"preprints/{preprint['id']}/review_actions/"
    actions = [a for a in _paginate(url) if (a.get("attributes") or {}).get("trigger") == "submit"]
    if not actions:
        return None
    actions.sort(key=lambda a: a["attributes"].get("date_created", ""))
    creator = ((actions[0].get("relationships") or {}).get("creator") or {}).get("data") or {}
    return creator.get("id")


def contributors(preprint: dict) -> list[dict]:
    """Contributor profiles as plain dicts for the agent and the editor check."""
    url = _related_url(preprint, "contributors") or f"preprints/{preprint['id']}/contributors/"
    sep = "&" if "?" in url else "?"
    people = []
    for c in _paginate(f"{url}{sep}embed=users"):
        user = ((c.get("embeds") or {}).get("users") or {}).get("data") or {}
        attrs = user.get("attributes") or {}
        social = attrs.get("social") or {}
        rel_user = (((c.get("relationships") or {}).get("users") or {}).get("data") or {})
        people.append({
            "osf_user_id": user.get("id") or rel_user.get("id"),
            "full_name": attrs.get("full_name") or (c.get("attributes") or {}).get("unregistered_contributor"),
            "bibliographic": (c.get("attributes") or {}).get("bibliographic"),
            "employment": attrs.get("employment") or [],
            "education": attrs.get("education") or [],
            "orcid": social.get("orcid"),
            "osf_profile": f"https://osf.io/{user['id']}/" if user.get("id") else None,
        })
    return people


def primary_file(preprint: dict) -> tuple[str, bytes]:
    """(filename, bytes) of the preprint's primary manuscript file."""
    url = _related_url(preprint, "primary_file")
    if not url:
        raise OSFError(f"Preprint {preprint['id']} has no primary_file relationship")
    file_obj = _request("GET", url).get("data") or {}
    name = (file_obj.get("attributes") or {}).get("name") or f"{preprint['id']}.pdf"
    download = (file_obj.get("links") or {}).get("download")
    if not download:
        raise OSFError(f"Primary file for {preprint['id']} has no download link")
    return name, _request("GET", download, raw=True)


# ---------------------------------------------------------------------------
# The only write
# ---------------------------------------------------------------------------

def reject(preprint_id: str, comment: str) -> dict:
    """Reject a pending preprint. The comment is emailed to the submitter by OSF."""
    body = {
        "data": {
            "type": "review-actions",
            "attributes": {"trigger": "reject", "comment": comment},
            "relationships": {"target": {"data": {"type": "preprints", "id": preprint_id}}},
        }
    }
    return _request("POST", "actions/reviews/", body)
