"""
Тест Django API endpoints
"""
import requests
import json

BASE_URL = "http://localhost:8000/api/sales"

def test_warehouses():
    """Тест списка складов"""
    print("🏪 Testing /warehouses/...")
    response = requests.get(f"{BASE_URL}/warehouses/")
    warehouses = response.json()
    print(f"✅ Warehouses ({len(warehouses)}): {warehouses}")
    return warehouses

def test_regions():
    """Тест списка регионов"""
    print("\n🌍 Testing /regions/...")
    response = requests.get(f"{BASE_URL}/regions/")
    regions = response.json()
    print(f"✅ Regions ({len(regions)}): {regions}")
    return regions

def test_products_by_years(month="", warehouse="", region=""):
    """Тест данных по продуктам"""
    print(f"\n📊 Testing /products-by-years/ (month={month}, warehouse={warehouse}, region={region})...")
    params = {}
    if month:
        params['month'] = month
    if warehouse:
        params['warehouse'] = warehouse
    if region:
        params['region'] = region
    
    response = requests.get(f"{BASE_URL}/products-by-years/", params=params)
    products = response.json()
    print(f"✅ Products found: {len(products)}")
    if products:
        print(f"First product: {json.dumps(products[0], indent=2, ensure_ascii=False)}")
    return products

def test_groups_by_years(month="", warehouse="", region=""):
    """Тест данных по группам"""
    print(f"\n📦 Testing /groups-by-years/ (month={month}, warehouse={warehouse}, region={region})...")
    params = {}
    if month:
        params['month'] = month
    if warehouse:
        params['warehouse'] = warehouse
    if region:
        params['region'] = region
    
    response = requests.get(f"{BASE_URL}/groups-by-years/", params=params)
    groups = response.json()
    print(f"✅ Groups found: {len(groups)}")
    if groups:
        print(f"First group: {json.dumps(groups[0], indent=2, ensure_ascii=False)}")
    return groups

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 Testing Django API")
    print("=" * 60)
    
    # Тест базовых эндпоинтов
    warehouses = test_warehouses()
    regions = test_regions()
    
    # Тест с фильтрами
    if warehouses and regions:
        test_products_by_years(month="01", warehouse=warehouses[0])
        test_groups_by_years(region=regions[0])
    
    print("\n" + "=" * 60)
    print("✅ All tests completed!")
    print("=" * 60)
