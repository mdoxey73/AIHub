"""Zotero MCP Server
==================
Exposes Zotero library tools to Claude via the Model Context Protocol.

Connection strategy:
  - Better BibTeX (local, http://localhost:23119) — preferred when Zotero is running
  - Zotero Web API (api.zotero.org via pyzotero) — always used for library data;
    sole source when Zotero is not running locally

Usage:
    python server.py

Configure via .env file (copy .env.example and fill in your credentials).
All log output goes to stderr — stdout is reserved for the MCP protocol wire.
"""
import json
import logging
import sys

from mcp.server.fastmcp import FastMCP

import bbt_client as bbt
from zotero_client import (
    format_bibtex_fallback,
    format_item_brief,
    format_item_full,
    get_zot,
)

# All logging must go to stderr — stdout is the MCP protocol stream.
logging.basicConfig(stream=sys.stderr, level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

mcp = FastMCP("zotero")


# ---------------------------------------------------------------------------
# Helper: BBT status line for info tools
# ---------------------------------------------------------------------------

def _bbt_status() -> str:
    return "available (Zotero running locally)" if bbt.is_available() else "not available (Zotero not running)"


# ===========================================================================
# Search & Retrieval
# ===========================================================================


@mcp.tool()
def search_library(
    query: str,
    limit: int = 25,
    item_type: str = "",
    tag: str = "",
    collection_key: str = "",
) -> str:
    """Search the Zotero library by title, author, abstract, or full text.

    Args:
        query: Search terms (e.g. 'earnings management auditing')
        limit: Maximum results to return (default 25, max 100)
        item_type: Filter by Zotero item type, e.g. 'journalArticle', 'book',
                   'conferencePaper', 'thesis', 'report'
        tag: Filter by tag name (exact match)
        collection_key: Restrict to a specific collection (Zotero collection key)
    """
    zot = get_zot()
    kwargs: dict = {"q": query, "qmode": "everything", "limit": min(limit, 100)}
    if item_type:
        kwargs["itemType"] = item_type
    if tag:
        kwargs["tag"] = tag

    if collection_key:
        items = zot.collection_items(collection_key, **kwargs)
    else:
        items = zot.items(**kwargs)

    content = [i for i in items if i["data"].get("itemType") not in ("attachment", "note")]
    if not content:
        return f"No items found for '{query}'."

    lines = [f"{len(content)} result(s) for '{query}':\n"]
    lines.extend(format_item_brief(i) for i in content)
    return "\n".join(lines)


@mcp.tool()
def get_item(item_key: str) -> str:
    """Get full details for a Zotero item by its key (e.g. 'AB12CD34').

    Args:
        item_key: 8-character Zotero item key
    """
    zot = get_zot()
    results = zot.item(item_key)
    item = results[0] if isinstance(results, list) else results
    return format_item_full(item)


@mcp.tool()
def get_item_by_citekey(citekey: str) -> str:
    """Find a Zotero item by its Better BibTeX cite key (e.g. 'smith2020auditing').

    Requires Zotero to be running locally with Better BibTeX installed.

    Args:
        citekey: The Better BibTeX cite key
    """
    if not bbt.is_available():
        return (
            "Better BibTeX is not available — Zotero must be running with the "
            "Better BibTeX plugin installed.\n"
            "Tip: use search_library() to find items when Zotero is closed."
        )

    matches = bbt.search_by_citekey(citekey)
    if not matches:
        return f"No item found with cite key '{citekey}'."

    # BBT search results have a different structure than pyzotero items.
    item = matches[0]
    title = item.get("title", "(no title)")
    year = (item.get("date", "") or "")[:4]
    authors = "; ".join(
        f"{c.get('lastName', c.get('name', ''))}"
        for c in item.get("creators", [])
        if c.get("creatorType") in ("author", "editor")
    ) or "(no authors)"
    pub = item.get("publicationTitle", item.get("bookTitle", ""))
    doi = item.get("DOI", "")
    abstract = (item.get("abstractNote", "") or "")[:500]
    zotero_key = item.get("key", "")

    lines = [
        f"Cite Key:  {citekey}",
        f"Key:       {zotero_key}",
        f"Type:      {item.get('itemType', '')}",
        f"Title:     {title}",
        f"Authors:   {authors}",
        f"Year:      {year}",
    ]
    if pub:
        lines.append(f"Published: {pub}")
    if doi:
        lines.append(f"DOI:       {doi}")
    if abstract:
        lines.append(f"\nAbstract:\n{abstract}")
    return "\n".join(lines)


@mcp.tool()
def list_collections(parent_key: str = "") -> str:
    """List Zotero collections. Omit parent_key for top-level collections.

    Args:
        parent_key: Parent collection key to list sub-collections (optional)
    """
    zot = get_zot()
    collections = zot.collections_sub(parent_key) if parent_key else zot.collections()

    if not collections:
        return "No collections found."

    # Filter to top-level only when listing all (parent_key empty)
    if not parent_key:
        collections = [c for c in collections if not c["data"].get("parentCollection")]

    lines = [f"{'Sub-collections' if parent_key else 'Collections'} ({len(collections)}):\n"]
    for col in sorted(collections, key=lambda c: c["data"].get("name", "").lower()):
        key = col["key"]
        name = col["data"].get("name", "(unnamed)")
        count = col["data"].get("numItems", "?")
        lines.append(f"[{key}] {name}  ({count} items)")
    return "\n".join(lines)


@mcp.tool()
def get_collection_items(collection_key: str, limit: int = 50) -> str:
    """List items in a Zotero collection.

    Args:
        collection_key: The Zotero collection key
        limit: Maximum items to return (default 50)
    """
    zot = get_zot()
    items = zot.collection_items(collection_key, limit=min(limit, 100))
    content = [i for i in items if i["data"].get("itemType") not in ("attachment", "note")]

    if not content:
        return f"No items found in collection {collection_key}."

    lines = [f"Collection {collection_key} — {len(content)} item(s):\n"]
    lines.extend(format_item_brief(i) for i in content)
    return "\n".join(lines)


@mcp.tool()
def get_tags(filter_query: str = "", limit: int = 200) -> str:
    """List tags in the Zotero library, optionally filtered.

    Args:
        filter_query: Show only tags containing this string (case-insensitive)
        limit: Maximum tags to return (default 200)
    """
    zot = get_zot()
    tags = zot.tags()

    tag_names = sorted({t["tag"] for t in tags})
    if filter_query:
        tag_names = [t for t in tag_names if filter_query.lower() in t.lower()]

    tag_names = tag_names[:limit]
    if not tag_names:
        return f"No tags found{f' matching \"{filter_query}\"' if filter_query else ''}."

    return f"Tags ({len(tag_names)}):\n" + "\n".join(tag_names)


@mcp.tool()
def get_item_attachments(item_key: str) -> str:
    """Get attachments (PDFs, links, snapshots) for a Zotero item.

    Args:
        item_key: The Zotero item key
    """
    zot = get_zot()
    children = zot.children(item_key)
    attachments = [c for c in children if c["data"].get("itemType") == "attachment"]

    if not attachments:
        return f"No attachments found for item {item_key}."

    lines = [f"Attachments for {item_key}:\n"]
    for att in attachments:
        data = att["data"]
        akey = att["key"]
        title = data.get("title", "(unnamed)")
        link_mode = data.get("linkMode", "")
        content_type = data.get("contentType", "")
        path = data.get("path", "")
        url = data.get("url", "")

        lines.append(f"[{akey}] {title}")
        lines.append(f"        Mode: {link_mode}  Type: {content_type}")
        if path:
            lines.append(f"        Path: {path}")
        if url:
            lines.append(f"        URL:  {url}")
    return "\n".join(lines)


@mcp.tool()
def get_library_info() -> str:
    """Get a summary of the Zotero library: item count, collections, tags, BBT status."""
    zot = get_zot()
    from config import config as cfg

    item_count = zot.count_items()
    collections = zot.collections()
    tags = zot.tags()

    lines = [
        f"Library ID:    {cfg.zotero_user_id} ({cfg.zotero_library_type})",
        f"Total items:   {item_count}",
        f"Collections:   {len(collections)}",
        f"Unique tags:   {len({t['tag'] for t in tags})}",
        f"Better BibTeX: {_bbt_status()}",
    ]
    return "\n".join(lines)


# ===========================================================================
# BibTeX & Citation Keys
# ===========================================================================


@mcp.tool()
def get_bibtex(item_keys: str) -> str:
    """Export one or more Zotero items as BibTeX.

    Uses Better BibTeX (local) when Zotero is running for high-quality output
    with proper cite keys. Falls back to web API with basic BibTeX otherwise.

    Args:
        item_keys: Comma-separated Zotero item keys, e.g. 'AB12CD34' or 'AB12CD34,EF56GH78'
    """
    keys = [k.strip() for k in item_keys.split(",") if k.strip()]
    if not keys:
        return "No item keys provided."

    if bbt.is_available():
        try:
            # Step 1: resolve Zotero item keys → BBT cite keys
            citekey_map = bbt.get_citekeys(keys)
            citekeys = [v for v in citekey_map.values() if v]
            if citekeys:
                bibtex = bbt.export_bibtex(citekeys)
                if bibtex and bibtex.strip():
                    return bibtex
        except Exception as e:
            logger.warning("BBT export failed, falling back to web API: %s", e)

    # Web API fallback
    zot = get_zot()
    entries: list[str] = []
    for key in keys:
        try:
            results = zot.item(key)
            item = results[0] if isinstance(results, list) else results
            entries.append(format_bibtex_fallback(item))
        except Exception as e:
            entries.append(f"% Error fetching {key}: {e}")

    if not entries:
        return "No BibTeX entries generated."
    return "\n\n".join(entries)


@mcp.tool()
def get_citekey(item_keys: str) -> str:
    """Get Better BibTeX cite keys for one or more Zotero items.

    Requires Zotero to be running with Better BibTeX installed.

    Args:
        item_keys: Comma-separated Zotero item keys, e.g. 'AB12CD34,EF56GH78'
    """
    if not bbt.is_available():
        return (
            "Better BibTeX is not available — Zotero must be running with the "
            "Better BibTeX plugin installed."
        )

    keys = [k.strip() for k in item_keys.split(",") if k.strip()]
    if not keys:
        return "No item keys provided."

    try:
        citekey_map = bbt.get_citekeys(keys)
        if not citekey_map:
            return "No cite keys returned. Verify the item keys are correct."
        lines = [f"{zkey}  →  {ckey}" for zkey, ckey in citekey_map.items()]
        return "\n".join(lines)
    except Exception as e:
        return f"Error retrieving cite keys: {e}"


# ===========================================================================
# Notes & Modifications
# ===========================================================================


@mcp.tool()
def create_note(parent_key: str, content: str, tags: str = "") -> str:
    """Create a child note attached to a Zotero item.

    Args:
        parent_key: Zotero key of the parent item
        content: Note content — plain text or HTML. Plain text is automatically
                 wrapped in <p> tags.
        tags: Optional comma-separated tags to apply to the note
    """
    zot = get_zot()

    # Wrap plain text in basic HTML if no tags present
    if "<" not in content:
        html_content = "<p>" + content.replace("\n\n", "</p><p>").replace("\n", "<br>") + "</p>"
    else:
        html_content = content

    tag_list = [{"tag": t.strip()} for t in tags.split(",") if t.strip()] if tags else []

    note = {
        "itemType": "note",
        "parentItem": parent_key,
        "note": html_content,
        "tags": tag_list,
        "collections": [],
        "relations": {},
    }

    result = zot.create_items([note])

    if result.get("failed"):
        return f"Failed to create note: {result['failed']}"
    if result.get("success"):
        new_key = list(result["success"].values())[0]
        return f"Note created.\nKey:    {new_key}\nParent: {parent_key}"
    return f"Unexpected response: {result}"


@mcp.tool()
def add_item(
    item_type: str,
    title: str,
    creators_json: str = "[]",
    extra_fields_json: str = "{}",
) -> str:
    """Add a new item to the Zotero library.

    Args:
        item_type: Zotero item type, e.g. 'journalArticle', 'book', 'conferencePaper',
                   'thesis', 'report', 'webpage'
        title: Item title
        creators_json: JSON array of creator objects. Example:
            '[{"creatorType": "author", "firstName": "John", "lastName": "Smith"}]'
        extra_fields_json: JSON object of additional Zotero fields. Example:
            '{"date": "2023", "publicationTitle": "The Accounting Review",
              "DOI": "10.2308/TAR-2023-0001", "abstractNote": "This paper..."}'
    """
    zot = get_zot()

    try:
        creators = json.loads(creators_json)
    except json.JSONDecodeError as e:
        return f"Invalid creators_json — must be a JSON array: {e}"

    try:
        extra = json.loads(extra_fields_json)
    except json.JSONDecodeError as e:
        return f"Invalid extra_fields_json — must be a JSON object: {e}"

    template = zot.item_template(item_type)
    template["title"] = title
    template["creators"] = creators
    template.update(extra)

    result = zot.create_items([template])

    if result.get("failed"):
        return f"Failed to create item: {result['failed']}"
    if result.get("success"):
        new_key = list(result["success"].values())[0]
        return f"Item created.\nKey:   {new_key}\nType:  {item_type}\nTitle: {title}"
    return f"Unexpected response: {result}"


@mcp.tool()
def update_item(item_key: str, fields_json: str) -> str:
    """Update fields on an existing Zotero item.

    Args:
        item_key: The Zotero item key to update
        fields_json: JSON object of fields and new values. Example:
            '{"title": "Revised Title", "abstractNote": "Updated abstract",
              "DOI": "10.2308/new-doi"}'
    """
    zot = get_zot()

    try:
        fields = json.loads(fields_json)
    except json.JSONDecodeError as e:
        return f"Invalid fields_json — must be a JSON object: {e}"

    results = zot.item(item_key)
    item = results[0] if isinstance(results, list) else results
    item["data"].update(fields)

    success = zot.update_item(item)

    if success:
        return f"Item {item_key} updated.\nFields changed: {list(fields.keys())}"
    return f"Update returned no confirmation for {item_key} — check the item manually."


@mcp.tool()
def add_tags(item_key: str, tags: str) -> str:
    """Add one or more tags to a Zotero item.

    Args:
        item_key: The Zotero item key
        tags: Comma-separated tags to add, e.g. 'auditing, to-read, earnings management'
    """
    zot = get_zot()

    new_tags = [t.strip() for t in tags.split(",") if t.strip()]
    if not new_tags:
        return "No tags provided."

    results = zot.item(item_key)
    item = results[0] if isinstance(results, list) else results
    existing = {t["tag"] for t in item["data"].get("tags", [])}

    to_add = [t for t in new_tags if t not in existing]
    already_present = [t for t in new_tags if t in existing]

    if to_add:
        for tag in to_add:
            item["data"]["tags"].append({"tag": tag})
        zot.update_item(item)

    lines = [f"Tags for {item_key}:"]
    if to_add:
        lines.append(f"  Added:           {', '.join(to_add)}")
    if already_present:
        lines.append(f"  Already present: {', '.join(already_present)}")
    return "\n".join(lines)


# ===========================================================================
# Entry point
# ===========================================================================

def main() -> None:
    logger.info("Starting Zotero MCP Server")
    logger.info("BBT status at startup: %s", _bbt_status())
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
