import hashlib
import os
import re
from datetime import datetime
from urllib.parse import unquote, urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from werkzeug.utils import secure_filename

from models import Circular, Notification, User, db
from utils.email_sender import send_circulars_email

BULLETINS_URL = "https://www.aicte.gov.in/bulletins/circulars"
BASE_URL = "https://www.aicte.gov.in"
PDF_CHUNK_SIZE = 1024 * 1024
REQUEST_TIMEOUT = (20, 300)
DETAIL_PAGE_TIMEOUT = (20, 120)


def build_session():
    session = requests.Session()
    retries = Retry(
        total=3,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET", "HEAD"],
    )
    adapter = HTTPAdapter(max_retries=retries)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    session.headers.update(
        {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            )
        }
    )
    return session


def classify_circular(title):
    title_lower = title.lower()

    if "deadline" in title_lower or "last date" in title_lower:
        return "high"
    if "guidelines" in title_lower:
        return "medium"
    if "circular" in title_lower or "notification" in title_lower:
        return "medium"
    return "low"


def detect_type(title):
    title_lower = title.lower()

    if "guidelines" in title_lower:
        return "Guidelines"
    if "approval" in title_lower:
        return "Approval"
    if "notification" in title_lower or "notice" in title_lower:
        return "Notification"
    if "circular" in title_lower:
        return "Circular"
    return "General"


def extract_deadline(title):
    match = re.search(r"\b\d{1,2}\s\w+\s\d{4}\b", title)
    if not match:
        return None

    try:
        return datetime.strptime(match.group(), "%d %B %Y")
    except ValueError:
        return None


