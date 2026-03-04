import argparse
import csv
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urljoin

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright


PDF_KEYWORDS = (
    "pdf",
    "download",
    "full text",
    "fulltext",
    "article",
    "view pdf",
)


def load_items(path: Path) -> list[str]:
    items: list[str] = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        items.append(line)
    return items


def normalize_item(item: str) -> str:
    item = item.strip()
    if item.lower().startswith("doi:"):
        item = item[4:].strip()
    if re.match(r"^10\.\d{4,9}/\S+$", item):
        return f"https://doi.org/{item}"
    if item.startswith(("http://", "https://")):
        return item
    return f"https://doi.org/{item}"


def sanitize_filename(name: str, max_len: int = 150) -> str:
    clean = re.sub(r"[<>:\"/\\|?*\x00-\x1F]", "_", name).strip(" .")
    clean = re.sub(r"\s+", "_", clean)
    if not clean:
        clean = "paper"
    return clean[:max_len]


def base_name_from_item(item: str, index: int) -> str:
    normalized = item.replace("https://doi.org/", "").replace("http://doi.org/", "")
    return f"{index:03d}_{sanitize_filename(normalized)}"


def choose_browser_launch(channel: str | None, executable_path: str | None) -> dict:
    launch_kwargs = {
        "headless": False,
        "accept_downloads": True,
    }
    if channel:
        launch_kwargs["channel"] = channel
    if executable_path:
        launch_kwargs["executable_path"] = executable_path
    return launch_kwargs


