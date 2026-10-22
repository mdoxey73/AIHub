"""ART preprint screener: decline OSF submissions to the ART preprint server.

For each pending submission:
  - submitted by an editor -> left pending; an issue is opened for the editor
  - otherwise a Claude Managed Agents session reads the manuscript and writes
    a decision file. This program maps the label to a fixed rejection message,
    or flags the submission for the editor when the label is `flag`, the agent
    is not highly confident, its findings don't support the label, or anything
    about the run went wrong.

Nothing here can accept a preprint: osf_client exposes reject() and no other
moderation action. Trial mode (the default) sends nothing to OSF and posts one
summary issue instead.
"""
import datetime
import json
import logging
import mimetypes
import re
import sys
import time
from dataclasses import dataclass

import anthropic

import github_client
import osf_client
from config import config
from templates import REJECTION_MESSAGES

logger = logging.getLogger("art-screener")

# Findings each rejection label requires; anything else is flagged.
REQUIRED_FINDINGS = {
    "out_of_scope": {"scope": "not_accounting"},
    "insufficient_contribution": {"scope": "accounting", "quality": "slop"},
    "redirect": {"scope": "accounting", "quality": "credible", "authors": "verified_researchers"},
}


@dataclass
class Result:
    preprint_id: str
    title: str
    outcome: str  # "reject:<label>", "flag", "editor" or "error"
    reason: str
    decision: dict | None = None
    session_url: str | None = None
    cost: str = ""
    action: str = ""


# ---------------------------------------------------------------------------
# Decision checks
# ---------------------------------------------------------------------------

def resolve(decision: dict | None, preprint_id: str) -> tuple[str | None, str]:
    """Return (rejection label, reason), or (None, reason) to flag for the editor."""
    if not isinstance(decision, dict):
        return None, "The agent produced no readable decision file."
    if decision.get("preprint_id") != preprint_id:
        return None, f"The decision file names preprint {decision.get('preprint_id')!r}."
    label = decision.get("label")
    if label == "flag":
        return None, decision.get("summary") or "The agent flagged it."
    if label not in REQUIRED_FINDINGS:
        return None, f"Unrecognized label {label!r}."
    if decision.get("confidence") != "high":
        return None, f"The agent chose {label} with {decision.get('confidence')!r} confidence."
    for test, expected in REQUIRED_FINDINGS[label].items():
        found = (decision.get(test) or {}).get("finding")
        if found != expected:
            return None, f"Label {label} does not match the {test} finding {found!r}."
    return label, decision.get("summary", "")


# ---------------------------------------------------------------------------
# Agent session
# ---------------------------------------------------------------------------

def _kickoff_text(preprint: dict, people: list[dict], manuscript_path: str) -> str:
    attrs = preprint.get("attributes") or {}
    subjects = sorted({
        s.get("text") for group in attrs.get("subjects") or [] for s in (group if isinstance(group, list) else [group])
        if isinstance(s, dict) and s.get("text")
    })
    metadata = {
        "preprint_id": preprint["id"],
        "title": attrs.get("title"),
        "abstract": attrs.get("description"),
        "keywords": attrs.get("tags") or [],
        "subjects": subjects,
        "date_submitted": attrs.get("date_created"),
        "contributors": people,
        "manuscript_path": manuscript_path,
    }
    return "Screen this ART preprint submission.\n\n```json\n" + json.dumps(metadata, indent=2) + "\n```"


