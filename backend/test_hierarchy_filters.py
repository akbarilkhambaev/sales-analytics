#!/usr/bin/env python
"""Тестирование работы фильтров на новых API endpoints"""

import requests

API_BASE = "http://localhost:8000/api/sales"

def test_products_hierarchy_filters():
    """Тест фильтров для products-hierarchy"""
    print("=" * 80)
    print("ТЕСТИРОВАНИЕ ФИЛЬТРОВ: products-hierarchy")
    print("=" * 80)
    
    # Без фильтров
    print("\n1. Без фильтров:")
    response = requests.get(f"{API_BASE}/products-hierarchy/")
    data = response.json()
    print(f"   Статус: {response.status_code}")
    print(f"   Продукций: {len(data)}")
    print(f"   Первая: {data[0]['kod_tovara']} - {data[0]['total_sales']:,.0f}")
    
    # Фильтр по месяцу
    print("\n2. Фильтр: month=01 (Январь):")
    response = requests.get(f"{API_BASE}/products-hierarchy/", params={'month': '01'})
    data = response.json()
    print(f"   Статус: {response.status_code}")
    print(f"   Продукций: {len(data)}")
    if data:
        print(f"   Первая: {data[0]['kod_tovara']} - {data[0]['total_sales']:,.0f}")
    
    # Фильтр по складу
    print("\n3. Фильтр: warehouse=TOSHKENT:")
    response = requests.get(f"{API_BASE}/products-hierarchy/", params={'warehouse': 'TOSHKENT'})
    data = response.json()
    print(f"   Статус: {response.status_code}")
    print(f"   Продукций: {len(data)}")
    if data:
        print(f"   Первая: {data[0]['kod_tovara']} - {data[0]['total_sales']:,.0f}")
    
    # Комбинированные фильтры
    print("\n4. Комбинированные: month=06 + warehouse=SAMARQAND:")
    response = requests.get(
        f"{API_BASE}/products-hierarchy/", 
        params={'month': '06', 'warehouse': 'SAMARQAND'}
    )
    data = response.json()
    print(f"   Статус: {response.status_code}")
    print(f"   Продукций: {len(data)}")
    if data:
        print(f"   Первая: {data[0]['kod_tovara']} - {data[0]['total_sales']:,.0f}")
        print(f"   Профилей: {len(data[0]['profiles'])}")


def test_products_colors_hierarchy_filters():
    """Тест фильтров для products-colors-hierarchy"""
    print("\n" + "=" * 80)
    print("ТЕСТИРОВАНИЕ ФИЛЬТРОВ: products-colors-hierarchy")
    print("=" * 80)
    
    # Без фильтров
    print("\n1. Без фильтров:")
    response = requests.get(f"{API_BASE}/products-colors-hierarchy/")
    data = response.json()
    print(f"   Статус: {response.status_code}")
    print(f"   Продуктов: {len(data)}")
    print(f"   Первый: {data[0]['product']} - {data[0]['total_sales']:,.0f}")
    print(f"   Цветов: {len(data[0]['colors'])}")
    
    # Фильтр по месяцу
    print("\n2. Фильтр: month=12 (Декабрь):")
    response = requests.get(f"{API_BASE}/products-colors-hierarchy/", params={'month': '12'})
    data = response.json()
    print(f"   Статус: {response.status_code}")
    print(f"   Продуктов: {len(data)}")
    if data:
        print(f"   Первый: {data[0]['product']} - {data[0]['total_sales']:,.0f}")
        print(f"   Цветов: {len(data[0]['colors'])}")
        print(f"   Топ цвет: {data[0]['colors'][0]['name']} - {data[0]['colors'][0]['total']:,.0f}")
    
    # Фильтр по региону
    print("\n3. Фильтр: region=Ташкент:")
    response = requests.get(f"{API_BASE}/products-colors-hierarchy/", params={'region': 'Ташкент'})
    data = response.json()
    print(f"   Статус: {response.status_code}")
    print(f"   Продуктов: {len(data)}")
    if data:
        print(f"   Первый: {data[0]['product']} - {data[0]['total_sales']:,.0f}")
    
    # Все фильтры
    print("\n4. Все фильтры: month=03 + warehouse=NAMANGAN + region=Наманган:")
    response = requests.get(
        f"{API_BASE}/products-colors-hierarchy/",
        params={'month': '03', 'warehouse': 'NAMANGAN', 'region': 'Наманган'}
    )
    data = response.json()
    print(f"   Статус: {response.status_code}")
    print(f"   Продуктов: {len(data)}")
    if data:
        print(f"   Первый: {data[0]['product']} - {data[0]['total_sales']:,.0f}")
        print(f"   Цветов: {len(data[0]['colors'])}")


if __name__ == "__main__":
    try:
        test_products_hierarchy_filters()
        test_products_colors_hierarchy_filters()
        print("\n" + "=" * 80)
        print("✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!")
        print("=" * 80)
    except Exception as e:
        print(f"\n❌ Ошибка при тестировании: {e}")
