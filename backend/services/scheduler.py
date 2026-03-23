import schedule
import time
from services.scraper import run_scraper

def job():
    print("Running scheduled scraper...")
    run_scraper()

# run every 10 minutes (for testing)
schedule.every(10).minutes.do(job)

def start_scheduler():
    print("Scheduler started...")

    while True:
        schedule.run_pending()
        time.sleep(1)