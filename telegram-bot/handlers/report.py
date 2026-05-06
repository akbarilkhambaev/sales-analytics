"""Handlers: work report creation flow (FSM)."""
import logging
from datetime import date, datetime
from aiogram import Router, F, Bot
from aiogram.types import Message
from aiogram.fsm.context import FSMContext

import api_client
from states import ReportForm
from keyboards import main_menu_kb, today_kb, skip_kb, done_kb, confirm_kb, remove_kb

router = Router()
logger = logging.getLogger(__name__)


def _require_linked(func):
    """Decorator: check that user is linked before handling."""
    async def wrapper(message: Message, state: FSMContext, **kwargs):
        user = await api_client.resolve_user(message.chat.id)
        if not user:
            await message.answer(
                "Ваш Telegram не привязан к аккаунту.\n"
                "Используйте /link КОД для привязки.",
                reply_markup=remove_kb,
            )
            return
        return await func(message, state, user=user, **kwargs)
    return wrapper


@router.message(F.text == "📝 Добавить отчёт")
async def start_report(message: Message, state: FSMContext):
    user = await api_client.resolve_user(message.chat.id)
    if not user:
        await message.answer("Сначала привяжите аккаунт командой /link КОД.")
        return

    await state.clear()
    await state.set_state(ReportForm.waiting_description)
    await message.answer(
        "📝 <b>Новый отчёт</b>\n\nВведите описание работ:",
        parse_mode="HTML",
        reply_markup=remove_kb,
    )


@router.message(ReportForm.waiting_description)
async def got_description(message: Message, state: FSMContext):
    await state.update_data(description=message.text or "")
    await state.set_state(ReportForm.waiting_date)
    await message.answer(
        "📅 Укажите дату (дд.мм.гггг) или нажмите «Сегодня»:",
        reply_markup=today_kb(),
    )


@router.message(ReportForm.waiting_date)
async def got_date(message: Message, state: FSMContext):
    text = (message.text or "").strip()
    if text == "📅 Сегодня":
        report_date = date.today().isoformat()
    else:
        try:
            report_date = datetime.strptime(text, "%d.%m.%Y").date().isoformat()
        except ValueError:
            await message.answer("Неверный формат. Введите дату в формате дд.мм.гггг или нажмите «Сегодня»:")
            return

    await state.update_data(report_date=report_date)
    await state.set_state(ReportForm.waiting_budget)
    await message.answer(
        "💰 Укажите бюджет/сумму (или пропустите):",
        reply_markup=skip_kb(),
    )


@router.message(ReportForm.waiting_budget)
async def got_budget(message: Message, state: FSMContext):
    text = (message.text or "").strip()
    budget = None
    if text != "⏭ Пропустить":
        try:
            budget = float(text.replace(",", ".").replace(" ", ""))
        except ValueError:
            await message.answer("Введите число или нажмите «Пропустить»:")
            return

    await state.update_data(budget=budget)
    await state.set_state(ReportForm.waiting_photos)
    await message.answer(
        "📸 Отправьте фотографии (одну или несколько), затем нажмите «Готово».\n"
        "Или сразу «Готово» если фото не нужны.",
        reply_markup=done_kb(),
    )


@router.message(ReportForm.waiting_photos, F.photo)
async def got_photo(message: Message, state: FSMContext):
    data = await state.get_data()
    photos: list = data.get("photos", [])
    # Store the file_id of the best quality photo
    photos.append(message.photo[-1].file_id)
    await state.update_data(photos=photos)
    await message.answer(f"📸 Фото добавлено ({len(photos)} шт.). Отправьте ещё или нажмите «Готово».")


@router.message(ReportForm.waiting_photos, F.text == "✅ Готово")
async def photos_done(message: Message, state: FSMContext):
    data = await state.get_data()
    description = data.get("description", "")
    report_date = data.get("report_date", date.today().isoformat())
    budget = data.get("budget")
    photos: list = data.get("photos", [])

    budget_str = f"{budget:,.0f}" if budget is not None else "не указан"
    photos_str = f"{len(photos)} шт." if photos else "нет"
    summary = (
        f"📋 <b>Проверьте отчёт:</b>\n\n"
        f"📝 Описание: {description}\n"
        f"📅 Дата: {report_date}\n"
        f"💰 Бюджет: {budget_str}\n"
        f"📸 Фото: {photos_str}\n\n"
        "Подтвердить?"
    )
    await state.set_state(ReportForm.waiting_confirm)
    await message.answer(summary, parse_mode="HTML", reply_markup=confirm_kb())


@router.message(ReportForm.waiting_confirm, F.text == "✅ Подтвердить")
async def confirm_report(message: Message, state: FSMContext, bot: Bot):
    data = await state.get_data()
    await state.clear()

    description = data.get("description", "")
    report_date = data.get("report_date", date.today().isoformat())
    budget = data.get("budget")
    photos: list = data.get("photos", [])

    try:
        report = await api_client.create_work_report(
            chat_id=message.chat.id,
            payload={
                "description": description,
                "date": report_date,
                "budget": budget if budget is not None else 0,
                "report_status": "COMPLETED",
            },
        )
        report_id = report["report_id"]

        # Upload photos
        failed_photos = 0
        for file_id in photos:
            try:
                file = await bot.get_file(file_id)
                file_bytes = await bot.download_file(file.file_path)
                await api_client.upload_photo(report_id, file_bytes.read(), chat_id=message.chat.id)
            except Exception as e:
                logger.warning("Photo upload failed: %s", e)
                failed_photos += 1

        msg = f"✅ Отчёт #{report_id} успешно создан!"
        if failed_photos:
            msg += f"\n⚠️ {failed_photos} фото не удалось загрузить."
        await message.answer(msg, reply_markup=main_menu_kb())

    except Exception as e:
        logger.error("Report creation failed: %s", e)
        await message.answer(
            "❌ Ошибка создания отчёта. Попробуйте позже.",
            reply_markup=main_menu_kb(),
        )


@router.message(ReportForm.waiting_confirm, F.text == "❌ Отмена")
async def cancel_report(message: Message, state: FSMContext):
    await state.clear()
    await message.answer("Отчёт отменён.", reply_markup=main_menu_kb())


@router.message(F.text == "📋 Мои отчёты")
async def my_reports(message: Message, state: FSMContext):
    user = await api_client.resolve_user(message.chat.id)
    if not user:
        await message.answer("Сначала привяжите аккаунт командой /link КОД.")
        return

    try:
        reports = await api_client.get_my_reports(message.chat.id)
        if not reports:
            await message.answer("У вас пока нет отчётов.", reply_markup=main_menu_kb())
            return

        lines = ["📋 <b>Последние отчёты:</b>\n"]
        for r in reports:
            status_icons = {
                "COMPLETED": "✅", "IN_PROGRESS": "🔄",
                "PLANNED": "📌", "ON_HOLD": "⏸", "CANCELLED": "❌",
            }
            icon = status_icons.get(r.get("status", ""), "📄")
            lines.append(
                f"{icon} <b>#{r['id']}</b> {r.get('date', '')} — {r.get('description', '')[:50]}"
            )

        await message.answer("\n".join(lines), parse_mode="HTML", reply_markup=main_menu_kb())
    except Exception as e:
        logger.error("get_my_reports failed: %s", e)
        await message.answer("Ошибка получения отчётов.", reply_markup=main_menu_kb())
