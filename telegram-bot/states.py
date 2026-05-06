"""FSM states for the work report creation flow."""
from aiogram.fsm.state import State, StatesGroup


class ReportForm(StatesGroup):
    waiting_description = State()
    waiting_date = State()
    waiting_budget = State()
    waiting_photos = State()
    waiting_confirm = State()
