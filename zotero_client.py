"""Zotero Web API client (via pyzotero).

Provides a configured pyzotero.Zotero instance and shared formatting helpers.
"""
import logging

from pyzotero import zotero

from config import config

logger = logging.getLogger(__name__)


def get_zot() -> zotero.Zotero:
    """Return a configured pyzotero client. Validates config on first call."""
    config.validate()
    return zotero.Zotero(
        library_id=config.zotero_user_id,
        library_type=config.zotero_library_type,
        api_key=config.zotero_api_key,
    )


# ---------------------------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------------------------

def _authors(creators: list[dict], roles: tuple[str, ...] = ("author", "editor")) -> str:
    parts = []
    for c in creators:
        if c.get("creatorType") not in roles:
            continue
        last = c.get("lastName") or c.get("name", "")
        first = c.get("firstName", "")
        parts.append(f"{last}, {first}".strip(", ") if first else last)
    return "; ".join(parts) or "(no authors)"


def format_item_brief(item: dict) -> str:
    """One-line summary: [KEY] Authors (Year) — Title"""
    data = item.get("data", item)
    key = item.get("key", data.get("key", "?"))
    title = data.get("title", "(no title)")
    year = (data.get("date", "") or "")[:4]
    authors = _authors(data.get("creators", []))[:70]
    return f"[{key}] {authors} ({year}) — {title}"


def format_item_full(item: dict) -> str:
    """Detailed multi-line item display."""
    data = item.get("data", item)
    key = item.get("key", data.get("key", "?"))

    pub = (
        data.get("publicationTitle")
        or data.get("bookTitle")
        or data.get("conferenceName")
        or ""
    )
    abstract = (data.get("abstractNote", "") or "")
    if len(abstract) > 500:
        abstract = abstract[:497] + "..."

    tags = ", ".join(t["tag"] for t in data.get("tags", []))
    doi = data.get("DOI", "")
    url = data.get("url", "")

    lines = [
        f"Key:       {key}",
        f"Type:      {data.get('itemType', '')}",
        f"Title:     {data.get('title', '(no title)')}",
        f"Authors:   {_authors(data.get('creators', []))}",
        f"Year:      {(data.get('date', '') or '')[:4]}",
    ]
    if pub:
        lines.append(f"Published: {pub}")
    if data.get("volume"):
        lines.append(f"Volume:    {data['volume']}")
    if data.get("pages"):
        lines.append(f"Pages:     {data['pages']}")
    if doi:
        lines.append(f"DOI:       {doi}")
    elif url:
        lines.append(f"URL:       {url}")
    if abstract:
        lines.append(f"\nAbstract:\n{abstract}")
    if tags:
        lines.append(f"\nTags: {tags}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# BibTeX fallback (when BBT is not available)
# ---------------------------------------------------------------------------

_ZOTERO_TO_BIBTEX = {
    "journalArticle": "article",
    "book": "book",
    "bookSection": "incollection",
    "conferencePaper": "inproceedings",
    "thesis": "phdthesis",
    "report": "techreport",
    "magazineArticle": "article",
    "newspaperArticle": "article",
    "webpage": "misc",
    "preprint": "misc",
}


def format_bibtex_fallback(item: dict) -> str:
    """Construct a minimal BibTeX entry from a pyzotero item dict.

    Used when Better BibTeX is not running. Quality is lower than BBT output
    (cite key is the Zotero item key, not a formatted citekey).
    """
    data = item.get("data", item)
    key = item.get("key", data.get("key", "unknown"))
    item_type = data.get("itemType", "misc")
    bib_type = _ZOTERO_TO_BIBTEX.get(item_type, "misc")

    author_parts = []
    for c in data.get("creators", []):
        if c.get("creatorType") != "author":
            continue
        last = c.get("lastName", "")
        first = c.get("firstName", "")
        author_parts.append(f"{last}, {first}".strip(", "))
    authors = " and ".join(author_parts)

    year = (data.get("date", "") or "")[:4]
    pub = (
        data.get("publicationTitle")
        or data.get("bookTitle")
        or data.get("conferenceName")
        or ""
    )

    fields: list[str] = []
    if authors:
        fields.append(f"  author    = {{{authors}}}")
    if data.get("title"):
        fields.append(f"  title     = {{{{{data['title']}}}}}")
    if year:
        fields.append(f"  year      = {{{year}}}")
    if pub:
        fields.append(f"  journal   = {{{pub}}}")
    if data.get("volume"):
        fields.append(f"  volume    = {{{data['volume']}}}")
    if data.get("pages"):
        fields.append(f"  pages     = {{{data['pages']}}}")
    if data.get("DOI"):
        fields.append(f"  doi       = {{{data['DOI']}}}")

    body = ",\n".join(fields)
    return f"@{bib_type}{{{key},\n{body}\n}}"
