"""Скрипт для заполнения колонки РЕГИОН в ready_sales по ДИЛЕРУ.

Использует файл "РЕГИОН ДОБАВЛЕНИЯ.xlsx" в корне backend.
"""
import os
from datetime import datetime

import django
import pandas as pd


# Настройка Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from api.models import ReadySale  # noqa: E402


REGION_FILE_NAME = "РЕГИОН ДОБАВЛЕНИЯ.xlsx"


def build_dealer_region_map(path: str) -> dict[str, str]:
    """Считать Excel и построить словарь: дилер -> регион.

    Поддерживаем оба варианта названия колонки региона: "Регион" и "РЕГИОН".
    """
    print(f"Чтение файла с регионами: {path}")
    df = pd.read_excel(path)

    # Попробуем найти колонку с регионом
    region_col = None
    for candidate in ("Регион", "РЕГИОН"):
        if candidate in df.columns:
            region_col = candidate
            break

    if region_col is None:
        raise ValueError(
            f"В файле {path} не найдена колонка 'Регион' или 'РЕГИОН'. "
            f"Найденные колонки: {list(df.columns)}"
        )

    dealer_col = None
    for candidate in ("Дилер", "ДИЛЕР", "Дилер ", "Название дилера"):
        if candidate in df.columns:
            dealer_col = candidate
            break

    if dealer_col is None:
        raise ValueError(
            f"В файле {path} не найдена колонка 'Дилер' или 'ДИЛЕР'. "
            f"Найденные колонки: {list(df.columns)}"
        )

    mapping: dict[str, str] = {}
    for _, row in df.iterrows():
        dealer = str(row.get(dealer_col) or "").strip()
        region = str(row.get(region_col) or "").strip()
        if not dealer or not region:
            continue
        # Если дилер встречается несколько раз, последнее значение перезапишет предыдущее
        mapping[dealer] = region

    print(f"Найдено соответствий дилер -> регион: {len(mapping)}")
    return mapping


def update_ready_sales_regions(mapping: dict[str, str]) -> None:
    """Обновить поле region для всех записей ReadySale по полю diler."""
    total = ReadySale.objects.count()
    print(f"Всего записей в ready_sales: {total}")

    if total == 0:
        print("В таблице ready_sales нет записей. Нечего обновлять.")
        return

    updated = 0
    processed = 0
    batch: list[ReadySale] = []
    batch_size = 1000

    qs = ReadySale.objects.all().only("id", "diler", "region")

    start_time = datetime.now()

    for obj in qs.iterator(chunk_size=batch_size):
        processed += 1
        dealer_name = (obj.diler or "").strip()
        if not dealer_name:
            continue

        new_region = mapping.get(dealer_name)
        if not new_region:
            continue

        if obj.region == new_region:
            continue

        obj.region = new_region
        batch.append(obj)

        if len(batch) >= batch_size:
            ReadySale.objects.bulk_update(batch, ["region"])
            updated += len(batch)
            print(
                f"Обновлено {updated} записей из {total} "
                f"({updated * 100 // total}%); обработано {processed} записей"
            )
            batch.clear()

    if batch:
        ReadySale.objects.bulk_update(batch, ["region"])
        updated += len(batch)

    duration = datetime.now() - start_time
    print("\nОбновление завершено.")
    print(f"Всего обработано: {processed}")
    print(f"Обновлено записей: {updated}")
    print(f"Время выполнения: {duration}")


def main() -> None:
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    region_path = os.path.join(backend_dir, REGION_FILE_NAME)

    if not os.path.exists(region_path):
        raise FileNotFoundError(
            f"Файл с регионами не найден: {region_path}. "
            f"Убедитесь, что {REGION_FILE_NAME} лежит в папке backend."
        )

    mapping = build_dealer_region_map(region_path)
    update_ready_sales_regions(mapping)


if __name__ == "__main__":
    main()
