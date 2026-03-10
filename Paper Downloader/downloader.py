import argparse
import csv
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urljoin, urlparse

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


CAPTCHA_PATTERNS = (
    "captcha",
    "verify you are human",
    "verification required",
    "security check",
    "are you a robot",
    "cloudflare",
    "cf-challenge",
    "perimeterx",
    "px-captcha",
    "recaptcha",
    "hcaptcha",
    "/sorry/",
)


SITE_PATTERNS = {
    "sciencedirect.com": [
        "/science/article/pii/",
        "/pdfft",
        "/pdf",
    ],
    "springer.com": [
        "/content/pdf/",
        ".pdf",
    ],
    "link.springer.com": [
        "/content/pdf/",
        ".pdf",
    ],
    "wiley.com": [
        "/doi/pdf",
        "/doi/epdf",
    ],
    "onlinelibrary.wiley.com": [
        "/doi/pdf",
        "/doi/epdf",
    ],
    # American Accounting Association (Atypon platform — same patterns as Wiley)
    "aaahq.org": [
        "/doi/pdf",
        "/doi/epdf",
    ],
    "ieeexplore.ieee.org": [
        "/stamp/stamp.jsp?tp=&arnumber=",
        "/document/",
    ],
    "nature.com": [
        ".pdf",
    ],
    "tandfonline.com": [
        "/doi/pdf/",
        "/doi/epdf/",
    ],
    "jamanetwork.com": [
        ".pdf",
    ],
    "science.org": [
        "/doi/pdf/",
        ".pdf",
    ],
    "aaas.org": [
        "/doi/pdf/",
        ".pdf",
    ],
    # PubMed Central
    "ncbi.nlm.nih.gov": [
        "/pmc/articles/",
        "/pdf/",
    ],
    # PLOS journals
    "journals.plos.org": [
        "?type=printable",
        "/pdf/",
    ],
    # ACS Publications
    "pubs.acs.org": [
        "/doi/pdf/",
        "/doi/epdf/",
    ],
    # Oxford Academic
    "academic.oup.com": [
        "/pdf",
    ],
    # Cambridge Core
    "cambridge.org": [
        "/pdf",
        "/core/services/aop-cambridge-core/content/view/",
    ],
    # MDPI open access
    "mdpi.com": [
        "/pdf",
    ],
    # BioMed Central
    "biomedcentral.com": [
        ".pdf",
    ],
    # JSTOR
    "jstor.org": [
        "/stable/pdf/",
    ],
    # Frontiers in ...
    "frontiersin.org": [
        "/pdf",
    ],
    # PNAS
    "pnas.org": [
        "/doi/pdf/",
        ".full.pdf",
    ],
    # eLife
    "elifesciences.org": [
        ".pdf",
        "/download",
    ],
    # Cell Press
    "cell.com": [
        "/pdf/",
        ".pdf",
    ],
}


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
    normalized = item.strip()
    normalized = normalized.replace("https://", "").replace("http://", "")
    normalized = normalized.replace("doi.org/", "")
    if normalized.lower().endswith(".pdf"):
        normalized = normalized[:-4]
    return f"{index:03d}_{sanitize_filename(normalized)}"


