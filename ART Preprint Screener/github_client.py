"""GitHub Issues helper.

Issues are both the notification channel (GitHub emails the repo owner) and
the record of preprints already handed to the editor, so later runs skip them.
"""
import json
import re
import urllib.error
import urllib.request

from config import config

API = "https://api.github.com"
OSF_TAG = re.compile(r"\[osf:([A-Za-z0-9_-]+)\]")


def _request(method: str, path: str, body: dict | None = None):
    req = urllib.request.Request(
        f"{API}{path}",
        data=json.dumps(body).encode() if body is not None else None,
        method=method,
        headers={
            "Authorization": f"Bearer {config.github_token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read() or b"null")
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"GitHub {method} {path} -> HTTP {e.code}: {e.read().decode(errors='replace')[:300]}") from e


def handled_preprint_ids() -> set[str]:
    """Preprint IDs that already have an issue (open or closed) with the screener label."""
    ids, page = set(), 1
    while True:
        batch = _request(
            "GET",
            f"/repos/{config.github_repo}/issues?labels={config.issue_label}&state=all&per_page=100&page={page}",
        )
        if not batch:
            return ids
        for issue in batch:
            ids.update(OSF_TAG.findall(issue.get("title", "")))
        page += 1


def create_issue(title: str, body: str, extra_labels: list[str] | None = None) -> str:
    issue = _request(
        "POST",
        f"/repos/{config.github_repo}/issues",
        {"title": title, "body": body, "labels": [config.issue_label, *(extra_labels or [])]},
    )
    return issue["html_url"]
