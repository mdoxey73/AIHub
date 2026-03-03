# CLAUDE.md — Experimental Research / Data Analysis Project

## Project Overview
- **Name:** [Study/Project Name, e.g., "Audit Judgment Study 1"]
- **Purpose:** [Brief description — e.g., "2x2 vignette experiment examining effect of X and Y on auditor judgment"]
- **Design:** [e.g., 2x2 between-subjects factorial | 2x2 mixed design | etc.]
- **Data source:** Qualtrics survey export
- **Audience:** Internal research use; outputs for manuscript submission

## VS Code Extensions Required

### R Development
- `REditorSupport.r` — R language support, syntax highlighting, IntelliSense
- `REditorSupport.r-debugger` — R debugger
- `Quarto.quarto` — Quarto documents (replaces R Markdown; use for manuscripts/reports)

### Python Development
- `ms-python.python` — Python language support (essential)
- `ms-python.vscode-pylance` — Pylance type checking and IntelliSense
- `ms-toolsai.jupyter` — Jupyter notebook support (.ipynb files)
- `ms-toolsai.jupyter-renderers` — Rich output rendering in notebooks

### General / Data
- `mechatroner.rainbow-csv` — Color-coded CSV column alignment (very useful for inspecting data)
- `GrapeCity.gc-excelviewer` — Preview CSV/TSV files as a table
- `tomoki1207.pdf` — PDF preview (for viewing papers in-editor)
- `eamodio.gitlens` — Enhanced Git history and blame annotations
- `streetsidesoftware.code-spell-checker` — Catches typos in comments and manuscript text

## Tech Stack

### Primary: R (Statistics & Analysis)
Use R for all statistical modeling, hypothesis testing, and manuscript-ready output.

- **Language:** R
- **Package manager:** `renv` (run `renv::init()` at project start; locks all package versions)
- **Core packages:**