def choose_browser_launch(channel: str | None, executable_path: str | None) -> dict:
    launch_kwargs = {
        "headless": False,
        "accept_downloads": True,
        # Reduce basic automation fingerprints on some publisher anti-bot pages.
        "args": ["--disable-blink-features=AutomationControlled"],
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


def is_captcha_or_challenge(page) -> bool:
    url = (page.url or "").lower()
    try:
        title = (page.title() or "").lower()
    except Exception:
        title = ""
    # Fast path: check URL and title without any timeout.
    fast_hay = f"{url}\n{title}"
    if any(pattern in fast_hay for pattern in CAPTCHA_PATTERNS):
        return True
    # Slower fallback: inspect body text only if fast check was inconclusive.
    try:
        body = (page.locator("body").inner_text(timeout=2500) or "").lower()
    except Exception:
        body = ""
    return any(pattern in body for pattern in CAPTCHA_PATTERNS)


def wait_for_captcha_resolution(page, timeout_seconds: int) -> bool:
    print(
        "\nCAPTCHA/challenge detected.\n"
        "Solve it in the browser window. Script will resume automatically when cleared.\n"
    )
    deadline = time.time() + timeout_seconds if timeout_seconds > 0 else None
    while True:
        if not is_captcha_or_challenge(page):
            print("Challenge cleared. Resuming.")
            return True
        if deadline and time.time() > deadline:
            print("Challenge wait timeout reached.")
            return False
        time.sleep(2)


def manual_rescue_download(page, context, out_path: Path) -> bool:
    print(
        "\nManual rescue mode:\n"
        "1) In the browser, finish verification/login.\n"
        "2) Open the article PDF (or click the PDF download button).\n"
        "3) Return to this terminal and press Enter.\n"
    )
    input()
    current = (page.url or "").strip()
    if current.lower().endswith(".pdf"):
        if request_pdf(context, current, out_path):
            return True
    if try_site_specific_download(page, context, out_path):
        return True
    if try_click_download(page, out_path):
        return True
    return False


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


def goto_with_retries(page, url: str, timeout_ms: int = 45000, retries: int = 3):
    last_exc = None
    for attempt in range(1, retries + 1):
        try:
            return page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
        except Exception as exc:
            last_exc = exc
            message = str(exc).lower()
            if "interrupted by another navigation" in message and attempt < retries:
                try:
                    page.wait_for_load_state("domcontentloaded", timeout=5000)
                except Exception:
                    pass
                time.sleep(1.0)
                continue
            raise
    if last_exc:
        raise last_exc


def try_click_download(
    page, out_path: Path, element_timeout: int = 1500, download_timeout: int = 8000
) -> bool:
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
                if not elem.is_visible(timeout=element_timeout):
                    continue
                with page.expect_download(timeout=download_timeout) as dl_info:
                    elem.click(timeout=3000)
                download = dl_info.value
                download.save_as(str(out_path))
                return True
            except Exception:
                continue
    return False


def parse_hostname(url: str) -> str:
    try:
        return (urlparse(url).hostname or "").lower()
    except Exception:
        return ""


def extract_doi(text: str) -> str | None:
    if not text:
        return None
    match = re.search(r"(10\.\d{4,9}/[^\s,;)\]>]+)", text, flags=re.IGNORECASE)
    if not match:
        return None
    doi = match.group(1).strip().rstrip(".,;)]>")
    return doi


def site_patterns_for_url(url: str) -> list[str]:
    host = parse_hostname(url)
    matches: list[str] = []
    for site, patterns in SITE_PATTERNS.items():
        if host == site or host.endswith(f".{site}") or site.endswith(host):
            matches.extend(patterns)
    return matches


def select_site_candidates(current_url: str, candidates: list[str]) -> list[str]:
    patterns = site_patterns_for_url(current_url)
    if not patterns:
        return []
    out: list[str] = []
    seen: set[str] = set()
    for href in candidates:
        low = href.lower()
        if any(pattern in low for pattern in patterns):
            if href not in seen:
                seen.add(href)
                out.append(href)
    return out


def add_known_site_endpoints(page) -> list[str]:
    url = page.url
    host = parse_hostname(url)
    out: list[str] = []
    if "wiley.com" in host:
        out.extend(
            [
                url.replace("/doi/full/", "/doi/pdf/"),
                url.replace("/doi/abs/", "/doi/pdf/"),
                url.replace("/doi/full/", "/doi/epdf/"),
                url.replace("/doi/abs/", "/doi/epdf/"),
            ]
        )
    if "aaahq.org" in host:
        out.extend(
            [
                url.replace("/doi/full/", "/doi/pdf/"),
                url.replace("/doi/abs/", "/doi/pdf/"),
                url.replace("/doi/full/", "/doi/epdf/"),
                url.replace("/doi/abs/", "/doi/epdf/"),
            ]
        )
    if "tandfonline.com" in host:
        out.extend(
            [
                url.replace("/doi/full/", "/doi/pdf/"),
                url.replace("/doi/abs/", "/doi/pdf/"),
                url.replace("/doi/full/", "/doi/epdf/"),
                url.replace("/doi/abs/", "/doi/epdf/"),
            ]
        )
    if "ieeexplore.ieee.org" in host:
        m = re.search(r"/document/(\d+)", url)
        if m:
            doc_id = m.group(1)
            out.append(f"https://ieeexplore.ieee.org/stamp/stamp.jsp?tp=&arnumber={doc_id}")
    if "science.org" in host:
        # Common mapping: /doi/<doi> or /doi/full/<doi> -> /doi/pdf/<doi>
        if "/doi/full/" in url:
            out.append(url.replace("/doi/full/", "/doi/pdf/"))
        if "/doi/abs/" in url:
            out.append(url.replace("/doi/abs/", "/doi/pdf/"))
        m = re.search(r"/doi/(?:full/|abs/)?(10\.\d{4,9}/\S+)$", url)
        if m:
            out.append(f"https://www.science.org/doi/pdf/{m.group(1)}")
    if "pubs.acs.org" in host:
        out.extend(
            [
                url.replace("/doi/abs/", "/doi/pdf/"),
                url.replace("/doi/full/", "/doi/pdf/"),
                url.replace("/doi/epdf/", "/doi/pdf/"),
            ]
        )
    if "academic.oup.com" in host:
        # Oxford Academic: article pages end in numeric ID; pdf URL appends /pdf
        if not url.rstrip("/").endswith("/pdf"):
            out.append(url.rstrip("/") + "/pdf")
    if "cambridge.org" in host and "/core/product/" in url:
        out.append(url + "/pdf")
    if "ncbi.nlm.nih.gov" in host:
        # PMC: /pmc/articles/PMC123456/ -> /pmc/articles/PMC123456/pdf/
        m = re.search(r"(/pmc/articles/PMC\d+)", url)
        if m:
            out.append(f"https://www.ncbi.nlm.nih.gov{m.group(1)}/pdf/")
    if "journals.plos.org" in host:
        base = url.split("?")[0]
        out.append(f"{base}?type=printable")
    if "mdpi.com" in host:
        # MDPI: /htm -> /pdf, or just append /pdf to article path
        if url.endswith("/htm"):
            out.append(url[:-4] + "/pdf")
        elif not url.endswith("/pdf"):
            out.append(url.rstrip("/") + "/pdf")
    if "frontiersin.org" in host:
        out.extend(
            [
                url.replace("/full", "/pdf"),
                url.replace("/abstract", "/pdf"),
            ]
        )
    if "pnas.org" in host:
        out.extend(
            [
                url.replace("/doi/abs/", "/doi/pdf/"),
                url.replace("/doi/full/", "/doi/pdf/"),
            ]
        )
    if "cell.com" in host:
        out.extend(
            [
                url.replace("/fulltext/", "/pdf/"),
                url.replace("/abstract/", "/pdf/"),
            ]
        )
    deduped: list[str] = []
    seen: set[str] = set()
    for candidate in out:
        if candidate != url and candidate not in seen:
            seen.add(candidate)
            deduped.append(candidate)
    return deduped


def try_doi_pdf_fallbacks(context, doi: str, out_path: Path) -> bool:
    candidates = [
        f"https://www.science.org/doi/pdf/{doi}",
        f"https://www.science.org/doi/epdf/{doi}",
    ]
    for url in candidates:
        if request_pdf(context, url, out_path):
            return True
    return False


def try_citation_meta_pdf(page, context, out_path: Path) -> bool:
    """Try the citation_pdf_url <meta> tag — a widely supported schema embedded
    by Springer, MDPI, Frontiers, BMC, eLife, and many others."""
    try:
        pdf_url = page.evaluate(
            """() => {
                const m = document.querySelector('meta[name="citation_pdf_url"]');
                return m ? m.getAttribute('content') : null;
            }"""
        )
    except Exception:
        return False
    if not pdf_url:
        return False
    target = urljoin(page.url, pdf_url)
    return request_pdf(context, target, out_path)


def try_site_specific_download(
    page, context, out_path: Path, element_timeout: int = 1500, download_timeout: int = 8000
) -> bool:
    # Publisher-tailored selectors first.
    selectors = [
        'a[data-track-action*="Pdf"]',
        'a[title*="Download PDF"]',
        'a:has-text("Download PDF")',
        'a:has-text("View PDF")',
        'a:has-text("Full Text PDF")',
        'button:has-text("Download PDF")',
        'button:has-text("View PDF")',
        # Oxford Academic
        "a.article-pdfLink",
        # Cambridge Core
        "a[title='PDF']",
        # MDPI / Frontiers
        "a.btn-pdf",
        # PLOS
        "a[href*='?type=printable']",
    ]
    for selector in selectors:
        locator = page.locator(selector)
        count = min(locator.count(), 5)
        for i in range(count):
            try:
                elem = locator.nth(i)
                if not elem.is_visible(timeout=element_timeout):
                    continue
                with page.expect_download(timeout=download_timeout) as dl_info:
                    elem.click(timeout=3000)
                dl_info.value.save_as(str(out_path))
                return True
            except Exception:
                continue

    candidates = extract_candidate_urls(page)
    for endpoint in add_known_site_endpoints(page):
        candidates.insert(0, endpoint)

    prioritized = select_site_candidates(page.url, candidates)
    if prioritized:
        prioritized.sort(key=score_candidate, reverse=True)
        for href in prioritized:
            target_url = urljoin(page.url, href)
            if request_pdf(context, target_url, out_path):
                return True
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


def process_item(
    page,
    context,
    item: str,
    index: int,
    download_dir: Path,
    delay_seconds: float,
    captcha_timeout: int,
    manual_rescue: bool,
    nav_timeout: int = 45000,
    element_timeout: int = 1500,
    download_timeout: int = 8000,
    inter_delay: float = 0.0,
    domain_last_time: dict | None = None,
) -> tuple[str, str]:
    source = normalize_item(item)
    source_doi = extract_doi(source) or extract_doi(item)
    base_name = base_name_from_item(item, index)
    pdf_path = download_dir / f"{base_name}.pdf"
    challenge_seen = False

    # Fast path for direct PDF URLs (e.g., arXiv).
    if source.lower().endswith(".pdf"):
        if request_pdf(context, source, pdf_path):
            return ("downloaded", str(pdf_path))

    # Inter-domain rate limiting: enforce minimum gap between requests to the same domain.
    if inter_delay > 0 and domain_last_time is not None:
        domain = parse_hostname(source)
        if domain:
            elapsed = time.time() - domain_last_time.get(domain, 0)
            if elapsed < inter_delay:
                time.sleep(inter_delay - elapsed)

    try:
        goto_with_retries(page, source, timeout_ms=nav_timeout, retries=3)
    except PlaywrightTimeoutError:
        return ("error", f"Navigation timeout: {source}")
    except Exception as exc:
        return ("error", f"Navigation failed: {source} ({exc})")

    # Record visit time for rate limiting.
    if inter_delay > 0 and domain_last_time is not None:
        domain = parse_hostname(source)
        if domain:
            domain_last_time[domain] = time.time()

    if delay_seconds > 0:
        time.sleep(delay_seconds)

    if is_captcha_or_challenge(page):
        challenge_seen = True
        if not wait_for_captcha_resolution(page, captcha_timeout):
            if manual_rescue and manual_rescue_download(page, context, pdf_path):
                return ("downloaded", str(pdf_path))
            return ("captcha_timeout", f"Challenge not cleared in {captcha_timeout}s: {page.url}")

    # If challenge keeps reappearing after initial clear, allow manual rescue immediately.
    if is_captcha_or_challenge(page) and manual_rescue:
        if manual_rescue_download(page, context, pdf_path):
            return ("downloaded", str(pdf_path))

    if page.url.lower().endswith(".pdf"):
        try:
            pdf_bytes = page.content().encode("utf-8")
            if pdf_bytes:
                # When browser renders inline PDF, use network fetch for the same URL.
                if request_pdf(context, page.url, pdf_path):
                    return ("downloaded", str(pdf_path))
        except Exception:
            pass

    # citation_pdf_url meta tag: high-confidence universal fallback.
    if try_citation_meta_pdf(page, context, pdf_path):
        return ("downloaded", str(pdf_path))

    if try_site_specific_download(page, context, pdf_path, element_timeout, download_timeout):
        return ("downloaded", str(pdf_path))

    if try_click_download(page, pdf_path, element_timeout, download_timeout):
        return ("downloaded", str(pdf_path))

    candidates = extract_candidate_urls(page)
    candidates.sort(key=score_candidate, reverse=True)
    for href in candidates:
        target_url = urljoin(page.url, href)
        if request_pdf(context, target_url, pdf_path):
            return ("downloaded", str(pdf_path))

    # Final DOI-based resolver fallback (useful when anti-bot pages hide PDF anchors).
    if source_doi and try_doi_pdf_fallbacks(context, source_doi, pdf_path):
        return ("downloaded", str(pdf_path))

    # If a challenge occurred and normal strategies still fail, allow one final
    # operator-assisted attempt to open the PDF manually and continue.
    if manual_rescue and challenge_seen:
        if manual_rescue_download(page, context, pdf_path):
            return ("downloaded", str(pdf_path))
        return ("manual_not_found", "Manual rescue attempted, but PDF still not detected.")

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
    parser.add_argument(
        "--captcha-timeout",
        type=int,
        default=600,
        help="Seconds to wait for manual CAPTCHA/challenge completion (0 = wait forever).",
    )
    parser.add_argument(
        "--manual-rescue",
        action="store_true",
        help="If blocked by challenge loops, let you manually open PDF then press Enter to continue.",
    )
    parser.add_argument(
        "--nav-timeout",
        type=int,
        default=45000,
        help="Milliseconds to wait for page navigation (default: 45000).",
    )
    parser.add_argument(
        "--element-timeout",
        type=int,
        default=1500,
        help="Milliseconds to wait for element visibility before clicking (default: 1500).",
    )
    parser.add_argument(
        "--download-timeout",
        type=int,
        default=8000,
        help="Milliseconds to wait for a download to start after clicking (default: 8000).",
    )
    parser.add_argument(
        "--inter-delay",
        type=float,
        default=0.0,
        help="Minimum seconds between requests to the same domain (default: 0, disabled).",
    )
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
            try:
                goto_with_retries(page, start_url, timeout_ms=30000, retries=2)
            except Exception as exc:
                print(f"Warning: could not open start_url '{start_url}': {exc}")
                print("Continuing with browser open for manual login.")
                try:
                    page.goto("about:blank")
                except Exception:
                    pass

        if args.manual_login:
            # login_url may be a single string or a list of URLs (for multi-provider auth).
            login_urls = [login_url] if isinstance(login_url, str) else (login_url or [])
            for lurl in login_urls:
                try:
                    goto_with_retries(page, lurl, timeout_ms=45000, retries=2)
                except Exception as exc:
                    print(f"Warning: could not open login URL '{lurl}': {exc}")
                    print("Please complete this login step manually in the browser.")
            print(
                "\nManual login step:\n"
                "1) Complete all required authentications in the opened browser.\n"
                "2) Confirm you can open one article page successfully.\n"
                "3) Return here and press Enter to continue.\n"
            )
            input()

        domain_last_time: dict[str, float] = {}
        with log_path.open("w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["index", "item", "normalized_url", "status", "details"])
            f.flush()
            for i, item in enumerate(items, start=1):
                normalized = normalize_item(item)
                print(f"[{i}/{len(items)}] {item}")
                work_page = browser_context.new_page()
                try:
                    status, details = process_item(
                        work_page,
                        browser_context,
                        item,
                        i,
                        download_dir,
                        args.delay,
                        args.captcha_timeout,
                        args.manual_rescue,
                        nav_timeout=args.nav_timeout,
                        element_timeout=args.element_timeout,
                        download_timeout=args.download_timeout,
                        inter_delay=args.inter_delay,
                        domain_last_time=domain_last_time,
                    )
                finally:
                    try:
                        work_page.close()
                    except Exception:
                        pass
                print(f"  -> {status}: {details}")
                writer.writerow([str(i), item, normalized, status, details])
                f.flush()

        browser_context.close()

    print(f"\nDone. Results log: {log_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
