import pandas as pd

df = pd.read_excel('перечень продукций.xlsx', skiprows=1, header=None, names=['tovar', 'profil'])

# Товары из скриншота
test_products = [
    '(A) Shtapik O (SW306G)',
    '(A) Shtapik O (SW306G) (N)',
    '(A) Shtapik O (SW306G) 6.5m',
    '(A) Shtapik O (SW306G) RETPEN (N)'
]

print('Проверка товаров из скриншота в Excel файле:\n')
for product in test_products:
    match = df[df['tovar'] == product]
    if not match.empty:
        profil = match.iloc[0]['profil']
        status = profil if pd.notna(profil) else 'ПУСТО'
        print(f'✓ {product}')
        print(f'  Профиль: {status}')
    else:
        print(f'✗ {product}')
        print(f'  НЕ НАЙДЕН в Excel')
    print()

print('='*70)
print('Общая статистика в Excel:')
print(f'Всего товаров: {len(df)}')
print(f'С заполненным профилем: {df["profil"].notna().sum()}')
print(f'С пустым профилем: {df["profil"].isna().sum()}')
