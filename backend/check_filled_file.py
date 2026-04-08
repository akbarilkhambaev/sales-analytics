import pandas as pd

# Проверяем файл с заполненными товарами
df = pd.read_excel('товары_без_профиля.xlsx')

filled = df['ПЕРЕЧЕНЬ_ПРОФИЛЬ'].notna().sum()
non_empty = (df['ПЕРЕЧЕНЬ_ПРОФИЛЬ'] != '').sum()
empty = (df['ПЕРЕЧЕНЬ_ПРОФИЛЬ'].isna() | (df['ПЕРЕЧЕНЬ_ПРОФИЛЬ'] == '')).sum()

print('Файл товары_без_профиля.xlsx:')
print(f'  Всего товаров: {len(df):,}')
print(f'  Заполнено (не пусто): {non_empty:,}')
print(f'  Пустых: {empty:,}')
print()

if non_empty > 0:
    print('✓ Найдены заполненные профили!')
    print()
    print('Первые 10 заполненных записей:')
    filled_df = df[df['ПЕРЕЧЕНЬ_ПРОФИЛЬ'].notna() & (df['ПЕРЕЧЕНЬ_ПРОФИЛЬ'] != '')]
    for idx, row in filled_df.head(10).iterrows():
        print(f'  {row["ТОВАРЫ"]}: {row["ПЕРЕЧЕНЬ_ПРОФИЛЬ"]}')
else:
    print('⚠ Профили не заполнены в файле товары_без_профиля.xlsx')
