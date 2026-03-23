"""Configuration for Zotero MCP Server.

Loads settings from environment variables / .env file.
"""
import os
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv()


@dataclass
class Config:
    zotero_api_key: str = field(default_factory=lambda: os.getenv("ZOTERO_API_KEY", ""))
    zotero_user_id: str = field(default_factory=lambda: os.getenv("ZOTERO_USER_ID", ""))
    zotero_library_type: str = field(default_factory=lambda: os.getenv("ZOTERO_LIBRARY_TYPE", "user"))
    bbt_base: str = field(default_factory=lambda: os.getenv("BBT_BASE_URL", "http://localhost:23119/better-bibtex"))
    bbt_timeout: float = field(default_factory=lambda: float(os.getenv("BBT_TIMEOUT", "3.0")))
    bbt_cache_ttl: int = field(default_factory=lambda: int(os.getenv("BBT_CACHE_TTL", "30")))

    @property
    def bbt_rpc(self) -> str:
        return f"{self.bbt_base}/json-rpc"

    def validate(self) -> None:
        missing = []
        if not self.zotero_api_key:
            missing.append("ZOTERO_API_KEY")
        if not self.zotero_user_id:
            missing.append("ZOTERO_USER_ID")
        if missing:
            raise RuntimeError(
                f"Missing required environment variables: {', '.join(missing)}\n"
                "Copy .env.example to .env and fill in your credentials."
            )


config = Config()
