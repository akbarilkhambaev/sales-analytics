"""Проверка структуры Excel файлов - количество листов"""
import pandas as pd
import os


def check_excel_sheets(file_path):
    """Проверка листов в Excel файле"""
    print(f"\n{'='*60}")
    print(f"Файл: {file_path}")
    print(f"{'='*60}")
    
    if not os.path.exists(file_path):
        print(f"✗ Файл не найден!")
        return
    
    # Получаем список всех листов
    xl_file = pd.ExcelFile(file_path)
    sheets = xl_file.sheet_names
    
    print(f"Количество листов: {len(sheets)}")
    print(f"\nСписок листов:")
    
    for i, sheet_name in enumerate(sheets, 1):
        print(f"  {i}. '{sheet_name}'")


if __name__ == '__main__':
    files = [
        '2024 ГОТОВЫЙ.xlsx',
        '2025 ГОТОВЫЙ.xlsx'
    ]
    
    for file_path in files:
        if os.path.exists(file_path):
            check_excel_sheets(file_path)
        else:
            print(f"\n⚠ Файл {file_path} не найден")
