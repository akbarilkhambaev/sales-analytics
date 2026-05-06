"""Handlers: /start, /link, account linking flow."""
import logging
from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message
from aiogram.fsm.context import FSMContext

import api_client
from keyboards import main_menu_kb, remove_kb

router = Router()
logger = logging.getLogger(__name__)


@router.message(Command("start"))
async def cmd_start(message: Message):
    user = await api_client.resolve_user(message.chat.id)
    if user:
        await message.answer(
            f"Привет, {user['full_name']}! 👋\nВыберите действие:",
            reply_markup=main_menu_kb(),
        )
    else:
        await message.answer(
            "Привет! 👋\n\n"
            "Этот бот позволяет отправлять рабочие отчёты прямо из Telegram.\n\n"
            "Для начала привяжите ваш аккаунт:\n"
            "1. Откройте веб-сайт → Личный кабинет → Telegram\n"
            "2. Нажмите «Получить код привязки»\n"
            "3. Отправьте мне: /link КОД",
            reply_markup=remove_kb,
        )


@router.message(Command("link"))
async def cmd_link(message: Message):
    parts = (message.text or "").split()
    if len(parts) != 2:
        await message.answer("Использование: /link КОД\n\nПолучите код в Личном кабинете на сайте.")
        return

    code = parts[1].strip()
    user = message.from_user
    try:
        result = await api_client.confirm_link(
            code=code,
            chat_id=message.chat.id,
            username=user.username or "",
            first_name=user.first_name or "",
            last_name=user.last_name or "",
        )
        await message.answer(
            f"✅ Аккаунт успешно привязан!\nДобро пожаловать, {result.get('full_name', '')}!",
            reply_markup=main_menu_kb(),
        )
    except Exception as e:
        logger.warning("Link failed for chat_id=%s: %s", message.chat.id, e)
        await message.answer(
            "❌ Не удалось привязать аккаунт.\n"
            "Убедитесь, что код верный и не просрочен (5 минут).\n"
            "Получите новый код в Личном кабинете."
        )


@router.message(F.text == "🔗 Отвязать аккаунт")
async def unlink_account(message: Message, state: FSMContext):
    await state.clear()
    # Backend: отвязка происходит через веб или напрямую в БД.
    # Здесь информируем пользователя.
    await message.answer(
        "Для отвязки перейдите в Личный кабинет на сайте → Telegram → «Отвязать».",
        reply_markup=main_menu_kb(),
    )