def load_config(config_path: Path | None) -> dict:
    if not config_path:
        return {}
    data = json.loads(config_path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("Config file must contain a JSON object.")
    return data


def extract_candidate_urls(page) -> list[str]:
    links = page.evaluate(
        """() => {
            const out = [];
            const anchors = Array.from(document.querySelectorAll('a[href]'));
            for (const a of anchors) {
                const href = (a.href || '').trim();
                const text = (a.innerText || a.textContent || '').trim().toLowerCase();
                if (!href) continue;
                const hay = `${href} ${text}`.toLowerCase();
                if (hay.includes('.pdf') || hay.includes('/pdf') || hay.includes('fulltext') || hay.includes('full text') || hay.includes('download')) {
                    out.push(href);
                }
            }
            return out;
        }"""
    )
    deduped: list[str] = []
    seen: set[str] = set()
    for url in links:
        if url not in seen:
            seen.add(url)
            deduped.append(url)
    return deduped


def request_pdf(context, url: str, out_path: Path) -> bool:
    try:
        resp = context.request.get(url, timeout=30000)
    except Exception:
        return False
    if not resp.ok:
        return False
    ctype = (resp.headers.get("content-type") or "").lower()
    if "pdf" not in ctype and not url.lower().endswith(".pdf"):
        return False
    out_path.write_bytes(resp.body())
    return True


def try_click_download(page, out_path: Path) -> bool:
    selectors = [
        'a[href$=".pdf"]',
        'a[href*=".pdf?"]',
        'a[href*="/pdf"]',
        'a:has-text("PDF")',
        'a:has-text("Download")',
        'button:has-text("PDF")',
        'button:has-text("Download")',
    ]
    for selector in selectors:
        locator = page.locator(selector)
        count = min(locator.count(), 5)
        for i in range(count):
            try:
                elem = locator.nth(i)
                if not elem.is_visible(timeout=1500):
                    continue
                with page.expect_download(timeout=8000) as dl_info:
                    elem.click(timeout=3000)
                download = dl_info.value
                download.save_as(str(out_path))
                return True
            except Exception:
                continue
    return False


def score_candidate(url: str) -> int:
    u = url.lower()
    score = 0
    if ".pdf" in u:
        score += 5
    if "/pdf" in u:
        score += 3
    for kw in PDF_KEYWORDS:
        if kw in u:
            score += 1
    return score


def process_item(page, context, item: str, index: int, download_dir: Path, delay_seconds: float) -> tuple[str, str]:
    source = normalize_item(item)
    base_name = base_name_from_item(item, index)
    pdf_path = download_dir / f"{base_name}.pdf"

    try:
        page.goto(source, wait_until="domcontentloaded", timeout=45000)
    except PlaywrightTimeoutError:
        return ("error", f"Navigation timeout: {source}")
    except Exception as exc:
        return ("error", f"Navigation failed: {source} ({exc})")

    if delay_seconds > 0:
        time.sleep(delay_seconds)

    if page.url.lower().endswith(".pdf"):
        try:
            pdf_bytes = page.content().encode("utf-8")
            if pdf_bytes:
                # When browser renders inline PDF, use network fetch for the same URL.
                if request_pdf(context, page.url, pdf_path):
                    return ("downloaded", str(pdf_path))
        except Exception:
            pass

    if try_click_download(page, pdf_path):
        return ("downloaded", str(pdf_path))

    candidates = extract_candidate_urls(page)
    candidates.sort(key=score_candidate, reverse=True)
    for href in candidates:
        target_url = urljoin(page.url, href)
        if request_pdf(context, target_url, pdf_path):
            return ("downloaded", str(pdf_path))

    return ("not_found", "No downloadable PDF detected.")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Download paper PDFs from DOI/URL list using an authenticated browser session."
    )
    parser.add_argument("--input", default="papers.txt", help="Path to DOI/URL list (one per line).")
    parser.add_argument("--downloads", default="downloads", help="Directory for downloaded PDFs.")
    parser.add_argument("--profile", default="browser-profile", help="Persistent browser profile directory.")
    parser.add_argument("--config", default="config.json", help="Optional JSON config file.")
    parser.add_argument("--manual-login", action="store_true", help="Pause to let you log in manually before processing.")
    parser.add_argument("--channel", default=None, help="Browser channel: chrome, msedge, chromium.")
    parser.add_argument("--executable-path", default=None, help="Path to browser executable.")
    parser.add_argument("--delay", type=float, default=2.0, help="Seconds to wait after navigation.")
    args = parser.parse_args()

    input_path = Path(args.input).resolve()
    download_dir = Path(args.downloads).resolve()
    profile_dir = Path(args.profile).resolve()
    config_path = Path(args.config).resolve()

    if not input_path.exists():
        print(f"Input file not found: {input_path}")
        return 1

    config = load_config(config_path) if config_path.exists() else {}
    proxy = config.get("proxy")
    login_url = config.get("login_url")
    start_url = config.get("start_url")

    download_dir.mkdir(parents=True, exist_ok=True)
    profile_dir.mkdir(parents=True, exist_ok=True)
    log_path = download_dir / "results.csv"

    items = load_items(input_path)
    if not items:
        print("No items found in input file.")
        return 1

    launch_kwargs = choose_browser_launch(args.channel, args.executable_path)
    context_kwargs = {
        "user_data_dir": str(profile_dir),
        "downloads_path": str(download_dir),
    }
    if proxy:
        context_kwargs["proxy"] = proxy

    with sync_playwright() as p:
        browser_context = p.chromium.launch_persistent_context(**context_kwargs, **launch_kwargs)
        page = browser_context.new_page()
        if start_url:
            page.goto(start_url, wait_until="domcontentloaded")

        if args.manual_login:
            if login_url:
                page.goto(login_url, wait_until="domcontentloaded")
            print(
                "\nManual login step:\n"
                "1) Complete institutional/proxy authentication in the opened browser.\n"
                "2) Confirm you can open one article page successfully.\n"
                "3) Return here and press Enter to continue.\n"
            )
            input()

        rows: list[list[str]] = [["index", "item", "normalized_url", "status", "details"]]
        for i, item in enumerate(items, start=1):
            normalized = normalize_item(item)
            print(f"[{i}/{len(items)}] {item}")
            status, details = process_item(page, browser_context, item, i, download_dir, args.delay)
            print(f"  -> {status}: {details}")
            rows.append([str(i), item, normalized, status, details])

        with log_path.open("w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerows(rows)

        browser_context.close()

    print(f"\nDone. Results log: {log_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
