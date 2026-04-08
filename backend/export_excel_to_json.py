"""Экспорт данных из ВСЕХ листов Excel в JSON для быстрой загрузки"""
import pandas as pd
import json
import os
import re
import glob
from datetime import datetime


def export_excel_to_json(excel_file, year):
    """Экспорт ВСЕХ листов Excel файла в отдельные JSON файлы"""
    print(f"\n{'='*60}")
    print(f"Экспорт: {excel_file}")
    print(f"Год: {year}")
    print(f"{'='*60}")
    
    if not os.path.exists(excel_file):
        print(f"✗ Файл {excel_file} не найден!")
        return False
    
    # Получаем список всех листов
    xl_file = pd.ExcelFile(excel_file)
    sheets = xl_file.sheet_names
    print(f"Найдено листов: {len(sheets)}")
    
    total_rows = 0
    total_start = datetime.now()
    
    # Экспортируем каждый лист
    for sheet_name in sheets:
        json_file = f"{year}_{sheet_name.replace(' ', '_')}.json"
        
        print(f"\n  Лист '{sheet_name}' → {json_file}")
        
        # Читаем лист
        start_time = datetime.now()
        df = pd.read_excel(excel_file, sheet_name=sheet_name)
        read_time = datetime.now() - start_time
        print(f"    Прочитано: {len(df)} строк за {read_time}")
        
        # Добавляем поле года и листа
        df['year'] = year
        df['sheet_name'] = sheet_name
        
        # Конвертируем даты в правильный формат ISO (YYYY-MM-DD)
        if 'Дата' in df.columns:
            df['Дата'] = pd.to_datetime(df['Дата'], errors='coerce').dt.strftime('%Y-%m-%d')
        
        # Заменяем NaN на None
        df = df.where(pd.notnull(df), None)
        
        # Сохраняем в JSON
        start_time = datetime.now()
        data = df.to_dict('records')
        
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        save_time = datetime.now() - start_time
        file_size_mb = os.path.getsize(json_file) / (1024 * 1024)
        
        print(f"    Сохранено: {file_size_mb:.2f} MB за {save_time}")
        total_rows += len(data)
    
    total_time = datetime.now() - total_start
    print(f"\n  ✓ Всего строк из {len(sheets)} листов: {total_rows}")
    print(f"  Время: {total_time}")
    
    return True


def main():
    """Основная функция"""
    print("\n" + "="*60)
    print("ЭКСПОРТ ВСЕХ ЛИСТОВ EXCEL → JSON")
    print("="*60)
    
    # Автоматически находим все файлы вида "XXXX ГОТОВЫЙ.xlsx"
    excel_files = glob.glob('* ГОТОВЫЙ.xlsx')
    
    if not excel_files:
        print("\n✗ Не найдено файлов вида 'XXXX ГОТОВЫЙ.xlsx'")
        print("Положите Excel файлы в папку backend/")
        return
    
    # Извлекаем год из названия файла
    files_with_years = []
    for excel_file in excel_files:
        # Ищем 4 цифры в начале названия
        match = re.search(r'^(\d{4})', excel_file)
        if match:
            year = int(match.group(1))
            files_with_years.append((excel_file, year))
        else:
            print(f"\n⚠ Не удалось извлечь год из файла: {excel_file}")
    
    if not files_with_years:
        print("\n✗ Не найдено файлов с годом в названии")
        return
    
    # Сортируем по году
    files_with_years.sort(key=lambda x: x[1])
    
    print(f"\nНайдено файлов для экспорта: {len(files_with_years)}")
    for excel_file, year in files_with_years:
        print(f"  - {excel_file} (год: {year})")
    
    total_start = datetime.now()
    
    for excel_file, year in files_with_years:
        if os.path.exists(excel_file):
            try:
                export_excel_to_json(excel_file, year)
            except Exception as e:
                print(f"\n✗ Ошибка при экспорте {excel_file}: {e}")
                import traceback
                traceback.print_exc()
        else:
            print(f"\n⚠ Файл {excel_file} не найден, пропускаем...")
    
    total_time = datetime.now() - total_start
    
    print("\n" + "="*60)
    print(f"Общее время: {total_time}")
    print("✓ Экспорт завершен!")
    print("\nТеперь запустите: python load_from_json.py")
    print("="*60)


if __name__ == '__main__':
    main()
