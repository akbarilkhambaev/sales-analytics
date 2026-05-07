'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import {
  Target,
  ClipboardList,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  ChevronRight,
  Loader2,
  CalendarDays,
  Banknote,
  BarChart2,
  ArrowRight,
  Flame,
  AlertCircle,
  Circle,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface KPIItem {
  id: number;
  name: string;
  unit_display: string;
  weight: number;
  target: number;
  fact: number;
  completion_pct: number;
  capped_completion: number;
  is_valid: boolean;
  payout_amount: number;
  notes: string;
}

interface KPIData {
  record_id: number;
  period: string;
  template_name: string;
  base_salary: number;
  fix_ratio: number;
  fix_payout: number;
  bonus_payout: number;
  total_payout: number;
  total_weighted_pct: number;
  status: string;
  items: KPIItem[];
}

interface Task {
  id: number;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  progress: number;
  due_date: string | null;
  column: string | null;
  is_overdue: boolean;
}

interface TasksSummary {
  total: number;
  overdue: number;
  by_priority: { critical: number; high: number; medium: number; low: number };
  items: Task[];
}

interface WorkReports {
  this_month: number;
  last_report_date: string | null;
}

interface DashboardData {
  kpi: KPIData | null;
  tasks: TasksSummary;
  work_reports: WorkReports;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  critical: { label: 'Критический', color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: Flame },
  high:     { label: 'Высокий',     color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', icon: AlertCircle },
  medium:   { label: 'Средний',     color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', icon: Circle },
  low:      { label: 'Низкий',      color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200', icon: Circle },
};

function formatMoney(n: number) {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' сум';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

// ── SVG Ring Progress ─────────────────────────────────────────────────────────

function RingProgress({ pct, size = 120, stroke = 10, color = '#2563eb' }: {
  pct: number; size?: number; stroke?: number; color?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const filled = Math.min(pct, 120) / 120 * circ; // cap visual at 120%
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function MyDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { router.push('/login'); return; }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    const token = localStorage.getItem('access_token');
    fetch('/api/my/dashboard/', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setError('Не удалось загрузить данные'))
      .finally(() => setLoading(false));
  }, [isAuthenticated, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-blue-600" size={36} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-red-500 gap-2">
        <AlertTriangle size={20} /> {error}
      </div>
    );
  }

  if (!data || !user) return null;

  const { kpi, tasks, work_reports } = data;
  const today = new Date();
  const monthName = today.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username;

  // KPI ring color
  const kpiColor = !kpi ? '#9ca3af'
    : kpi.total_weighted_pct >= 100 ? '#16a34a'
    : kpi.total_weighted_pct >= 70 ? '#2563eb'
    : '#f59e0b';

  return (
    <div className="w-full px-4 py-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Привет, {displayName}!
          </h1>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
            <CalendarDays size={14} />
            {today.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-100 text-blue-700">
          {user.role_display}
        </span>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── KPI Card (2 cols) ── */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target size={18} className="text-blue-600" />
              <span className="font-semibold text-gray-900">KPI</span>
              <span className="text-xs text-gray-400 capitalize">{monthName}</span>
            </div>
            <button
              onClick={() => router.push('/kpi')}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              Подробнее <ChevronRight size={13} />
            </button>
          </div>

          {!kpi ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
              <BarChart2 size={32} />
              <p className="text-sm">KPI на этот месяц ещё не назначен</p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Ring */}
              <div className="relative shrink-0">
                <RingProgress pct={kpi.total_weighted_pct} size={120} stroke={10} color={kpiColor} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-gray-900">{kpi.total_weighted_pct}%</span>
                  <span className="text-[10px] text-gray-400">выполнено</span>
                </div>
              </div>

              {/* Salary breakdown */}
              <div className="flex-1 space-y-2 w-full">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Banknote size={14} /> Фиксированная часть
                  </span>
                  <span className="font-medium text-gray-800">{formatMoney(kpi.fix_payout)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <TrendingUp size={14} /> Бонусная часть
                  </span>
                  <span className="font-medium text-gray-800">{formatMoney(kpi.bonus_payout)}</span>
                </div>
                <div className="border-t border-gray-100 pt-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Итого прогноз</span>
                  <span className={`text-base font-bold ${kpiColor === '#16a34a' ? 'text-green-600' : 'text-blue-700'}`}>
                    {formatMoney(kpi.total_payout)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* KPI items list */}
          {kpi && kpi.items.length > 0 && (
            <div className="mt-4 space-y-2">
              {kpi.items.map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600 truncate">{item.name}</span>
                      <span className={`font-medium ml-2 shrink-0 ${
                        item.completion_pct >= 100 ? 'text-green-600'
                        : item.completion_pct >= 70 ? 'text-blue-600'
                        : 'text-amber-600'
                      }`}>
                        {item.completion_pct}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.completion_pct >= 100 ? 'bg-green-500'
                          : item.completion_pct >= 70 ? 'bg-blue-500'
                          : 'bg-amber-400'
                        }`}
                        style={{ width: `${Math.min(item.completion_pct, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 shrink-0 w-20 text-right">
                    {item.fact.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} / {item.target.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right column ── */}
        <div className="flex flex-col gap-5">

          {/* Tasks summary */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ClipboardList size={18} className="text-violet-600" />
                <span className="font-semibold text-gray-900">Мои задачи</span>
              </div>
              <button onClick={() => router.push('/tasks')} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                Доска <ChevronRight size={13} />
              </button>
            </div>

            {tasks.total === 0 ? (
              <p className="text-sm text-gray-400 py-2">Нет назначенных задач</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Всего</span>
                  <span className="font-semibold text-gray-800">{tasks.total}</span>
                </div>
                {tasks.overdue > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-red-500 flex items-center gap-1">
                      <AlertTriangle size={13} /> Просрочено
                    </span>
                    <span className="font-semibold text-red-600">{tasks.overdue}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  {tasks.by_priority.critical > 0 && (
                    <div className="text-xs bg-red-50 text-red-600 rounded-lg px-2 py-1 text-center">
                      🔴 {tasks.by_priority.critical} крит.
                    </div>
                  )}
                  {tasks.by_priority.high > 0 && (
                    <div className="text-xs bg-orange-50 text-orange-600 rounded-lg px-2 py-1 text-center">
                      🟠 {tasks.by_priority.high} высок.
                    </div>
                  )}
                  {tasks.by_priority.medium > 0 && (
                    <div className="text-xs bg-blue-50 text-blue-600 rounded-lg px-2 py-1 text-center">
                      🔵 {tasks.by_priority.medium} средн.
                    </div>
                  )}
                  {tasks.by_priority.low > 0 && (
                    <div className="text-xs bg-gray-50 text-gray-500 rounded-lg px-2 py-1 text-center">
                      ⚪ {tasks.by_priority.low} низк.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Work reports */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-purple-600" />
                <span className="font-semibold text-gray-900">Отчёты</span>
              </div>
              <button onClick={() => router.push('/work-reports')} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                Все <ChevronRight size={13} />
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">В этом месяце</span>
                <span className="font-semibold text-gray-800">{work_reports.this_month}</span>
              </div>
              {work_reports.last_report_date && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Clock size={13} /> Последний
                  </span>
                  <span className="text-gray-600">{formatDate(work_reports.last_report_date)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tasks list ── */}
      {tasks.items.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-violet-600" />
              <span className="font-semibold text-gray-900">Мои задачи — детально</span>
            </div>
            <button onClick={() => router.push('/tasks')} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Открыть доску <ArrowRight size={13} />
            </button>
          </div>
          <div className="space-y-2">
            {tasks.items.map(task => {
              const cfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.low;
              return (
                <div
                  key={task.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${cfg.bg} ${task.is_overdue ? 'ring-1 ring-red-300' : ''}`}
                >
                  {/* Priority dot */}
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    task.priority === 'critical' ? 'bg-red-500'
                    : task.priority === 'high' ? 'bg-orange-400'
                    : task.priority === 'medium' ? 'bg-blue-400'
                    : 'bg-gray-300'
                  }`} />

                  {/* Title + column */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{task.title}</p>
                    {task.column && (
                      <p className="text-xs text-gray-400 mt-0.5">{task.column}</p>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="flex items-center gap-2 shrink-0">
                    {task.is_overdue && (
                      <span className="text-xs text-red-500 flex items-center gap-0.5">
                        <AlertTriangle size={11} /> просрочено
                      </span>
                    )}
                    {task.due_date && !task.is_overdue && (
                      <span className="text-xs text-gray-400">{formatDate(task.due_date)}</span>
                    )}
                    <div className="flex items-center gap-1">
                      {task.progress === 100 ? (
                        <CheckCircle2 size={15} className="text-green-500" />
                      ) : (
                        <span className="text-xs font-medium text-gray-600">{task.progress}%</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Quick actions ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Новый отчёт', href: '/work-reports', icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50 hover:bg-purple-100' },
          { label: 'Мои задачи', href: '/tasks', icon: ClipboardList, color: 'text-violet-600', bg: 'bg-violet-50 hover:bg-violet-100' },
          { label: 'KPI подробно', href: '/kpi', icon: Target, color: 'text-blue-600', bg: 'bg-blue-50 hover:bg-blue-100' },
          { label: 'Профиль', href: '/profile', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 hover:bg-emerald-100' },
        ].map(a => {
          const Icon = a.icon;
          return (
            <button
              key={a.href}
              onClick={() => router.push(a.href)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-100 ${a.bg} transition-colors`}
            >
              <Icon size={22} className={a.color} />
              <span className="text-xs font-medium text-gray-700">{a.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
