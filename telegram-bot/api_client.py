"""HTTP client for backend API calls from the Telegram bot."""
from typing import Any
import httpx
from config import API_BASE_URL, TELEGRAM_BOT_API_TOKEN

_HEADERS = {"X-Bot-Token": TELEGRAM_BOT_API_TOKEN}


async def confirm_link(code: str, chat_id: int, username: str, first_name: str, last_name: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{API_BASE_URL}/auth/telegram/bot/confirm-link/",
            json={
                "code": code,
                "chat_id": chat_id,
                "username": username,
                "first_name": first_name,
                "last_name": last_name,
            },
            headers=_HEADERS,
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()


async def resolve_user(chat_id: int) -> dict | None:
    """Returns user info dict or None if not linked."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{API_BASE_URL}/auth/telegram/bot/resolve/",
            json={"chat_id": chat_id},
            headers=_HEADERS,
            timeout=10,
        )
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        data = resp.json()
        if not data.get("linked"):
            return None
        user = data["user"]
        user["full_name"] = (
            f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
            or user["username"]
        )
        return user


async def create_work_report(chat_id: int, payload: dict) -> dict:
    import logging
    _log = logging.getLogger(__name__)
    async with httpx.AsyncClient() as client:
        body = {"chat_id": chat_id, **payload}
        _log.info("create_work_report body: %s", body)
        resp = await client.post(
            f"{API_BASE_URL}/auth/telegram/bot/work-reports/create/",
            json=body,
            headers=_HEADERS,
            timeout=15,
        )
        if not resp.is_success:
            _log.error("create_work_report %s: %s", resp.status_code, resp.text)
        resp.raise_for_status()
        return resp.json()


async def upload_photo(report_id: int, photo_bytes: bytes, chat_id: int, filename: str = "photo.jpg") -> dict:
    import logging
    _log = logging.getLogger(__name__)
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{API_BASE_URL}/auth/telegram/bot/work-reports/{report_id}/upload-photo/",
            data={"chat_id": str(chat_id)},
            files={"image": (filename, photo_bytes, "image/jpeg")},
            headers=_HEADERS,
            timeout=30,
        )
        if not resp.is_success:
            _log.error("upload_photo %s: %s", resp.status_code, resp.text)
        resp.raise_for_status()
        return resp.json()


async def get_my_reports(chat_id: int) -> list[dict]:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{API_BASE_URL}/auth/telegram/bot/work-reports/my/",
            json={"chat_id": chat_id},
            headers=_HEADERS,
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json().get('reports', [])
