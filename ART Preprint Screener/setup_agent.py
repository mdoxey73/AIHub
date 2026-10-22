"""One-time setup: create the screener's Managed Agents environment and agent.

Run once (the "ART screener setup" workflow does this), then store the printed
IDs as the repository variables ART_ENVIRONMENT_ID and ART_AGENT_ID. Later
prompt changes can be made on the agent in the Console, which versions it.
"""
import os
import sys
from pathlib import Path

import anthropic

# Scholarly sources the agent may reach. Under limited networking these also
# bound web_search/web_fetch; university faculty pages are not reachable, so
# authors verifiable only that way end up flagged rather than redirected.
ALLOWED_HOSTS = [
    "orcid.org", "pub.orcid.org",
    "openalex.org", "api.openalex.org",
    "api.crossref.org", "doi.org", "dx.doi.org",
    "ssrn.com", "www.ssrn.com", "papers.ssrn.com",
    "scholar.google.com",
    "aaahq.org", "publications.aaahq.org",
    "www.sciencedirect.com", "onlinelibrary.wiley.com", "www.tandfonline.com",
    "link.springer.com", "www.jstor.org", "osf.io",
]
WEB_DOMAINS = [
    "orcid.org", "openalex.org", "crossref.org", "doi.org", "ssrn.com",
    "scholar.google.com", "aaahq.org", "sciencedirect.com", "wiley.com",
    "tandfonline.com", "springer.com", "jstor.org", "osf.io",
]


def main() -> None:
    if os.getenv("ART_AGENT_ID") or os.getenv("ART_ENVIRONMENT_ID"):
        sys.exit("ART_AGENT_ID / ART_ENVIRONMENT_ID are already set; refusing to create duplicates. "
                 "Edit the existing agent in the Console instead.")

    client = anthropic.Anthropic()
    system = (Path(__file__).parent / "agent_prompt.md").read_text(encoding="utf-8")

    environment = client.beta.environments.create(
        name="art-preprint-screener",
        config={
            "type": "cloud",
            "networking": {"type": "limited", "allowed_hosts": ALLOWED_HOSTS},
        },
    )
    agent = client.beta.agents.create(
        name="ART Preprint Screener",
        description="Chooses the decline message for OSF submissions to the ART preprint server, "
                    "or flags them for the editor. Cannot act on OSF.",
        model={"id": "claude-opus-5-5", "effort": "high"},
        system=system,
        tools=[
            {
                "type": "agent_toolset_20260401",
                "default_config": {"enabled": True, "permission_policy": {"type": "auto"}},
                "configs": [
                    {"name": "web_search", "enabled": True, "allowed_domains": WEB_DOMAINS},
                    {"name": "web_fetch", "enabled": True, "allowed_domains": WEB_DOMAINS},
                ],
            }
        ],
    )

    lines = [
        "ART screener resources created. Add these as repository variables:",
        f"ART_ENVIRONMENT_ID = {environment.id}",
        f"ART_AGENT_ID = {agent.id}",
    ]
    print("\n".join(lines))
    summary = os.getenv("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as f:
            f.write("\n\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
