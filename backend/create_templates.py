"""
Скрипт для создания шаблонов Excel файлов для загрузки в AKFA SALES VISION
"""

import pandas as pd
from datetime import datetime

def create_sales_template():
    """Создает шаблон для Sales (основные продажи)"""
    
    # Данные с примерами
    data = {
        'КОД_ТОВАРА': ['BKT-70', 'BKT-57', 'ALDOKS NEO'],
        'ГРУППА_ТОВАРА': ['Профили', 'Профили', 'Профили'],
        'РЕГИОН': ['Ташкент', 'Самарканд', 'Андижан'],
        'СКЛАД': ['Юнусабад', 'Центральный', 'Главный'],
        'СЧЕТЫ': ['001', '002', '003'],
        'Дата': ['2025-01-15', '2025-01-16', '2025-01-17'],
        'ДОПОЛН__КОЛ-ВО': [1250.5, 890.3, 2150.0],
        'ТОВАРЫ': ['ALDOKS NEO', 'BKT-57', 'ALDOKS NEO'],
        'ЦВЕТ': ['Белый', 'Коричневый', 'Серебристый'],
        'профиль_перечень': ['Оконный профиль', 'Дверной профиль', 'Оконный профиль']
    }
    
    df = pd.DataFrame(data)
    
    # Сохраняем
    filename = 'Шаблон_Sales.xlsx'
    df.to_excel(filename, index=False, sheet_name='Sales')
    print(f'✅ Создан шаблон: {filename}')
    print(f'   Обязательные колонки: КОД_ТОВАРА, Дата')
    print(f'   Строк с примерами: {len(df)}')
    return filename


def create_ready_sales_template():
    """Создает шаблон для Ready Sales (продажи с клиентами)"""
    
    # Данные с примерами
    data = {
        'Дата': [datetime(2025, 1, 15).date(), datetime(2025, 1, 16).date(), datetime(2025, 1, 17).date()],
        'Дилер': ['Дилер Ташкент', 'Дилер Самарканд', 'Дилер Андижан'],
        'Клиент_ИД': [1001.0, 1002.0, 1003.0],
        'Клиент': ['Илхом ака (+998 91 470 4070)', 'Муххи косон (+998 91 322 7393)', 'Алишер ака (+998 97 387 4440)'],
        'Инвоиcе_CИД': [100001, 100002, 100003],
        'Тип': ['Оптовая', 'Розничная', 'Оптовая'],
        'Тип_организации': ['ООО', 'ИП', 'ООО'],
        'Продукт': ['Профили оконные', 'Профили дверные', 'Профили оконные'],
        'Группа_продуктов': ['Профили', 'Профили', 'Профили'],
        'Количество': [100.0, 50.0, 150.0],
        'Вес_кг': [9918.78, 8110.57, 12500.00],
        'Общая_сумма': [45000000.0, 32000000.0, 55000000.0],
        'Доход': [5000000.0, 3500000.0, 6000000.0],
        'Валюта': ['UZS', 'UZS', 'UZS'],
        'ТОВАРЫ': ['ALDOKS NEO', 'BKT-57', 'ALDOKS NEO']
    }
    
    df = pd.DataFrame(data)
    
    # Сохраняем
    filename = 'Шаблон_Ready_Sales.xlsx'
    df.to_excel(filename, index=False, sheet_name='Ready Sales')
    print(f'✅ Создан шаблон: {filename}')
    print(f'   Обязательные колонки: Дата, Клиент')
    print(f'   Строк с примерами: {len(df)}')
    return filename


def create_empty_sales_template():
    """Создает пустой шаблон для Sales (только заголовки)"""
    
    columns = [
        'КОД_ТОВАРА',
        'ГРУППА_ТОВАРА',
        'РЕГИОН',
        'СКЛАД',
        'СЧЕТЫ',
        'Дата',
        'ДОПОЛН__КОЛ-ВО',
        'ТОВАРЫ',
        'ЦВЕТ',
        'профиль_перечень'
    ]
    
    df = pd.DataFrame(columns=columns)
    
    filename = 'Шаблон_Sales_пустой.xlsx'
    df.to_excel(filename, index=False, sheet_name='Sales')
    print(f'✅ Создан пустой шаблон: {filename}')
    return filename


def create_empty_ready_sales_template():
    """Создает пустой шаблон для Ready Sales (только заголовки)"""
    
    columns = [
        'Дата',
        'Дилер',
        'Клиент_ИД',
        'Клиент',
        'Инвоиcе_CИД',
        'Тип',
        'Тип_организации',
        'Продукт',
        'Группа_продуктов',
        'Количество',
        'Вес_кг',
        'Общая_сумма',
        'Доход',
        'Валюта',
        'ТОВАРЫ'
    ]
    
    df = pd.DataFrame(columns=columns)
    
    filename = 'Шаблон_Ready_Sales_пустой.xlsx'
    df.to_excel(filename, index=False, sheet_name='Ready Sales')
    print(f'✅ Создан пустой шаблон: {filename}')
    return filename


def main():
    """Создает все шаблоны"""
    print('=' * 60)
    print('📋 СОЗДАНИЕ ШАБЛОНОВ EXCEL ДЛЯ AKFA SALES VISION')
    print('=' * 60)
    print()
    
    print('📝 Создание шаблонов с примерами данных...')
    print()
    create_sales_template()
    print()
    create_ready_sales_template()
    print()
    
    print('-' * 60)
    print()
    print('📄 Создание пустых шаблонов (только заголовки)...')
    print()
    create_empty_sales_template()
    print()
    create_empty_ready_sales_template()
    print()
    
    print('=' * 60)
    print('✅ ВСЕ ШАБЛОНЫ УСПЕШНО СОЗДАНЫ!')
    print('=' * 60)
    print()
    print('📁 Созданные файлы:')
    print('   1. Шаблон_Sales.xlsx                - Sales с примерами')
    print('   2. Шаблон_Ready_Sales.xlsx          - Ready Sales с примерами')
    print('   3. Шаблон_Sales_пустой.xlsx         - Sales пустой')
    print('   4. Шаблон_Ready_Sales_пустой.xlsx   - Ready Sales пустой')
    print()
    print('💡 Инструкция:')
    print('   1. Выберите нужный шаблон')
    print('   2. Заполните его своими данными')
    print('   3. Сохраните файл')
    print('   4. Загрузите через http://localhost:3000/admin')
    print()
    print('⚠️  ВАЖНО:')
    print('   - НЕ изменяйте названия колонок!')
    print('   - Обязательные колонки должны быть заполнены')
    print('   - Для Sales: КОД_ТОВАРА, Дата')
    print('   - Для Ready Sales: Дата, Клиент')
    print()


if __name__ == '__main__':
    main()