| Purpose | Package(s) |
|---|---|
| ANOVA / factorial designs | `afex` (`aov_ez()` is the primary function) |
| Post-hoc tests / contrasts / simple effects | `emmeans` |
| Data import / manipulation | `tidyverse` (`dplyr`, `tidyr`, `readr`) |
| Qualtrics data import | `qualtRics` (direct API pull or file import) |
| Read existing SPSS `.sav` files | `haven` |
| Visualization | `ggplot2` (part of tidyverse) |
| Scale reliability (Cronbach's α, EFA) | `psych` |
| Effect sizes (η², partial η², Cohen's d + CIs) | `effectsize` |
| Mediation / moderation (PROCESS equivalent) | `mediation` or `processR` |
| Multilevel / mixed models | `lme4` + `lmerTest` |
| SEM / CFA | `lavaan` |
| APA-format manuscript output | `papaja` |
| Descriptive stats tables | `gtsummary` or `apaTables` |

### Secondary: Python (Automation & Data Wrangling)
Use Python for tasks like batch file processing, Qualtrics API automation, or anything that benefits from scripting before data reaches R.

- **Language:** Python 3.x
- **Package manager:** `conda` (recommended: handles R+Python environments) or `pip` + `venv`
- **Core packages:**

| Purpose | Package(s) |
|---|---|
| Data manipulation | `pandas` |
| Reading SPSS files | `pyreadstat` |
| Qualtrics API | `requests` or `qualtricsapi` |
| Visualization (exploratory) | `matplotlib`, `seaborn` |
| Statistical tests | `pingouin` (ANOVA, t-tests, correlations — psychology-friendly) |
| Numerical computing | `numpy`, `scipy` |

> **R vs. Python decision rule:** Use R for anything that produces results going into the manuscript. Use Python for data pipeline automation, preprocessing, or tasks where R is cumbersome.

## Project Structure
```
[project-root]/
├── data/
│   ├── raw/              # Unmodified Qualtrics exports — NEVER edit these files
│   └── processed/        # Cleaned, analysis-ready data (output of cleaning scripts)
├── scripts/
│   ├── 01_import.R       # Qualtrics import and initial inspection
│   ├── 02_clean.R        # Exclusions, attention checks, variable coding
│   ├── 03_descriptives.R # Manipulation checks, descriptive statistics
│   ├── 04_analysis.R     # Main hypothesis tests (ANOVA, contrasts)
│   ├── 05_figures.R      # All publication figures
│   └── 99_utils.R        # Shared helper functions
├── output/
│   ├── figures/          # Saved plots (.pdf, .png)
│   └── tables/           # Saved tables (.docx, .html)
├── manuscript/
│   └── [study_name].qmd  # Quarto manuscript file
├── renv/                 # renv lockfile and library (auto-managed)
├── renv.lock
└── .Rprofile
```

## Commands
- **Initialize R environment:** `Rscript -e "renv::restore()"` (restores all packages from lockfile)
- **Run full analysis pipeline:** `Rscript scripts/04_analysis.R`
- **Render manuscript:** `quarto render manuscript/[study_name].qmd`
- **Python env setup (if used):** `conda env create -f environment.yml` or `pip install -r requirements.txt`
- **Snapshot R packages after adding new ones:** `Rscript -e "renv::snapshot()"`

## Workflow Preferences
- **Commits:** Never commit automatically — always wait for explicit instruction.
- **Raw data:** Never modify anything in `data/raw/` — treat as read-only source of truth.
- **New files:** Ask before creating scripts not in the numbered pipeline above.
- **Analysis changes:** When changing an analysis, note the old result in a comment before overwriting — reviewer questions come up months later.
- **Explanations:** Explain statistical choices briefly inline when they aren't obvious (e.g., why a particular contrast coding was used).
- **Clarifying questions:** Ask when the analysis intent is ambiguous — do not infer hypothesis direction.

## Code Style (R)
- Use `tidyverse` style (`|>` pipe, not `%>%` unless required by a package)
- `afex::aov_ez()` is preferred over `aov()` or `ez::ezANOVA()` for factorial designs
- Always use `set.seed()` before any bootstrap or permutation procedure
- Name contrast objects descriptively: `contrast_H1a`, not `c1`
- Save final model objects for use in `papaja` inline reporting
- Comment every exclusion decision with the criterion and N removed

## Code Style (Python)
- Follow PEP 8
- Use `pandas` for all tabular data operations
- Avoid in-place DataFrame modifications — assign to new variables

## Qualtrics API Credentials
The `qualtRics` package can pull survey data directly without manual CSV exports. Credentials must be stored in `.Renviron` — **never hardcoded in scripts or committed to git.**

### Setup (one-time per machine)
1. Open your `.Renviron` file:
   ```r
   usethis::edit_r_environ()  # opens ~/.Renviron in your editor
   ```
2. Add these two lines (get values from Qualtrics → Account Settings → Qualtrics IDs):
   ```
   QUALTRICS_API_KEY=your_api_token_here
   QUALTRICS_BASE_URL=your_institution.qualtrics.com
   ```
3. Save and restart R (`Ctrl+Shift+F10` in RStudio, or restart the R terminal in VS Code).

### Usage in scripts
```r
library(qualtRics)

# Credentials are read automatically from .Renviron — no arguments needed
surveys <- all_surveys()          # list all surveys in your account
data    <- fetch_survey("SV_xxxxxxxxxxxx")   # pull by survey ID
```

### Important notes
- `.Renviron` lives in your home directory (`~/.Renviron`) and is **not** inside any project folder — it will never be accidentally committed
- The `QUALTRICS_BASE_URL` is your institution's subdomain only, e.g., `universityname.qualtrics.com` (no `https://`)
- If sharing a project with a collaborator, they set up their own `.Renviron` — credentials are never in the repo
- Add `.Renviron` to `.gitignore` as a belt-and-suspenders precaution if you ever create a project-level `.Renviron`

## Constraints & Guardrails
- **Do not modify `data/raw/`** under any circumstances
- **Do not round intermediate values** — only round in final output/display
- **IRB/data privacy:** Do not include participant IDs or identifying information in output files or commits; strip from processed data during cleaning
- **Do not add R packages without asking** — `renv` locks versions for reproducibility
- **Exclusion criteria:** Never apply exclusions silently — always report N removed and reason

## Communication Style
- Assume familiarity with factorial ANOVA, contrasts, and Likert-scale data
- When writing analysis code, include the corresponding hypothesis label as a comment (e.g., `# H1a: higher X → higher Y`)
- Flag if a requested analysis has assumptions that should be checked first
- Prefer APA-style language in any output intended for the manuscript
