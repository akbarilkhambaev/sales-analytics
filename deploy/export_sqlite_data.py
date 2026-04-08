# ============================================================
# Шаг 1: Экспорт данных из SQLite (запускать на Windows)
# ============================================================
# python deploy/export_sqlite_data.py

import subprocess
import sys
import os
from pathlib import Path

# Путь к manage.py
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
MANAGE = BACKEND_DIR / "manage.py"

# Ищем Python в venv
PYTHON_CANDIDATES = [
    BACKEND_DIR.parent / ".venv" / "Scripts" / "python.exe",
    BACKEND_DIR.parent / ".venv-1" / "Scripts" / "python.exe",
    BACKEND_DIR / "venv" / "Scripts" / "python.exe",
    sys.executable,
]

python_exe = None
for p in PYTHON_CANDIDATES:
    if Path(p).exists():
        python_exe = str(p)
        break

if not python_exe:
    print("❌ Python venv не найден. Укажите путь вручную.")
    sys.exit(1)

db_path = BACKEND_DIR / "database.db"
if not db_path.exists():
    print(f"❌ Файл database.db не найден: {db_path}")
    sys.exit(1)

output_file = Path(__file__).resolve().parent / "data_backup.json"

print(f"✅ Python: {python_exe}")
print(f"✅ SQLite: {db_path}")
print(f"📦 Экспорт данных в {output_file} ...")
print()

# Убеждаемся, что в окружении нет DB_NAME/DATABASE_URL (чтобы Django использовал SQLite)
env = os.environ.copy()
env.pop("DATABASE_URL", None)
env.pop("DB_NAME", None)
env.pop("DB_USER", None)
env.pop("DB_PASSWORD", None)

cmd = [
    python_exe, str(MANAGE), "dumpdata",
    "--natural-foreign",
    "--natural-primary",
    "--exclude", "contenttypes",
    "--exclude", "auth.permission",
    "--exclude", "admin.logentry",
    "--indent", "2",
    "--output", str(output_file),
]

result = subprocess.run(cmd, env=env, cwd=str(BACKEND_DIR))

if result.returncode == 0:
    size = output_file.stat().st_size / 1024
    print()
    print(f"✅ Готово! Экспортировано в: {output_file}")
    print(f"   Размер файла: {size:.1f} KB")
    print()
    print("Следующий шаг — скопировать этот файл на сервер:")
    print(f"  scp {output_file} user@ВАШ-СЕРВЕР:/var/www/sales-analytics/deploy/data_backup.json")
else:
    print("❌ Ошибка при экспорте данных.")
    sys.exit(1)
