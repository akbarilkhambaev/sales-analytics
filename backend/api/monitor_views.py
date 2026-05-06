"""
Server monitoring view — SUPER_ADMIN only
"""
import os
import time
import subprocess

import psutil
from django.db import connection
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from authentication.permissions import IsSuperAdmin


def _bytes_to_mb(b):
    return round(b / 1024 / 1024, 1)


def _bytes_to_gb(b):
    return round(b / 1024 / 1024 / 1024, 2)


def _get_service_status(name):
    try:
        result = subprocess.run(
            ['systemctl', 'is-active', name],
            capture_output=True, text=True, timeout=3
        )
        return result.stdout.strip()
    except Exception:
        return 'unknown'


def _get_migrations():
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT app, name, applied
                FROM django_migrations
                ORDER BY applied DESC
                LIMIT 10
            """)
            rows = cursor.fetchall()
            return [
                {'app': r[0], 'name': r[1], 'applied': r[2].isoformat() if r[2] else None}
                for r in rows
            ]
    except Exception:
        return []


def _get_db_stats():
    try:
        with connection.cursor() as cursor:
            # DB size
            cursor.execute("SELECT pg_size_pretty(pg_database_size(current_database()))")
            db_size = cursor.fetchone()[0]

            # DB size in bytes
            cursor.execute("SELECT pg_database_size(current_database())")
            db_size_bytes = cursor.fetchone()[0]

            # Connection count
            cursor.execute("SELECT count(*) FROM pg_stat_activity")
            conn_count = cursor.fetchone()[0]

            # Active queries
            cursor.execute("""
                SELECT count(*) FROM pg_stat_activity
                WHERE state = 'active' AND query NOT ILIKE '%pg_stat_activity%'
            """)
            active_queries = cursor.fetchone()[0]

            # PostgreSQL version
            cursor.execute("SELECT version()")
            pg_version = cursor.fetchone()[0].split(' ')[0] + ' ' + cursor.fetchone()[0].split(' ')[1] if False else cursor.fetchone()[0]

        with connection.cursor() as cursor:
            cursor.execute("SELECT version()")
            pg_version_raw = cursor.fetchone()[0]
            # Extract just "PostgreSQL 14.22"
            parts = pg_version_raw.split(',')[0]

        return {
            'size': db_size,
            'size_mb': _bytes_to_mb(db_size_bytes),
            'connections': conn_count,
            'active_queries': active_queries,
            'version': parts,
        }
    except Exception as e:
        return {'error': str(e)}


def _get_slow_queries():
    try:
        with connection.cursor() as cursor:
            # Check if pg_stat_statements is available
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
                )
            """)
            has_pgss = cursor.fetchone()[0]

            if has_pgss:
                cursor.execute("""
                    SELECT
                        LEFT(query, 100) as query,
                        round(mean_exec_time::numeric, 2) as mean_ms,
                        calls,
                        round(total_exec_time::numeric, 2) as total_ms
                    FROM pg_stat_statements
                    WHERE query NOT ILIKE '%pg_stat%'
                      AND query NOT ILIKE '%SET %'
                    ORDER BY mean_exec_time DESC
                    LIMIT 10
                """)
                rows = cursor.fetchall()
                return {
                    'source': 'pg_stat_statements',
                    'queries': [
                        {
                            'query': r[0],
                            'mean_ms': float(r[1]),
                            'calls': r[2],
                            'total_ms': float(r[3]),
                        }
                        for r in rows
                    ]
                }
            else:
                # fallback: current long-running queries
                cursor.execute("""
                    SELECT
                        LEFT(query, 100),
                        state,
                        EXTRACT(EPOCH FROM (now() - query_start))::int as duration_sec
                    FROM pg_stat_activity
                    WHERE state = 'active'
                      AND query NOT ILIKE '%pg_stat_activity%'
                    ORDER BY query_start ASC
                    LIMIT 10
                """)
                rows = cursor.fetchall()
                return {
                    'source': 'pg_stat_activity',
                    'queries': [
                        {'query': r[0], 'state': r[1], 'duration_sec': r[2]}
                        for r in rows
                    ]
                }
    except Exception as e:
        return {'source': 'error', 'queries': [], 'error': str(e)}


def _get_frequent_queries():
    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
                )
            """)
            has_pgss = cursor.fetchone()[0]

            if not has_pgss:
                return []

            cursor.execute("""
                SELECT
                    LEFT(query, 100) as query,
                    calls,
                    round(mean_exec_time::numeric, 2) as mean_ms,
                    round(total_exec_time::numeric, 2) as total_ms
                FROM pg_stat_statements
                WHERE query NOT ILIKE '%pg_stat%'
                  AND query NOT ILIKE '%SET %'
                ORDER BY calls DESC
                LIMIT 10
            """)
            rows = cursor.fetchall()
            return [
                {
                    'query': r[0],
                    'calls': r[1],
                    'mean_ms': float(r[2]),
                    'total_ms': float(r[3]),
                }
                for r in rows
            ]
    except Exception:
        return []


class ServerMonitorView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request):
        # CPU
        cpu_percent = psutil.cpu_percent(interval=0.5)
        cpu_count = psutil.cpu_count()
        load_avg = os.getloadavg()  # 1, 5, 15 min

        # Memory
        mem = psutil.virtual_memory()
        swap = psutil.swap_memory()

        # Disk
        disk = psutil.disk_usage('/')

        # Network (bytes since boot)
        net = psutil.net_io_counters()

        # Uptime
        boot_time = psutil.boot_time()
        uptime_seconds = int(time.time() - boot_time)
        uptime_str = str(timezone.timedelta(seconds=uptime_seconds))

        # Process (gunicorn / django)
        node_version = None
        try:
            result = subprocess.run(['node', '--version'], capture_output=True, text=True, timeout=3)
            node_version = result.stdout.strip()
        except Exception:
            pass

        # Services
        services = {
            'gunicorn': _get_service_status('sales-gunicorn'),
            'nextjs': _get_service_status('sales-nextjs'),
            'nginx': _get_service_status('nginx'),
        }

        # DB
        db_stats = _get_db_stats()
        migrations = _get_migrations()
        slow_queries = _get_slow_queries()
        frequent_queries = _get_frequent_queries()

        return Response({
            'timestamp': timezone.now().isoformat(),
            'uptime': uptime_str,
            'uptime_seconds': uptime_seconds,
            'cpu': {
                'percent': cpu_percent,
                'count': cpu_count,
                'load_avg_1': round(load_avg[0], 2),
                'load_avg_5': round(load_avg[1], 2),
                'load_avg_15': round(load_avg[2], 2),
            },
            'memory': {
                'total_mb': _bytes_to_mb(mem.total),
                'used_mb': _bytes_to_mb(mem.used),
                'available_mb': _bytes_to_mb(mem.available),
                'percent': mem.percent,
                'swap_total_mb': _bytes_to_mb(swap.total),
                'swap_used_mb': _bytes_to_mb(swap.used),
                'swap_percent': swap.percent,
            },
            'disk': {
                'total_gb': _bytes_to_gb(disk.total),
                'used_gb': _bytes_to_gb(disk.used),
                'free_gb': _bytes_to_gb(disk.free),
                'percent': disk.percent,
            },
            'network': {
                'bytes_sent_mb': _bytes_to_mb(net.bytes_sent),
                'bytes_recv_mb': _bytes_to_mb(net.bytes_recv),
            },
            'services': services,
            'node_version': node_version,
            'database': db_stats,
            'migrations': migrations,
            'slow_queries': slow_queries,
            'frequent_queries': frequent_queries,
        })