def normalize_title(title):
    text = " ".join(title.split())
    text = re.sub(r"^\d+\s+", "", text)
    text = re.sub(r"\s+PDF(?:\s+PDF)*$", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s+Circular(?:\s+PDF)?$", "", text, flags=re.IGNORECASE)
    return text.strip(" -|")


def is_pdf_link(url):
    if not url:
        return False
    path = urlparse(url).path.lower()
    return path.endswith(".pdf") or "/sites/default/files/" in path


def fetch_page(session, url=BULLETINS_URL):
    response = session.get(url, timeout=DETAIL_PAGE_TIMEOUT)
    response.raise_for_status()
    return response.text


def extract_row_item(row):
    anchors = [a for a in row.find_all("a", href=True) if a.get("href", "").strip()]
    if not anchors:
        return None

    detail_url = None
    pdf_url = None
    title = None

    for anchor in anchors:
        href = urljoin(BASE_URL, anchor["href"].strip())
        text = normalize_title(anchor.get_text(" ", strip=True))

        if is_pdf_link(href):
            pdf_url = pdf_url or href
            continue

        if not title and text:
            title = text
        detail_url = detail_url or href

    if not title:
        title = normalize_title(row.get_text(" ", strip=True))

    if not title:
        return None

    return {
        "title": title,
        "detail_url": detail_url,
        "pdf_url": pdf_url,
    }


def parse_notifications(html):
    soup = BeautifulSoup(html, "html.parser")
    seen_titles = set()
    results = []

    for row in soup.select(".views-row"):
        item = extract_row_item(row)
        if not item:
            continue

        key = item["title"].lower()
        if key in seen_titles:
            continue

        seen_titles.add(key)
        results.append(item)

    return results


def resolve_pdf_from_detail_page(session, detail_url):
    if not detail_url:
        return None

    response = session.get(detail_url, timeout=DETAIL_PAGE_TIMEOUT)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")

    selectors = [
        ".field--name-field-document a[href]",
        ".node__content a[href]",
    ]

    for selector in selectors:
        for anchor in soup.select(selector):
            href = urljoin(BASE_URL, anchor["href"].strip())
            if is_pdf_link(href):
                return href

    return None


def download_pdf(session, pdf_url, title, upload_root):
    os.makedirs(upload_root, exist_ok=True)

    response = session.get(pdf_url, timeout=REQUEST_TIMEOUT, stream=True)
    response.raise_for_status()

    content_type = (response.headers.get("content-type") or "").lower()
    if "pdf" not in content_type and not is_pdf_link(pdf_url):
        raise ValueError(f"Resolved file is not a PDF: {pdf_url}")

    parsed = urlparse(pdf_url)
    source_name = unquote(os.path.basename(parsed.path)) or f"{secure_filename(title)}.pdf"
    safe_name = secure_filename(source_name) or f"{secure_filename(title)}.pdf"
    if not safe_name.lower().endswith(".pdf"):
        safe_name = f"{safe_name}.pdf"

    file_hash = hashlib.sha1(pdf_url.encode("utf-8")).hexdigest()[:12]
    stored_name = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{file_hash}_{safe_name}"
    final_path = os.path.join(upload_root, stored_name)
    temp_path = f"{final_path}.part"

    try:
        with open(temp_path, "wb") as handle:
            for chunk in response.iter_content(chunk_size=PDF_CHUNK_SIZE):
                if chunk:
                    handle.write(chunk)
        os.replace(temp_path, final_path)
    finally:
        response.close()
        if os.path.exists(temp_path):
            os.remove(temp_path)

    return final_path, safe_name


def scrape_aicte():
    session = build_session()
    html = fetch_page(session)
    notices = parse_notifications(html)

    for notice in notices:
        if not notice["pdf_url"]:
            try:
                notice["pdf_url"] = resolve_pdf_from_detail_page(session, notice["detail_url"])
            except Exception as exc:
                print(f"Failed to resolve PDF for {notice['title']}: {exc}")

    return notices


def get_scraper_uploader_id():
    admin = (
        User.query.filter_by(role="admin", is_active=True)
        .order_by(User.id.asc())
        .first()
    )
    if admin:
        return admin.id

    fallback = User.query.filter_by(is_active=True).order_by(User.id.asc()).first()
    if fallback:
        return fallback.id

    raise RuntimeError("No active user found to own scraped circulars.")


def build_description(item):
    source_url = item.get("detail_url") or item.get("pdf_url") or BULLETINS_URL
    return f"Imported automatically from AICTE circulars. Source: {source_url}"


def save_to_db(notices, upload_folder):
    try:
        count = 0
        new_items = []
        uploader_id = get_scraper_uploader_id()
        session = build_session()
        circular_upload_dir = os.path.join(upload_folder, "circulars")

        for item in notices:
            title = normalize_title(item["title"])
            if not title:
                continue

            priority = classify_circular(title)
            ctype = detect_type(title)
            deadline = extract_deadline(title)
            description = build_description(item)

            existing = (
                Circular.query.filter(
                    Circular.title.in_([title, f"{title}TEST3"])
                )
                .order_by(Circular.id.asc())
                .first()
            )

            file_path = None
            file_name = None

            needs_pdf = item.get("pdf_url") and (
                not existing
                or not existing.file_path
                or not os.path.exists(existing.file_path)
            )

            if needs_pdf:
                try:
                    file_path, file_name = download_pdf(
                        session,
                        item["pdf_url"],
                        title,
                        circular_upload_dir,
                    )
                except Exception as exc:
                    print(f"Failed to download PDF for {title}: {exc}")

            if existing:
                updated = False

                if existing.title != title:
                    existing.title = title
                    updated = True
                if existing.description != description:
                    existing.description = description
                    updated = True
                if not existing.target_departments:
                    existing.target_departments = "all"
                    updated = True
                if file_path and file_name:
                    existing.file_path = file_path
                    existing.file_name = file_name
                    updated = True

                if updated:
                    db.session.add(existing)
                continue

            new_circular = Circular(
                title=title,
                description=description,
                category=ctype,
                regulation_type="AICTE",
                priority=priority,
                deadline=deadline,
                uploaded_by=uploader_id,
                target_departments="all",
                file_path=file_path,
                file_name=file_name,
            )

            db.session.add(new_circular)
            db.session.flush()

            count += 1
            new_items.append(new_circular)

        db.session.commit()
        print(f"{count} new circulars added")

        if new_items:
            users = User.query.filter(User.is_active.is_(True)).all()

            for circular in new_items:
                for user in users:
                    if user.id == circular.uploaded_by:
                        continue

                    notification = Notification(
                        user_id=user.id,
                        circular_id=circular.id,
                        title=circular.title,
                        message=f"New circular: {circular.title}",
                        type="circular",
                        is_read=False,
                    )
                    db.session.add(notification)

            db.session.commit()

            for user in users:
                if user.id == uploader_id:
                    continue

                send_circulars_email(
                    to_email=user.email,
                    name=user.name,
                    circulars=[
                        {
                            "title": c.title,
                            "link": c.description,
                        }
                        for c in new_items
                    ],
                )

    except Exception as exc:
        print("Error while saving to DB:", exc)
        db.session.rollback()


def run_scraper():
    data = scrape_aicte()

    try:
        from flask import current_app

        save_to_db(data, current_app.config["UPLOAD_FOLDER"])
    except Exception as exc:
        print("Retrying once due to error:", exc)
        from flask import current_app

        save_to_db(data, current_app.config["UPLOAD_FOLDER"])
