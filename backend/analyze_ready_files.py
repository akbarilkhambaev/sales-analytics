"""Скрипт для анализа структуры файлов 2024-2025 ГОТОВЫЙ"""
import pandas as pd
import os
import django

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()


def analyze_excel_structure(file_path):
    """Анализ структуры Excel файла"""
    print(f"\n{'='*60}")
    print(f"Анализ файла: {file_path}")
    print(f"{'='*60}")
    
    # Читаем Excel файл
    df = pd.read_excel(file_path)
    
    print(f"\nКоличество строк: {len(df)}")
    print(f"Количество столбцов: {len(df.columns)}")
    
    print("\nНазвания столбцов:")
    for i, col in enumerate(df.columns, 1):
        print(f"{i}. {col}")
    
    print("\nТипы данных:")
    print(df.dtypes)
    
    print("\nПервые 5 строк:")
    print(df.head())
    
    print("\nИнформация о пропущенных значениях:")
    print(df.isnull().sum())
    
    return df


if __name__ == '__main__':
    # Анализ обоих файлов
    file_2024 = '2024 ГОТОВЫЙ.xlsx'
    file_2025 = '2025 ГОТОВЫЙ.xlsx'
    
    if os.path.exists(file_2024):
        df_2024 = analyze_excel_structure(file_2024)
    else:
        print(f"Файл {file_2024} не найден")
    
    if os.path.exists(file_2025):
        df_2025 = analyze_excel_structure(file_2025)
    else:
        print(f"Файл {file_2025} не найден")
    
    # Проверяем, одинаковая ли структура
    if os.path.exists(file_2024) and os.path.exists(file_2025):
        if list(df_2024.columns) == list(df_2025.columns):
            print("\n✓ Структура файлов идентична")
        else:
            print("\n⚠ Структура файлов различается!")
            print("Только в 2024:", set(df_2024.columns) - set(df_2025.columns))
            print("Только в 2025:", set(df_2025.columns) - set(df_2024.columns))
