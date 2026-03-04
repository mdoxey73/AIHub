# AGENTS.md

## Purpose
This repository is maintained by a user who prefers very clear, step-by-step guidance in chat for coding and running tasks.

## Response Style Requirements
- Always provide actionable steps in order (Step 1, Step 2, Step 3...) for implementation and execution tasks.
- Keep explanations plain-English and concise; avoid jargon when possible.
- Prefer concrete instructions over abstract advice.
- When proposing commands, provide copy/paste-ready PowerShell blocks.
- State exactly where to run commands (working directory/path).
- After code changes, include:
  - what changed
  - how to run it
  - how to verify it worked

## PowerShell Execution Rules
- Default shell assumptions: Windows PowerShell.
- Use commands compatible with PowerShell syntax (not bash-only syntax).
- When paths contain spaces, always quote paths.
- For multi-command flows, provide one command block per step.

## Coding Workflow Expectations
- Make minimal, targeted edits that solve the immediate issue.
- Prefer iterative fixes with quick verification.
- If a run fails, explain the error in plain terms and give the next exact command to run.
- For user-facing scripts/tools, include a simple "Recommended command (copy/paste)" in docs.

## Documentation Expectations
- Keep README instructions beginner-friendly.
- Include a short "First Run" section for new projects.
- Include a troubleshooting section for common errors when relevant.

## Safety and Constraints
- Do not include or request sensitive credentials in files or chat.
- Assume authenticated access steps (SSO/MFA/DUO) should happen interactively in the browser unless user requests otherwise.
