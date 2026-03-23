"""Better BibTeX local JSON-RPC client.

Communicates with the BBT plugin running inside Zotero at localhost:23119.
Includes a time-based availability cache to avoid stalling when Zotero is closed.
"""
import logging
import time

import httpx

from config import config

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Availability cache
# ---------------------------------------------------------------------------

_bbt_available: bool | None = None
_bbt_checked_at: float = 0.0


def is_available() -> bool:
    """Return True if Better BibTeX is reachable. Result is cached for BBT_CACHE_TTL seconds."""
    global _bbt_available, _bbt_checked_at

    now = time.monotonic()
    if _bbt_available is not None and (now - _bbt_checked_at) < config.bbt_cache_ttl:
        return _bbt_available

    try:
        # A GET to the JSON-RPC endpoint returns 405 Method Not Allowed when BBT is running,
        # which is still a valid "it's up" signal.
        httpx.get(config.bbt_rpc, timeout=config.bbt_timeout)
        _bbt_available = True
    except Exception:
        _bbt_available = False

    _bbt_checked_at = now
    logger.info("BBT availability: %s", _bbt_available)
    return _bbt_available


def invalidate_cache() -> None:
    """Force a fresh availability check on the next call."""
    global _bbt_checked_at
    _bbt_checked_at = 0.0


# ---------------------------------------------------------------------------
# JSON-RPC call wrapper
# ---------------------------------------------------------------------------

def call(method: str, params: dict) -> object:
    """Call a BBT JSON-RPC method. Raises on HTTP or RPC error. Returns `result` value."""
    payload = {"jsonrpc": "2.0", "method": method, "params": params, "id": 1}
    resp = httpx.post(config.bbt_rpc, json=payload, timeout=config.bbt_timeout * 10)
    resp.raise_for_status()
    data = resp.json()
    if "error" in data:
        raise RuntimeError(f"BBT JSON-RPC error calling '{method}': {data['error']}")
    return data.get("result")


# ---------------------------------------------------------------------------
# Convenience wrappers
# ---------------------------------------------------------------------------

def get_citekeys(item_keys: list[str]) -> dict[str, str]:
    """Return {zotero_item_key: citekey} for the given item keys.

    BBT method: item.citationkey
    Params: {"item_keys": ["KEY1", "KEY2"]}
    """
    result = call("item.citationkey", {"item_keys": item_keys})
    if isinstance(result, dict):
        return result
    return {}


def export_bibtex(citekeys: list[str]) -> str:
    """Export items as BibTeX by their BBT cite keys.

    BBT method: item.export
    Translator: "bibtex" for BibTeX, "biblatex" for BibLaTeX.
    """
    result = call("item.export", {"citekeys": citekeys, "translator": "bibtex"})
    if isinstance(result, str):
        return result
    if isinstance(result, dict):
        return result.get("bibtex", result.get("data", str(result)))
    return str(result)


def search_by_citekey(citekey: str) -> list[dict]:
    """Find Zotero items matching a cite key string.

    BBT method: item.search
    Returns a list of item records in BBT's internal format.
    """
    result = call("item.search", {"terms": citekey})
    if isinstance(result, list):
        return result
    return []


def get_attachments(citekey: str) -> list[dict]:
    """Return attachment info for an item identified by its BBT cite key.

    BBT method: item.attachments
    Note: takes a single citekey string (not a list).
    """
    result = call("item.attachments", {"citekey": citekey})
    if isinstance(result, list):
        return result
    return []
