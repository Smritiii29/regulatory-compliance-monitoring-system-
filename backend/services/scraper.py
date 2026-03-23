import requests
from bs4 import BeautifulSoup
from app import create_app, db
from models import Circular
from sqlalchemy import text
import re
from datetime import datetime

# -----------------------------
# STEP 1: SCRAPE AICTE WEBSITE
# -----------------------------
URL = "https://www.aicte-india.org/bulletins"

def classify_circular(title):
    title_lower = title.lower()

    if "deadline" in title_lower or "last date" in title_lower:
        return "high"
    elif "guidelines" in title_lower:
        return "medium"
    elif "circular" in title_lower or "notification" in title_lower:
        return "medium"
    else:
        return "low"


def detect_type(title):
    title_lower = title.lower()

    if "guidelines" in title_lower:
        return "Guidelines"
    elif "approval" in title_lower:
        return "Approval"
    elif "notification" in title_lower:
        return "Notification"
    elif "circular" in title_lower:
        return "Circular"
    else:
        return "General"


def extract_deadline(title):
    match = re.search(r'\b\d{1,2}\s\w+\s\d{4}\b', title)

    if match:
        try:
            return datetime.strptime(match.group(), "%d %B %Y")
        except:
            return None

    return None

def fetch_page():
    response = requests.get(URL)
    return response.text


def parse_notifications(html):
    soup = BeautifulSoup(html, "html.parser")

    results = []

    keywords = ["circular", "notification", "guidelines", "approval", "extension"]

    for link in soup.find_all("a"):
        title = link.text.strip().lower()
        href = link.get("href")

        if not title or not href:
            continue

        # 🔥 filter by keywords
        if any(keyword in title for keyword in keywords):

            if href.startswith("/"):
                href = "https://www.aicte-india.org" + href

            clean_title = " ".join(title.split())

            results.append({
                "title": clean_title.title(),
                "link": href
            })

    return results[:10]


def scrape_aicte():
    html = fetch_page()
    return parse_notifications(html)


# -----------------------------
# STEP 2: SAVE TO DATABASE
# -----------------------------
# from app import create_app, db
# from models import Circular
# from sqlalchemy import text


def save_to_db(notices):
    app = create_app()

    with app.app_context():
        try:
            # 🔥 ensure DB connection is alive
            db.session.execute(text("SELECT 1"))

            count = 0

            for item in notices:
                title = item["title"]

                exists = Circular.query.filter_by(title=title).first()

                if not exists:

                    priority = classify_circular(title)
                    ctype = detect_type(title)
                    deadline = extract_deadline(title)

                    new_circular = Circular(
                        title=title,
                        description=item["link"],
                        category=ctype,
                        regulation_type="AICTE",
                        priority=priority,
                        deadline=deadline,
                        uploaded_by=1
                    )

                    db.session.add(new_circular)
                    count += 1

            db.session.commit()
            print(f"{count} new circulars added")

        except Exception as e:
            print("Error while saving to DB:", e)
            db.session.rollback()


# -----------------------------
# STEP 3: MAIN RUN FUNCTION
# -----------------------------
def run_scraper():
    data = scrape_aicte()

    try:
        save_to_db(data)
    except Exception as e:
        print("Retrying once due to error:", e)
        save_to_db(data)