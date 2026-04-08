#!/bin/bash
# =============================================================================
#  benchmark_iops.sh — Проверка IOPS и скорости диска сервера
#  Запускать на сервере ПЕРЕД деплоем: bash deploy/benchmark_iops.sh
#  Время выполнения: ~2-3 минуты
# =============================================================================

TESTDIR="/tmp/iops_test"
TESTFILE="$TESTDIR/testfile"

mkdir -p "$TESTDIR"

echo "========================================================"
echo "  Тест IOPS и скорости диска"
echo "  Сервер: $(hostname)"
echo "  Дата:   $(date)"
echo "========================================================"
echo ""

# ─── Минимальные требования для PostgreSQL ───────────────────────────────────
# Random Read  IOPS: >= 1000
# Random Write IOPS: >= 500
# Sequential Read:   >= 100 MB/s
# Sequential Write:  >= 50  MB/s

# ─── 1. Быстрый тест через dd (без установки доп. пакетов) ───────────────────

echo "── 1. Sequential WRITE (dd) ─────────────────────────────"
WRITE_RESULT=$(dd if=/dev/zero of="$TESTFILE" bs=1M count=512 conv=fdatasync 2>&1)
echo "$WRITE_RESULT"
echo ""

echo "── 2. Sequential READ (dd) ──────────────────────────────"
sync; echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true
READ_RESULT=$(dd if="$TESTFILE" of=/dev/null bs=1M 2>&1)
echo "$READ_RESULT"
echo ""

# ─── 2. Тест с fio (если установлен) ─────────────────────────────────────────
if command -v fio &>/dev/null; then
    echo "── 3. Random READ IOPS (fio 4K) ─────────────────────────"
    fio --name=rand_read \
        --filename="$TESTFILE" \
        --rw=randread \
        --bs=4K \
        --numjobs=4 \
        --iodepth=32 \
        --runtime=15 \
        --time_based \
        --size=256M \
        --output-format=normal \
        --group_reporting 2>&1 | grep -E "IOPS|read|bw"
    echo ""

    echo "── 4. Random WRITE IOPS (fio 4K) ────────────────────────"
    fio --name=rand_write \
        --filename="$TESTFILE" \
        --rw=randwrite \
        --bs=4K \
        --numjobs=4 \
        --iodepth=32 \
        --runtime=15 \
        --time_based \
        --size=256M \
        --output-format=normal \
        --group_reporting 2>&1 | grep -E "IOPS|write|bw"
    echo ""
else
    echo "── fio не установлен. Установить для точного IOPS теста:"
    echo "   apt install fio"
    echo ""
fi

# ─── 3. Проверка места на диске ──────────────────────────────────────────────
echo "── 5. Место на диске ─────────────────────────────────────"
df -h / | tail -1 | awk '{
    print "Всего:     " $2
    print "Занято:    " $3 " (" $5 ")"
    print "Свободно:  " $4
}'
echo ""

# ─── 4. Характеристики диска ─────────────────────────────────────────────────
echo "── 6. Тип диска ──────────────────────────────────────────"
for disk in $(lsblk -d -n -o NAME | grep -v loop); do
    ROTATIONAL=$(cat /sys/block/$disk/queue/rotational 2>/dev/null)
    if [ "$ROTATIONAL" = "0" ]; then
        echo "$disk: SSD (rotational=0) ✅"
    elif [ "$ROTATIONAL" = "1" ]; then
        echo "$disk: HDD (rotational=1) ⚠️"
    else
        echo "$disk: неизвестно"
    fi
done
echo ""

# ─── Итог ────────────────────────────────────────────────────────────────────
echo "========================================================"
echo "  Минимальные требования для PostgreSQL:"
echo "  Sequential Write:  >= 50  MB/s"
echo "  Sequential Read:   >= 100 MB/s"
echo "  Random Write IOPS: >= 500  (4K блоки)"
echo "  Random Read  IOPS: >= 1000 (4K блоки)"
echo ""
echo "  Для вашего облачного VPS (SSD) обычно:"
echo "  Sequential: 200-500 MB/s ✅"
echo "  Random IOPS: 3000-10000  ✅"
echo "========================================================"

# Чистим тестовый файл
rm -rf "$TESTDIR"
