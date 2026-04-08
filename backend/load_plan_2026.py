"""
Загрузка планов продаж из файла "ПЛАН 2026 ГОД ДЛЯ БД.xlsx" в таблицу sales_plan.

Использование:
    python load_plan_2026.py [--clear] [--file "путь/к/файлу.xlsx"]

    --clear   очистить таблицу sales_plan перед загрузкой (только год 2026)
    --file    путь к файлу (по умолчанию: "ПЛАН 2026 ГОД ДЛЯ БД.xlsx" в текущей папке)
"""

import os
import sys
import argparse
import django

# --- Django setup -----------------------------------------------------------
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

import openpyxl
from api.models import SalesPlan

MONTH_MAP = {
    'январь':   1,  'февраль':  2,  'март':     3,  'апрель':   4,
    'май':      5,  'июнь':     6,  'июль':     7,  'август':   8,
    'сентябрь': 9,  'октябрь':  10, 'ноябрь':   11, 'декабрь':  12,
}

YEAR = 2026


def load(filepath: str, clear: bool = False):
    print(f"Читаю файл: {filepath}")

    wb = openpyxl.load_workbook(filepath, read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    header = [str(c).strip() if c is not None else '' for c in rows[0]]
    data_rows = rows[1:]

    print(f"Заголовок: {header}")
    print(f"Строк данных: {len(data_rows)}")

    # Определяем индексы колонок
    try:
        idx_kod    = header.index('КОД ТОВАРА')
        idx_obem   = header.index('ОБЪЕМ')
        idx_month  = header.index('МЕСЯЦ')
        idx_region = header.index('РЕГИОН')
        idx_baza   = header.index('БАЗА')
    except ValueError as e:
        print(f"ОШИБКА: Не найдена колонка — {e}")
        print(f"Доступные колонки: {header}")
        return

    if clear:
        deleted, _ = SalesPlan.objects.filter(year=YEAR).delete()
        print(f"Удалено {deleted} записей за {YEAR} год")

    to_create = []
    skipped = 0
    month_errors = set()

    for i, row in enumerate(data_rows, start=2):
        kod    = str(row[idx_kod]).strip()   if row[idx_kod]    is not None else ''
        obem   = row[idx_obem]
        month_str = str(row[idx_month]).strip().lower() if row[idx_month] is not None else ''
        region = str(row[idx_region]).strip() if row[idx_region] is not None else ''
        baza   = str(row[idx_baza]).strip()   if row[idx_baza]   is not None else ''

        if not kod or obem is None:
            skipped += 1
            continue

        month_num = MONTH_MAP.get(month_str)
        if month_num is None:
            month_errors.add(month_str)
            skipped += 1
            continue

        try:
            plan_val = float(obem)
        except (TypeError, ValueError):
            skipped += 1
            continue

        to_create.append(SalesPlan(
            kod_tovara=kod,
            year=YEAR,
            month=month_num,
            plan_kg=plan_val,
            region=region,
            baza=baza,
        ))

    if month_errors:
        print(f"ПРЕДУПРЕЖДЕНИЕ: неизвестные месяцы (пропущены): {month_errors}")

    print(f"Подготовлено к загрузке: {len(to_create)} записей, пропущено: {skipped}")

    if not to_create:
        print("Нечего загружать.")
        return

    # Загружаем пачками по 500
    batch = 500
    created = 0
    for i in range(0, len(to_create), batch):
        chunk = to_create[i:i + batch]
        if clear:
            SalesPlan.objects.bulk_create(chunk, batch_size=batch)
            created += len(chunk)
        else:
            # update_or_create через bulk — используем ignore_conflicts если данные уже есть
            SalesPlan.objects.bulk_create(
                chunk, batch_size=batch,
                update_conflicts=True,
                unique_fields=['kod_tovara', 'year', 'month', 'region', 'baza'],
                update_fields=['plan_kg'],
            )
            created += len(chunk)
        print(f"  Загружено: {min(i + batch, len(to_create))}/{len(to_create)}")

    print(f"\nГотово! Загружено/обновлено {created} записей в таблицу sales_plan.")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Загрузка плана продаж 2026')
    parser.add_argument('--clear', action='store_true',
                        help='Очистить записи за 2026 год перед загрузкой')
    parser.add_argument('--file', default='ПЛАН 2026 ГОД ДЛЯ БД.xlsx',
                        help='Путь к Excel файлу (по умолчанию: ПЛАН 2026 ГОД ДЛЯ БД.xlsx)')
    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(f"ОШИБКА: Файл не найден: {args.file}")
        sys.exit(1)

    load(filepath=args.file, clear=args.clear)
