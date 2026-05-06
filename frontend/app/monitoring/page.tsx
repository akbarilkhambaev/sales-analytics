'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Database,
  Activity,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Network,
  Server,
  GitBranch,
  Zap,
  BarChart2,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import type { ServerMonitorData } from '@/lib/types';

function ProgressBar({ value, color = 'blue' }: { value: number; color?: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    purple: 'bg-purple-500',
  };
  const barColor =
    value > 85 ? colors.red :
    value > 65 ? colors.orange :
    colors[color] ?? colors.blue;

  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={`${barColor} h-2 rounded-full transition-all duration-500`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

function StatCard({ title, icon: Icon, children, accent = 'blue' }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  accent?: string;
}) {
  const accents: Record<string, string> = {
    blue: 'border-blue-200 bg-blue-50',
    green: 'border-green-200 bg-green-50',
    purple: 'border-purple-200 bg-purple-50',
    orange: 'border-orange-200 bg-orange-50',
    cyan: 'border-cyan-200 bg-cyan-50',
    rose: 'border-rose-200 bg-rose-50',
  };
  const iconColors: Record<string, string> = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
    cyan: 'text-cyan-600',
    rose: 'text-rose-600',
  };
  return (
    <div className={`bg-white rounded-xl shadow-sm border p-5 ${accents[accent] ?? accents.blue}`}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`w-5 h-5 ${iconColors[accent] ?? iconColors.blue}`} />
        <h3 className="font-semibold text-gray-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ServiceBadge({ name, status }: { name: string; status: string }) {
  const ok = status === 'active';
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-700 font-medium">{name}</span>
      <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
        {status}
      </span>
    </div>
  );
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d > 0) parts.push(`${d}д`);
  if (h > 0) parts.push(`${h}ч`);
  parts.push(`${m}мин`);
  return parts.join(' ');
}

