# ART Preprint Screener

Declines submissions to the Accounting Research & Thought preprint server on OSF (`acctrt`), which is not ART's submission channel. A Claude Managed Agent (in the Claude Console) reads each submission and chooses which decline message applies, or hands it to the editor.

| Submission | Outcome |
|---|---|
| Submitted by an editor (Quinn, Rick Hatfield, Kris Hoang, Dr. Doxey) | Left pending; GitHub issue opened |
| Clearly not accounting research | Rejected with the out-of-scope message |
| Clearly accounting, clearly AI slop | Rejected with the insufficient-contribution message |
| Real accounting research by verified accounting researchers | Rejected with the redirect message (points to the ART Culverhouse page) |
| Anything else, or the agent is not highly confident | Left pending; GitHub issue opened |

Messages are in `templates.py`. Claude never writes text that authors see.

## Safeguards

- **Nothing can accept a preprint.** `osf_client.py` has `reject()` and no other moderation action.
- **The agent cannot touch OSF.** The OSF token lives only in GitHub secrets. The agent receives a copy of the manuscript and its metadata; its only output is `decision.json`.
- **Code double-checks the agent.** A rejection goes out only if the label is consistent with the agent's own scope, quality and author findings and confidence is `high`. Everything else is flagged (`screener.py`, `resolve()`).
- **Spend cap.** Each agent session has a hard budget (`SESSION_BUDGET_CENTS`, default 300 = $3.00). At most `MAX_PER_RUN` submissions are screened per run.
- **Limited network.** The agent can reach only scholarly sources (ORCID, OpenAlex, Crossref, DOI, SSRN, Google Scholar, AAA and major publishers; list in `setup_agent.py`). University faculty pages are not reachable, so authors verifiable only that way get flagged, not redirected. Switching the environment to `unrestricted` networking in the Console fixes that, at the cost of letting the agent's sandbox reach any site; no credentials are in the sandbox.

## Setup (one time)

1. **Merge this to `main`.** GitHub only runs scheduled workflows, and only lists manual ones, from the default branch.
2. **Anthropic API key.** Console → API keys → create one in the organization that holds the credits. In the GitHub repo: Settings → Secrets and variables → Actions → Secrets → `ANTHROPIC_API_KEY`.
3. **OSF token.** osf.io → Settings → Personal access tokens → create one with the `osf.full_write` scope (needed to reject). Save it as the secret `OSF_TOKEN`.
4. **Create the agent.** Actions → *ART screener setup* → Run workflow. The run summary prints two IDs; save them under Settings → Secrets and variables → Actions → Variables as `ART_AGENT_ID` and `ART_ENVIRONMENT_ID`. If the API key belongs to a workspace other than Default, also add `ART_WORKSPACE_ID` so session links open correctly. The agent then appears in the Console, where its instructions can be edited (each edit creates a new version).

## Running

1. **Trial run.** Actions → *ART preprint screener* → Run workflow, mode `trial`. Nothing is sent to OSF. A "trial run" issue lists each pending submission, the outcome it would get, the agent's reasoning, a link to the agent session in the Console and its cost.
2. **First live run.** Once the trial calls look right, run it manually with mode `live` and max `1`. Confirm on OSF that the rejection and message went through.
3. **Turn on the daily schedule.** Add the repository variable `OSF_LIVE` = `true`. Scheduled runs happen daily at 8:17 a.m. Central and do nothing while `OSF_LIVE` is unset.

In live mode, each flagged or editor submission gets its own issue mentioning @mdoxey73 (GitHub emails it according to your notification settings), and a run-report issue lists any rejections. A submission with an issue is not screened again; remove its `art-screener` label to have it re-screened.

## Not yet verified

The OSF API calls (`osf_client.py`) were written from the OSF API v2 conventions without live access to api.osf.io. The trial run checks the read calls (pending list, submitter, contributors, manuscript download). The reject call is first exercised by the one-submission live run.
