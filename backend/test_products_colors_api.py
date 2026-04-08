#!/usr/bin/env python
"""Тестирование API endpoint products-colors-hierarchy"""

import requests
import json

API_URL = "http://localhost:8000/api/sales/products-colors-hierarchy/"

try:
    print(f"Запрос к: {API_URL}\n")
    response = requests.get(API_URL)
    
    print(f"Статус: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        
        print(f"\nВсего продуктов: {len(data)}")
        
        # Статистика
        total_colors = sum(len(p['colors']) for p in data)
        total_volume = sum(p['total_sales'] for p in data)
        
        print(f"Всего цветов (уникальных по продуктам): {total_colors}")
        print(f"Общий объём продаж: {total_volume:,.0f}")
        
        # Топ-5 продуктов
        print("\n" + "="*80)
        print("ТОП-5 ПРОДУКТОВ ПО ОБЪЁМУ:")
        print("="*80)
        
        for i, product in enumerate(data[:5], 1):
            print(f"\n{i}. {product['product']}")
            print(f"   Общий объём: {product['total_sales']:,.0f}")
            print(f"   Количество цветов: {len(product['colors'])}")
            
            # Топ-3 цвета для этого продукта
            print("   Топ-3 цвета:")
            for j, color in enumerate(product['colors'][:3], 1):
                print(f"      {j}. {color['name']}: {color['total']:,.0f}")

        # Проверка структуры данных (первый продукт)
        print("\n" + "="*80)
        print("СТРУКТУРА ДАННЫХ (первый продукт):")
        print("="*80)
        
        if data:
            first_product = data[0]
            print(f"\nПродукт: {first_product['product']}")
            print(f"Ключи: {list(first_product.keys())}")
            
            if first_product['colors']:
                first_color = first_product['colors'][0]
                print(f"\nПервый цвет: {first_color['name']}")
                print(f"Ключи цвета: {list(first_color.keys())}")
                print(f"Года: {list(first_color['years'].keys())}")
                print(f"Growth: {first_color['growth']}")
        
        print("\n✅ API работает корректно!")
        
    else:
        print(f"❌ Ошибка: {response.status_code}")
        print(response.text)
        
except Exception as e:
    print(f"❌ Ошибка при запросе: {e}")
