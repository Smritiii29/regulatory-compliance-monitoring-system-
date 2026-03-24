from apscheduler.schedulers.background import BackgroundScheduler
from services.scraper import run_scraper

scheduler = BackgroundScheduler()

def start_scheduler(app):
    print("🚀 Scheduler starting...")

    def job():
        print("Running scheduled scraper...")

        # 🔥 give Flask context here
        with app.app_context():
            run_scraper()

    scheduler.add_job(
        func=job,
        trigger='interval',
        minutes=60,  # keep 1 for testing
        id='aicte_scraper_job',
        replace_existing=True
    )

    scheduler.start()

    print("✅ Scheduler started successfully")