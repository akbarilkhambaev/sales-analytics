import os
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN: str = os.environ["TELEGRAM_BOT_TOKEN"]
API_BASE_URL: str = os.environ.get("API_BASE_URL", "http://localhost:8000/api")
TELEGRAM_BOT_API_TOKEN: str = os.environ["TELEGRAM_BOT_API_TOKEN"]
