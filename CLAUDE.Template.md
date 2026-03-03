# CLAUDE.md — Project Instructions for Claude Code

## Project Overview
<!-- What is this project? Who is it for? What problem does it solve? -->
- **Name:** [Project Name]
- **Purpose:** [Brief description of what this project does]
- **Audience:** [Who uses it — internal tool, public-facing, personal, etc.]

## Tech Stack
<!-- List the primary languages, frameworks, libraries, and tools in use -->
- **Language(s):** [e.g., TypeScript, Python, HTML/CSS/JS]
- **Framework(s):** [e.g., React, FastAPI, none]
- **Package manager:** [e.g., npm, pip, bun]
- **Other tools:** [e.g., ESLint, Prettier, Docker]

## Project Structure
<!-- Describe key directories so Claude understands where things live -->
```
[project-root]/
├── [src/]          # [Main source code]
├── [tests/]        # [Test files]
├── [docs/]         # [Documentation]
└── [...]           # [Other notable directories]
```

## Commands
<!-- Exact commands Claude should use to build, run, test, and lint -->
- **Install deps:** `[e.g., npm install]`
- **Run / dev server:** `[e.g., npm run dev]`
- **Build:** `[e.g., npm run build]`
- **Test:** `[e.g., npm test]`
- **Lint / format:** `[e.g., npm run lint]`

## Workflow Preferences
<!-- How should Claude behave during a session? -->
- **Commits:** Never commit automatically — always wait for explicit instruction.
- **New files:** Ask before creating files that weren't explicitly requested.
- **Tests after changes:** [Run tests automatically / Ask first / Don't run unless asked]
- **Build after changes:** [Run build automatically / Ask first / Don't run unless asked]
- **Explanations:** [Always explain changes / Explain only when asked / Keep it brief]
- **Clarifying questions:** [Ask when uncertain / Make reasonable assumptions and note them]

## Code Style
<!-- Project-specific conventions Claude should follow -->
- **Formatting:** [e.g., 2-space indent, single quotes, no semicolons]
- **Naming conventions:** [e.g., camelCase for variables, PascalCase for components]
- **Preferred patterns:** [e.g., functional components over class components, async/await over .then()]
- **Avoid:** [e.g., no lodash, no jQuery, no default exports]
- **Comments:** [e.g., only where logic isn't self-evident, no JSDoc unless requested]

## Constraints & Guardrails
<!-- Hard rules Claude must follow in this project -->
- **Do not modify:** [e.g., `src/generated/`, `*.lock` files, `config/prod.json`]
- **Do not add dependencies without asking**
- **Security-sensitive areas:** [e.g., `src/auth/` — flag any changes for review]
- **Other hard rules:** [e.g., no TypeScript — keep everything in plain JS]

## Communication Style
<!-- How should Claude interact with you? -->
- **Verbosity:** [Concise / Balanced / Detailed — match the complexity of the task]
- **Format:** [Plain text / Markdown / Code-heavy]
- **When blocked:** [Ask me / Try an alternative approach and explain / Stop and report]
- **Proactiveness:** [Stick strictly to what was asked / Flag related issues you notice]