def _run_session(client: anthropic.Anthropic, session_id: str, text: str) -> str:
    """Send the kickoff and follow the session to its end. Returns the stop reason."""
    deadline = time.monotonic() + config.session_timeout_s
    with client.beta.sessions.events.stream(session_id=session_id) as stream:
        client.beta.sessions.events.send(
            session_id=session_id,
            events=[{"type": "user.message", "content": [{"type": "text", "text": text}]}],
        )
        for event in stream:
            if time.monotonic() > deadline:
                client.beta.sessions.events.send(session_id=session_id, events=[{"type": "user.interrupt"}])
                return "timeout"
            if event.type in ("agent.tool_use", "agent.mcp_tool_use") and getattr(event, "evaluated_permission", None) == "ask":
                # Nobody is watching the run: deny anything the server could not clear itself.
                client.beta.sessions.events.send(
                    session_id=session_id,
                    events=[{
                        "type": "user.tool_confirmation",
                        "tool_use_id": event.id,
                        "result": "deny",
                        "deny_message": "Unattended run; this call needs approval. Continue without it.",
                    }],
                )
            elif event.type == "session.error":
                logger.warning("Session %s error event: %s", session_id, event)
            elif event.type == "session.status_idle":
                if event.stop_reason.type != "requires_action":
                    return event.stop_reason.type
            elif event.type == "session.status_terminated":
                return "terminated"
    return "stream_closed"


def _read_decision(client: anthropic.Anthropic, session_id: str) -> dict | None:
    for _ in range(5):  # output files appear a few seconds after the session idles
        files = client.beta.files.list(scope_id=session_id, betas=["managed-agents-2026-04-01"])
        for f in files.data:
            if f.filename.endswith("decision.json"):
                try:
                    return json.loads(client.beta.files.download(f.id).read())
                except json.JSONDecodeError:
                    return None
        time.sleep(3)
    return None


def _session_cost(client: anthropic.Anthropic, session_id: str) -> str:
    try:
        usage = client.beta.sessions.retrieve(session_id=session_id).usage
        return f"${int(usage.list_cost.amount) / 100:.2f}"
    except Exception:  # cost is informational only
        return ""


def screen_with_agent(client: anthropic.Anthropic, preprint: dict, people: list[dict]):
    """Returns (decision, session_url, stop_reason, cost)."""
    name, content = osf_client.primary_file(preprint)
    safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", name)
    mime = mimetypes.guess_type(safe_name)[0] or "application/octet-stream"
    uploaded = client.beta.files.upload(file=(safe_name, content, mime))
    try:
        session = client.beta.sessions.create(
            agent=config.agent_id,
            environment_id=config.environment_id,
            title=f"ART screen {preprint['id']}",
            metadata={"preprint_id": preprint["id"]},
            resources=[{"type": "file", "file_id": uploaded.id, "mount_path": f"/manuscript/{safe_name}"}],
            budget={"type": "limit", "max_list_cost": {"amount": config.session_budget_cents, "currency": "USD"}},
        )
        url = config.session_url(session.id)
        logger.info("Screening %s in session %s", preprint["id"], url)
        stop = _run_session(client, session.id, _kickoff_text(preprint, people, f"/mnt/session/uploads/manuscript/{safe_name}"))
        decision = _read_decision(client, session.id) if stop == "end_turn" else None
        return decision, url, stop, _session_cost(client, session.id)
    finally:
        try:
            client.beta.files.delete(uploaded.id)
        except Exception as e:
            logger.warning("Could not delete uploaded manuscript %s: %s", uploaded.id, e)


# ---------------------------------------------------------------------------
# One submission
# ---------------------------------------------------------------------------

def screen(client: anthropic.Anthropic, preprint: dict) -> Result:
    pid = preprint["id"]
    title = (preprint.get("attributes") or {}).get("title") or "(untitled)"

    submitter = osf_client.submitter_id(preprint)
    if submitter in config.editor_ids:
        return Result(pid, title, "editor", f"Submitted by editor {submitter}.")
    if submitter is None:
        return Result(pid, title, "flag", "Could not determine who submitted it.")

    people = osf_client.contributors(preprint)
    editor_coauthors = [p["full_name"] or p["osf_user_id"] for p in people if p["osf_user_id"] in config.editor_ids]
    if editor_coauthors:
        return Result(pid, title, "flag", f"Editor listed as a contributor but not the submitter: {', '.join(editor_coauthors)}.")

    decision, url, stop, cost = screen_with_agent(client, preprint, people)
    if stop != "end_turn":
        label, reason = None, f"The agent session ended with {stop!r}."
    else:
        label, reason = resolve(decision, pid)
    if label is None:
        return Result(pid, title, "flag", reason, decision, url, cost)

    result = Result(pid, title, f"reject:{label}", reason, decision, url, cost)
    if not config.live:
        result.action = "Trial mode: nothing sent"
        return result
    try:
        osf_client.reject(pid, REJECTION_MESSAGES[label])
        result.action = "Rejected on OSF"
    except osf_client.OSFError as e:
        result.outcome, result.reason = "error", f"Rejection failed: {e}"
    return result


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