export default function MonitoringPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<ServerMonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || user?.role !== 'SUPER_ADMIN') {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, user, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.getServerMonitor();
      setData(result);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (user.role !== 'SUPER_ADMIN') return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg">
        <div className="container mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-7 h-7 text-green-400" />
            <div>
              <h1 className="text-2xl font-bold">Мониторинг платформы</h1>
              {lastRefresh && (
                <p className="text-slate-400 text-xs mt-0.5">
                  Обновлено: {lastRefresh.toLocaleTimeString('ru-RU')} · Следующее через{' '}
                  {autoRefresh ? '30с' : '—'}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 accent-green-400"
              />
              Авто 30с
            </label>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-400 rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <XCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
              <p className="text-gray-500">Загрузка данных...</p>
            </div>
          </div>
        )}

        {data && (
          <>
            {/* Top Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
                <Clock className="w-8 h-8 text-indigo-500 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Uptime</p>
                  <p className="font-bold text-gray-900 text-sm">{formatUptime(data.uptime_seconds)}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
                <Cpu className="w-8 h-8 text-blue-500 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">CPU</p>
                  <p className={`font-bold text-sm ${data.cpu.percent > 80 ? 'text-red-600' : 'text-gray-900'}`}>
                    {data.cpu.percent}%
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
                <MemoryStick className="w-8 h-8 text-purple-500 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">RAM</p>
                  <p className={`font-bold text-sm ${data.memory.percent > 85 ? 'text-red-600' : 'text-gray-900'}`}>
                    {data.memory.percent}%
                  </p>
                  <p className="text-xs text-gray-400">{data.memory.used_mb} / {data.memory.total_mb} MB</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
                <HardDrive className="w-8 h-8 text-orange-500 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Диск /</p>
                  <p className={`font-bold text-sm ${data.disk.percent > 85 ? 'text-red-600' : 'text-gray-900'}`}>
                    {data.disk.percent}%
                  </p>
                  <p className="text-xs text-gray-400">{data.disk.used_gb} / {data.disk.total_gb} GB</p>
                </div>
              </div>
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left column */}
              <div className="lg:col-span-2 space-y-6">

                {/* CPU */}
                <StatCard title="Ресурсы сервера" icon={Server} accent="blue">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">CPU {data.cpu.count} ядер · {data.cpu.percent}%</p>
                      <ProgressBar value={data.cpu.percent} color="blue" />
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>Load: <span className="font-mono font-semibold">{data.cpu.load_avg_1} / {data.cpu.load_avg_5} / {data.cpu.load_avg_15}</span></p>
                      <p className="text-gray-400">(1мин / 5мин / 15мин)</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        RAM {data.memory.used_mb} MB / {data.memory.total_mb} MB · {data.memory.percent}%
                      </p>
                      <ProgressBar value={data.memory.percent} color="purple" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        SWAP {data.memory.swap_used_mb} MB / {data.memory.swap_total_mb} MB · {data.memory.swap_percent}%
                      </p>
                      <ProgressBar value={data.memory.swap_percent} color="orange" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        Диск {data.disk.used_gb} GB / {data.disk.total_gb} GB · {data.disk.percent}%
                      </p>
                      <ProgressBar value={data.disk.percent} color="orange" />
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>Свободно: <span className="font-semibold">{data.disk.free_gb} GB</span></p>
                      {data.node_version && <p>Node.js: <span className="font-mono">{data.node_version}</span></p>}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-xs text-gray-500 border-t border-gray-100 pt-3">
                    <span className="flex items-center gap-1">
                      <Network className="w-3 h-3" />
                      Отправлено: <strong>{data.network.bytes_sent_mb} MB</strong>
                    </span>
                    <span>Получено: <strong>{data.network.bytes_recv_mb} MB</strong></span>
                  </div>
                </StatCard>

                {/* Database */}
                <StatCard title="База данных" icon={Database} accent="cyan">
                  {data.database.error ? (
                    <p className="text-red-500 text-sm">{data.database.error}</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-gray-400">Версия</p>
                        <p className="font-semibold text-gray-800">{data.database.version?.split(' ').slice(0, 2).join(' ')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Размер БД</p>
                        <p className="font-semibold text-gray-800">{data.database.size} <span className="text-gray-400 text-xs">({data.database.size_mb} MB)</span></p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Соединения</p>
                        <p className="font-semibold text-gray-800">{data.database.connections}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Активных запросов</p>
                        <p className={`font-semibold ${data.database.active_queries > 5 ? 'text-orange-600' : 'text-gray-800'}`}>
                          {data.database.active_queries}
                        </p>
                      </div>
                    </div>
                  )}
                </StatCard>

                {/* Slow Queries */}
                {data.slow_queries.queries.length > 0 && (
                  <StatCard title={`Самые медленные запросы (${data.slow_queries.source})`} icon={Zap} accent="rose">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-400 border-b border-gray-100">
                            <th className="text-left py-1 pr-3 font-medium">SQL</th>
                            {data.slow_queries.source === 'pg_stat_statements' && (
                              <>
                                <th className="text-right py-1 px-2 font-medium whitespace-nowrap">Среднее</th>
                                <th className="text-right py-1 px-2 font-medium">Вызовы</th>
                                <th className="text-right py-1 font-medium">Всего</th>
                              </>
                            )}
                            {data.slow_queries.source === 'pg_stat_activity' && (
                              <th className="text-right py-1 px-2 font-medium">Время (сек)</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {data.slow_queries.queries.map((q, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="py-1.5 pr-3 font-mono text-gray-700 max-w-xs">
                                <span title={q.query} className="block truncate">{q.query}</span>
                              </td>
                              {data.slow_queries.source === 'pg_stat_statements' && (
                                <>
                                  <td className="text-right py-1.5 px-2 font-semibold text-rose-600 whitespace-nowrap">{q.mean_ms?.toFixed(2)} мс</td>
                                  <td className="text-right py-1.5 px-2 text-gray-600">{q.calls}</td>
                                  <td className="text-right py-1.5 text-gray-500 whitespace-nowrap">{q.total_ms?.toFixed(0)} мс</td>
                                </>
                              )}
                              {data.slow_queries.source === 'pg_stat_activity' && (
                                <td className="text-right py-1.5 px-2 font-semibold text-orange-600">{q.duration_sec}с</td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </StatCard>
                )}

                {/* Frequent Queries */}
                {data.frequent_queries.length > 0 && (
                  <StatCard title="Самые частые запросы" icon={BarChart2} accent="purple">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-400 border-b border-gray-100">
                            <th className="text-left py-1 pr-3 font-medium">SQL</th>
                            <th className="text-right py-1 px-2 font-medium">Вызовы</th>
                            <th className="text-right py-1 px-2 font-medium">Среднее</th>
                            <th className="text-right py-1 font-medium">Всего</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {data.frequent_queries.map((q, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="py-1.5 pr-3 font-mono text-gray-700 max-w-xs">
                                <span title={q.query} className="block truncate">{q.query}</span>
                              </td>
                              <td className="text-right py-1.5 px-2 font-bold text-purple-600">{q.calls.toLocaleString()}</td>
                              <td className="text-right py-1.5 px-2 text-gray-600">{q.mean_ms.toFixed(2)} мс</td>
                              <td className="text-right py-1.5 text-gray-500">{q.total_ms.toFixed(0)} мс</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </StatCard>
                )}
              </div>

              {/* Right column */}
              <div className="space-y-6">
                {/* Services */}
                <StatCard title="Сервисы" icon={Activity} accent="green">
                  <ServiceBadge name="Django / Gunicorn" status={data.services.gunicorn} />
                  <ServiceBadge name="Next.js" status={data.services.nextjs} />
                  <ServiceBadge name="Nginx" status={data.services.nginx} />
                </StatCard>

                {/* Migrations */}
                <StatCard title="Последние миграции" icon={GitBranch} accent="orange">
                  <div className="space-y-2">
                    {data.migrations.map((m, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs border-b border-gray-100 pb-2 last:border-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-gray-700">{m.app}</p>
                          <p className="text-gray-500 font-mono">{m.name}</p>
                          {m.applied && (
                            <p className="text-gray-400">
                              {new Date(m.applied).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </StatCard>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
