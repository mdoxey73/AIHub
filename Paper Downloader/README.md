Paste the following into PowerShell to Run:
python downloader.py --manual-login --channel chrome
# Paper Downloader

Automates browser-based paper PDF retrieval from a list of DOIs/URLs using your own authenticated session (institutional proxy, publisher login, etc.).

## What this does

- Opens a real Chromium browser window via Playwright (non-headless).
- Optionally pauses for manual login so your credentials/session are used.
- Iterates through a DOI/URL list.
- Tries multiple strategies to find/download PDFs:
  - Site-specific strategies for common publishers (ScienceDirect, Springer, Wiley, IEEE Xplore, Nature, Taylor & Francis, JAMA).
  - Click likely PDF/download links/buttons on the page.
  - Parse candidate links and request likely PDF URLs with your session cookies.
- Detects CAPTCHA/challenge pages and pauses so you can solve them, then resumes.
- Saves PDFs to a dedicated downloads folder.
- Writes a `results.csv` log with per-item status.

## Setup

1. Create and activate a Python environment.
2. Install dependencies:

```powershell
pip install -r requirements.txt
python -m playwright install chromium
```

3. Create your inputs:

```powershell
Copy-Item config.example.json config.json
```

4. Create `papers.txt` and add your DOIs/URLs, one per line (e.g. `10.1038/s41586-020-2649-2`). Optionally edit `config.json` if needed.

## Run

```powershell
python downloader.py --manual-login --channel chrome
```

Recommended command (copy/paste):

```powershell
python downloader.py --manual-login --manual-rescue --channel chrome --captcha-timeout 120
```

Common options:

- `--input papers.txt`
- `--downloads downloads`
- `--profile browser-profile`
- `--config config.json`
- `--manual-login`
- `--channel chrome` or `--channel msedge`
- `--executable-path "C:\Path\To\browser.exe"`
- `--delay 2.0`
- `--captcha-timeout 600` (seconds; set `0` to wait forever)
- `--manual-rescue` (lets you manually open PDF on challenge-heavy sites, then press Enter)

## Notes

- Use only for content you are authorized to access.
- Some publisher pages use custom viewers/workflows; those entries may show `not_found` and need site-specific selectors.
- If a CAPTCHA/security challenge appears, solve it in the browser; the script will auto-resume when cleared.
- Reusing `browser-profile` preserves login state between runs.

