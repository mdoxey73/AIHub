"""Configuration for the ART preprint screener.

Loads settings from environment variables (GitHub Actions secrets/variables
in production).
"""
import os
from dataclasses import dataclass, field


def _list(name: str, default: str) -> list[str]:
    return [s.strip() for s in os.getenv(name, default).split(",") if s.strip()]


@dataclass
class Config:
    # OSF
    osf_token: str = field(default_factory=lambda: os.getenv("OSF_TOKEN", ""))
    osf_api_base: str = field(default_factory=lambda: os.getenv("OSF_API_BASE", "https://api.osf.io/v2"))
    provider_id: str = field(default_factory=lambda: os.getenv("OSF_PROVIDER_ID", "acctrt"))
    # Editors whose submissions are never screened (OSF user GUIDs):
    # 7qkyj Quinn, 85x9d Rick Hatfield, g8duq Kris Hoang, w5r83 Dr. Doxey
    editor_ids: list[str] = field(default_factory=lambda: _list("EDITOR_OSF_IDS", "7qkyj,85x9d,g8duq,w5r83"))

    # Claude Managed Agents
    anthropic_api_key: str = field(default_factory=lambda: os.getenv("ANTHROPIC_API_KEY", ""))
    agent_id: str = field(default_factory=lambda: os.getenv("ART_AGENT_ID", ""))
    environment_id: str = field(default_factory=lambda: os.getenv("ART_ENVIRONMENT_ID", ""))
    workspace_id: str = field(default_factory=lambda: os.getenv("ART_WORKSPACE_ID", "") or "default")
    session_budget_cents: str = field(default_factory=lambda: os.getenv("SESSION_BUDGET_CENTS", "300"))
    session_timeout_s: int = field(default_factory=lambda: int(os.getenv("SESSION_TIMEOUT_S", "1500")))

    # Run behavior
    mode: str = field(default_factory=lambda: os.getenv("SCREENER_MODE", "trial").lower())
    max_per_run: int = field(default_factory=lambda: int(os.getenv("MAX_PER_RUN", "10")))

    # GitHub (issues are the notification channel and the record of handled items)
    github_token: str = field(default_factory=lambda: os.getenv("GITHUB_TOKEN", ""))
    github_repo: str = field(default_factory=lambda: os.getenv("GITHUB_REPOSITORY", ""))
    notify_user: str = field(default_factory=lambda: os.getenv("NOTIFY_GITHUB_USER", "mdoxey73"))
    issue_label: str = field(default_factory=lambda: os.getenv("ISSUE_LABEL", "art-screener"))

    @property
    def live(self) -> bool:
        return self.mode == "live"

    def session_url(self, session_id: str) -> str:
        return f"https://platform.claude.com/workspaces/{self.workspace_id}/sessions/{session_id}"

    def validate(self) -> None:
        required = {
            "OSF_TOKEN": self.osf_token,
            "ANTHROPIC_API_KEY": self.anthropic_api_key,
            "ART_AGENT_ID": self.agent_id,
            "ART_ENVIRONMENT_ID": self.environment_id,
            "GITHUB_TOKEN": self.github_token,
            "GITHUB_REPOSITORY": self.github_repo,
        }
        missing = [k for k, v in required.items() if not v]
        if missing:
            raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")
        if self.mode not in ("trial", "live"):
            raise RuntimeError(f"SCREENER_MODE must be 'trial' or 'live', not {self.mode!r}")


config = Config()
