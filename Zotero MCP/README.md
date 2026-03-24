# Dr. Doxey's AI Hub

## Zotero MCP Server

An MCP (Model Context Protocol) server that connects Claude to your Zotero reference library. Use it in Claude Chat or Claude Cowork to search your library, retrieve citations, export BibTeX, manage collections, and create notes — all without leaving your conversation.

### Connection Strategy

| Condition | Source |
|-----------|--------|
| Zotero is running locally (with Better BibTeX) | Better BibTeX JSON-RPC at `localhost:23119` for cite keys and BibTeX; Zotero Web API for library data |
| Zotero is closed | Zotero Web API only |

BBT availability is cached for 30 seconds, so there's no per-call penalty when Zotero is closed.

---

### Tools

| Tool | Description |
|------|-------------|
| `search_library` | Search by keyword, item type, tag, or collection |
| `get_item` | Full details for a Zotero item by key |
| `get_item_by_citekey` | Look up an item by its BBT cite key (requires Zotero running) |
| `list_collections` | List top-level or sub-collections |
| `get_collection_items` | Items in a specific collection |
| `get_tags` | List/filter all tags in the library |
| `get_item_attachments` | PDFs, links, and snapshots attached to an item |
| `get_library_info` | Summary stats: item count, collections, tags, BBT status |
| `get_bibtex` | Export BibTeX (BBT preferred; web API fallback) |
| `get_citekey` | Get BBT cite key(s) for Zotero item key(s) |
| `create_note` | Create a child note on an item |
| `add_item` | Add a new item to the library |
| `update_item` | Update fields on an existing item |
| `add_tags` | Add tags to an item |

---

### Setup

#### 1. Prerequisites

- Python 3.11+
- A [Zotero account](https://www.zotero.org/) with API access
- [Better BibTeX](https://retorque.re/zotero-better-bibtex/) plugin installed in Zotero (optional, but recommended)

#### 2. Install dependencies

```bash
pip install -r requirements.txt
```

Or with `uv`:

```bash
uv pip install -r requirements.txt
```

#### 3. Configure credentials

```bash
cp .env.example .env
```

Edit `.env` and fill in:

- **`ZOTERO_USER_ID`** — Your numeric Zotero user ID. Find it at [zotero.org/settings/keys](https://www.zotero.org/settings/keys) (shown as "Your userID for use in API calls").
- **`ZOTERO_API_KEY`** — Generate a key at [zotero.org/settings/keys/new](https://www.zotero.org/settings/keys/new). Grant read/write access to your personal library.
- **`ZOTERO_LIBRARY_TYPE`** — `user` for a personal library, `group` for a group library.

#### 4. Test the server

```bash
python server.py
```

The server starts and waits for MCP protocol input on stdin. Use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) to test tools interactively before connecting to Claude.

---

### Claude Desktop Configuration

Add the following to your Claude Desktop config file.

**Windows:** `%AppData%\Claude\claude_desktop_config.json`
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "zotero": {
      "command": "python",
      "args": [
        "C:\\path\\to\\Zotero MCP\\server.py"
      ]
    }
  }
}
```

> **Note:** Credentials are loaded from the `.env` file in the repository root. If you prefer to pass them explicitly instead, add an `"env"` block:
> ```json
> "env": {
>   "ZOTERO_USER_ID": "123456",
>   "ZOTERO_API_KEY": "your_key_here"
> }
> ```

Restart Claude Desktop after editing the config. The `zotero` server will appear in the tools list.

---

### Repository Structure

```
Zotero MCP/
├── server.py           # MCP server — all tool definitions
├── bbt_client.py       # Better BibTeX JSON-RPC client + availability cache
├── zotero_client.py    # pyzotero wrapper + formatting helpers
├── config.py           # Configuration (dotenv)
├── requirements.txt    # Python dependencies
├── .env.example        # Config template (copy to .env)
├── Paper Downloader/   # Separate tool for batch PDF retrieval
└── DoxCalc.html        # Standalone financial calculator
```

---

### Other Tools in This Repository

- **[Paper Downloader](Paper%20Downloader/README.md)** — Batch PDF retrieval for academic papers via DOI/URL list
- **DoxCalc** — Browser-based financial/math calculator with IRR support