def _detail(r: Result) -> str:
    lines = [f"**Preprint:** https://osf.io/preprints/{config.provider_id}/{r.preprint_id}/", f"**Reason:** {r.reason}"]
    if r.session_url:
        lines.append(f"**Agent session:** {r.session_url}" + (f" ({r.cost})" if r.cost else ""))
    if r.decision:
        lines.append("<details><summary>Agent decision</summary>\n\n```json\n"
                     + json.dumps(r.decision, indent=2) + "\n```\n</details>")
    return "\n\n".join(lines)


def report(results: list[Result], pending: int, already_handled: int, deferred: int) -> None:
    today = datetime.date.today().isoformat()
    mention = f"@{config.notify_user}" if config.notify_user else ""

    # Live mode: one issue per item left pending for the editor (also records it as handled).
    if config.live:
        for r in results:
            if r.outcome in ("flag", "editor", "error"):
                kind = {"flag": "Needs review", "editor": "Editor submission", "error": "Error"}[r.outcome]
                github_client.create_issue(
                    f"{kind}: {r.title[:80]} [osf:{r.preprint_id}]",
                    f"{mention} This submission is still pending on OSF. The screener will not look at it "
                    f"again; remove the `{config.issue_label}` label to have it re-screened.\n\n{_detail(r)}",
                    [r.outcome],
                )

    rejected = [r for r in results if r.outcome.startswith("reject:")]
    if not config.live or rejected:
        rows = "\n".join(
            f"| [{r.preprint_id}](https://osf.io/preprints/{config.provider_id}/{r.preprint_id}/) | {r.title[:70]} "
            f"| {r.outcome} | {r.action or '-'} | {r.cost or '-'} |"
            for r in results
        )
        body = (
            f"{mention} {'Trial run: nothing was sent to OSF.' if not config.live else 'Live run.'}\n\n"
            f"Pending on OSF: {pending}. Already handled: {already_handled}. "
            f"Screened now: {len(results)}. Left for the next run: {deferred}.\n\n"
            f"| Preprint | Title | Outcome | Action | Cost |\n|---|---|---|---|---|\n{rows}\n\n"
            + "\n\n---\n\n".join(f"### {r.title}\n\n{_detail(r)}" for r in results)
        )
        github_client.create_issue(f"ART screener {'trial' if not config.live else 'live'} run {today}", body, ["run-report"])


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    config.validate()
    client = anthropic.Anthropic(api_key=config.anthropic_api_key)

    pending = osf_client.pending_preprints()
    handled = github_client.handled_preprint_ids()
    queue = [p for p in pending if p["id"] not in handled]
    batch = queue[: config.max_per_run]
    logger.info("Mode %s: %d pending, %d already handled, screening %d", config.mode, len(pending), len(pending) - len(queue), len(batch))

    results = []
    for preprint in batch:
        try:
            results.append(screen(client, preprint))
        except Exception as e:
            logger.exception("Failed on %s", preprint.get("id"))
            title = (preprint.get("attributes") or {}).get("title") or "(untitled)"
            results.append(Result(preprint["id"], title, "error", f"{type(e).__name__}: {e}"))
        logger.info("%s -> %s", results[-1].preprint_id, results[-1].outcome)

    if results or not config.live:
        report(results, len(pending), len(pending) - len(queue), len(queue) - len(batch))
    if any(r.outcome == "error" for r in results):
        sys.exit(1)


if __name__ == "__main__":
    main()
