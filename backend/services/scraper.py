import requests
from bs4 import BeautifulSoup

# -----------------------------
# STEP 1: SCRAPE AICTE WEBSITE
# -----------------------------
URL = "https://www.aicte-india.org/bulletins"


def fetch_page():
    response = requests.get(URL)
    return response.text


def parse_notifications(html):
    soup = BeautifulSoup(html, "html.parser")

    results = []

    for link in soup.find_all("a"):
        title = link.text.strip()
        href = link.get("href")

        # Basic filtering (remove garbage)
        if title and len(title) > 25:
            if href:
                results.append({
                    "title": title,
                    "link": href
                })

    # 🔥 IMPORTANT: limit results to avoid DB overload
    return results[:10]


def scrape_aicte():
    html = fetch_page()
    return parse_notifications(html)


# -----------------------------
# STEP 2: SAVE TO DATABASE
# -----------------------------
from app import create_app, db
from models import Circular
from sqlalchemy import text


def save_to_db(notices):
    app = create_app()

    with app.app_context():
        try:
            # 🔥 ensure DB connection is alive
            db.session.execute(text("SELECT 1"))

            count = 0

            for item in notices:
                title = item["title"]

                # check duplicate
                exists = Circular.query.filter_by(title=title).first()

                if not exists:
                    new_circular = Circular(
                        title=title,
                        category="Regulation",
                        regulation_type="AICTE",
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