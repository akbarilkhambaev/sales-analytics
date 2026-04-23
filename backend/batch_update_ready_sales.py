"""
Батчевое обновление КОД_ТОВАРА, ЦВЕТ, профиль_перечень, Группа_товара
в таблице ready_sales из tovary_mapping.
Работает порциями по 50k записей, показывает прогресс.
"""
import os, time, sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django; django.setup()
from django.db import connection

BATCH_SIZE = 50_000

with connection.cursor() as c:
    c.execute('SELECT COUNT(*) FROM ready_sales WHERE "КОД_ТОВАРА" IS NULL OR "КОД_ТОВАРА" = \'\'')
    total = c.fetchone()[0]
    print(f'Нужно обновить: {total:,} записей батчами по {BATCH_SIZE:,}')

    updated_total = 0
    batch = 0
    start = time.time()

    while True:
        t = time.time()
        c.execute(f'''
            UPDATE ready_sales rs
            SET
                "КОД_ТОВАРА"      = tm.kod_tovara,
                "ТОВАРЫ"           = tm.tovary,
                "ЦВЕТ"             = tm.cvet,
                "профиль_перечень" = tm.profil_perechen,
                "Группа_товара"    = COALESCE(NULLIF(rs."Группа_товара", ''), tm.gruppa_tovara)
            FROM (
                SELECT DISTINCT ON (tovary) tovary, kod_tovara, cvet, profil_perechen, gruppa_tovara
                FROM tovary_mapping
                ORDER BY tovary, id
            ) tm
            WHERE rs."Продукт" = tm.tovary
              AND (rs."КОД_ТОВАРА" IS NULL OR rs."КОД_ТОВАРА" = '')
            AND rs.id IN (
                SELECT id FROM ready_sales
                WHERE "КОД_ТОВАРА" IS NULL OR "КОД_ТОВАРА" = ''
                LIMIT {BATCH_SIZE}
            )
        ''')
        updated = c.rowcount
        connection.commit()

        if updated == 0:
            break

        updated_total += updated
        batch += 1
        elapsed = time.time() - start
        speed = updated_total / elapsed
        remaining = (total - updated_total) / speed if speed > 0 else 0
        print(f'Батч {batch}: +{updated:,} | Итого: {updated_total:,}/{total:,} | '
              f'{updated_total/total*100:.1f}% | ~{remaining:.0f}с осталось | '
              f'{time.time()-t:.1f}с/батч')
        sys.stdout.flush()

    print(f'\nГотово! Обновлено {updated_total:,} записей за {time.time()-start:.0f}с')

    # Остаток с NULL в маппинге (нет совпадения)
    c.execute('SELECT COUNT(*) FROM ready_sales WHERE "КОД_ТОВАРА" IS NULL OR "КОД_ТОВАРА" = \'\'')
    no_match = c.fetchone()[0]
    print(f'Не нашли в маппинге: {no_match:,} записей')
