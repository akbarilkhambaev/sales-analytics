import pandas as pd

df = pd.read_excel('перечень продукций.xlsx', skiprows=1, header=None, names=['tovar', 'profil'])

filled = df['profil'].notna().sum()
empty = df['profil'].isna().sum()

print('Статистика обновленного Excel файла:')
print(f'  Всего товаров: {len(df):,}')
print(f'  С заполненным профилем: {filled:,}')
print(f'  С пустым профилем: {empty:,}')
print()
print(f'Изменение: +{filled - 3873:,} товаров')
