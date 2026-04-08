import pandas as pd

# Читаем Excel файл
file_path = 'уникальные_товары.xlsx'
df = pd.read_excel(file_path)

print(f"Файл: {file_path}")
print(f"Всего строк: {len(df)}")
print(f"\nКолонки в файле:")
for i, col in enumerate(df.columns, 1):
    print(f"  {i}. {col}")

print(f"\nПервые 5 строк:")
print(df.head())

print(f"\nИнформация о данных:")
print(df.info())

# Проверяем, есть ли пустые значения в новых колонках (если они есть)
if len(df.columns) > 1:
    print(f"\nПроверка заполненности:")
    for col in df.columns:
        null_count = df[col].isnull().sum()
        filled_count = len(df) - null_count
        print(f"  {col}: заполнено {filled_count} из {len(df)} ({filled_count/len(df)*100:.1f}%)")
