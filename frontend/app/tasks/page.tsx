'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, X, Edit2, Trash2, GripVertical, CalendarDays,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  CheckCircle2, Clock, Zap, Search,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserBrief { id: number; username: string; full_name: string; }
interface KanbanTask {
  id: number;
  column: number;
  title: string;
  description: string;
  assignee: number | null;
  assignee_detail: UserBrief | null;
  created_by: number | null;
  created_by_detail: UserBrief | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  progress: number;
  due_date: string | null;
  tags: string;
  tags_list: string[];
  order: number;
  created_at: string;
  updated_at: string;
}
interface KanbanColumn {
  id: number;
  title: string;
  color: string;
  order: number;
  tasks: KanbanTask[];
  task_count: number;
  created_at: string;
}

// ─── API helpers ─────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}
async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(url, { headers: authHeaders(), ...opts });
  if (!r.ok) throw new Error(await r.text());
  if (r.status === 204 || r.headers.get('content-length') === '0') return undefined as T;
  return r.json();
}

// ─── Priority config ─────────────────────────────────────────────────────────

const PRIORITY: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  low:      { label: 'Низкий',      color: 'bg-gray-100 text-gray-600', icon: ChevronDown },
  medium:   { label: 'Средний',     color: 'bg-blue-100 text-blue-700', icon: Clock },
  high:     { label: 'Высокий',     color: 'bg-orange-100 text-orange-700', icon: ChevronUp },
  critical: { label: 'Критический', color: 'bg-red-100 text-red-700', icon: Zap },
};

const COLUMN_COLORS: Record<string, string> = {
  gray:   'border-t-gray-400',
  blue:   'border-t-blue-500',
  yellow: 'border-t-yellow-400',
  green:  'border-t-green-500',
  red:    'border-t-red-500',
  purple: 'border-t-purple-500',
};
const COLUMN_BADGE: Record<string, string> = {
  gray:   'bg-gray-100 text-gray-700',
  blue:   'bg-blue-100 text-blue-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  green:  'bg-green-100 text-green-700',
  red:    'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
};

// ─── TaskCard ─────────────────────────────────────────────────────────────────

function TaskCard({
  task, onEdit, onDelete, overlay = false,
}: {
  task: KanbanTask;
  onEdit: (t: KanbanTask) => void;
  onDelete: (id: number) => void;
  overlay?: boolean;
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: `task-${task.id}` });

  const P = PRIORITY[task.priority] || PRIORITY.medium;
  const PIcon = P.icon;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.progress < 100;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !overlay ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md
        transition-shadow group cursor-default select-none
        ${overlay ? 'shadow-xl rotate-1 scale-105' : ''}
      `}
    >
      {/* Drag handle row */}
      <div className="flex items-center px-3 pt-3 pb-1 gap-2">
        <button
          {...listeners}
          {...attributes}
          className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${P.color}`}>
          <PIcon className="w-3 h-3" />
          {P.label}
        </span>
        <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(task)}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-3 pb-3 space-y-2">
        <p className="text-sm font-medium text-gray-800 leading-snug">{task.title}</p>

        {task.description && (
          <p className="text-[12px] text-gray-500 line-clamp-2">{task.description}</p>
        )}

        {/* Tags */}
        {task.tags_list.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags_list.map((t) => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md font-medium">
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-gray-400">
            <span>Прогресс</span>
            <span className={task.progress === 100 ? 'text-green-600 font-semibold' : ''}>{task.progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                task.progress === 100 ? 'bg-green-500' :
                task.progress >= 60  ? 'bg-blue-500' :
                task.progress >= 30  ? 'bg-yellow-500' : 'bg-red-400'
              }`}
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>

        {/* Footer: assignee + due date */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-[9px] font-bold uppercase">
              {task.assignee_detail?.username?.charAt(0) || '?'}
            </div>
            <span className="truncate max-w-[80px]">{task.assignee_detail?.full_name || '—'}</span>
          </div>
          {task.due_date && (
            <span className={`flex items-center gap-1 text-[11px] font-medium ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
              <CalendarDays className="w-3 h-3" />
              {new Date(task.due_date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Column ──────────────────────────────────────────────────────────────────

function ColumnContainer({
  column, onAddTask, onEditTask, onDeleteTask, searchQuery, dateFilter,
}: {
  column: KanbanColumn;
  onAddTask: (columnId: number) => void;
  onEditTask: (t: KanbanTask) => void;
  onDeleteTask: (id: number) => void;
  searchQuery: string;
  dateFilter: string | null;
}) {
  // Register this column as a droppable zone
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `col-${column.id}` });

  const visibleTasks = useMemo(() => {
    let tasks = column.tasks;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      tasks = tasks.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.assignee_detail?.full_name ?? '').toLowerCase().includes(q) ||
        t.tags.toLowerCase().includes(q)
      );
    }
    if (dateFilter) {
      tasks = tasks.filter((t) =>
        t.created_at.slice(0, 10) === dateFilter || t.due_date === dateFilter
      );
    }
    return tasks;
  }, [column.tasks, searchQuery, dateFilter]);

  const taskIds = useMemo(() => column.tasks.map((t) => `task-${t.id}`), [column.tasks]);

  return (
    <div
      className={`
        flex flex-col bg-gray-50 rounded-xl border-t-4 border border-gray-200 min-w-[280px] w-[280px]
        ${COLUMN_COLORS[column.color] || 'border-t-gray-400'}
      `}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-700 text-sm">{column.title}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${COLUMN_BADGE[column.color] || 'bg-gray-100 text-gray-600'}`}>
            {visibleTasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(column.id)}
          className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          title="Добавить задачу"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Drop zone + task list */}
      <div
        ref={setDropRef}
        className={`flex-1 overflow-y-auto px-3 pb-3 space-y-2 min-h-[80px] rounded-lg transition-colors ${
          isOver ? 'bg-blue-50' : ''
        }`}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {visibleTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))}
        </SortableContext>

        {column.tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-gray-300 text-xs border-2 border-dashed border-gray-200 rounded-xl">
            <CheckCircle2 className="w-8 h-8 mb-2 opacity-50" />
            <span>Перетащите задачу сюда</span>
          </div>
        )}
      </div>

      {/* Add button at bottom */}
      <button
        onClick={() => onAddTask(column.id)}
        className="flex items-center gap-2 mx-3 mb-3 px-3 py-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg text-sm transition-colors"
      >
        <Plus className="w-4 h-4" />
        Добавить задачу
      </button>
    </div>
  );
}

// ─── Task Modal ───────────────────────────────────────────────────────────────

interface TaskFormData {
  title: string;
  description: string;
  assignee: number | '';
  priority: 'low' | 'medium' | 'high' | 'critical';
  progress: number;
  due_date: string;
  tags: string;
  column: number;
}

function TaskModal({
  open, onClose, onSave, initialData, users, columns,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: TaskFormData) => Promise<void>;
  initialData?: KanbanTask | null;
  users: UserBrief[];
  columns: KanbanColumn[];
}) {
  const [form, setForm] = useState<TaskFormData>({
    title: '', description: '', assignee: '', priority: 'medium',
    progress: 0, due_date: '', tags: '', column: columns[0]?.id || 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        title: initialData.title,
        description: initialData.description,
        assignee: initialData.assignee ?? '',
        priority: initialData.priority,
        progress: initialData.progress,
        due_date: initialData.due_date ?? '',
        tags: initialData.tags,
        column: initialData.column,
      });
    } else {
      setForm((f) => ({ ...f, title: '', description: '', assignee: '', priority: 'medium', progress: 0, due_date: '', tags: '' }));
    }
  }, [initialData, open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try { await onSave(form); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">
            {initialData ? 'Редактировать задачу' : 'Новая задача'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Column */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Колонка</label>
            <select
              value={form.column}
              onChange={(e) => setForm({ ...form, column: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {columns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Заголовок *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Что нужно сделать?"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Описание</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Подробности задачи..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Приоритет</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as TaskFormData['priority'] })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>

            {/* Assignee */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Исполнитель</label>
              <select
                value={form.assignee}
                onChange={(e) => setForm({ ...form, assignee: e.target.value === '' ? '' : Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Не назначен —</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Due date */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Срок выполнения</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Progress */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Прогресс: {form.progress}%</label>
              <input
                type="range"
                min={0} max={100} step={5}
                value={form.progress}
                onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })}
                className="mt-2 w-full accent-blue-600"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Теги (через запятую)</label>
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="продажи, клиент, срочно"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Сохранение...' : initialData ? 'Обновить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function TasksPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const columnsRef = useRef<KanbanColumn[]>([]); // always up-to-date for async handlers
  const [users, setUsers] = useState<UserBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<KanbanTask | null>(null);
  const [defaultColumnId, setDefaultColumnId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Current viewed month, e.g. '2026-03'
  const [viewMonth, setViewMonth] = useState<string>(() => today.slice(0, 7));

  // All days of the viewed month
  const monthDays = useMemo(() => {
    const [y, m] = viewMonth.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = String(i + 1).padStart(2, '0');
      return `${viewMonth}-${d}`;
    });
  }, [viewMonth]);

  // Set of dates that have tasks (created or due)
  const taskDates = useMemo(() => {
    const s = new Set<string>();
    columns.forEach((col) =>
      col.tasks.forEach((t) => {
        s.add(t.created_at.slice(0, 10));
        if (t.due_date) s.add(t.due_date);
      })
    );
    return s;
  }, [columns]);

  const shiftMonth = (delta: number) => {
    const [y, m] = viewMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    setSelectedDate(null);
  };

  const setColumnsAndRef = useCallback((updater: KanbanColumn[] | ((prev: KanbanColumn[]) => KanbanColumn[])) => {
    setColumns((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      columnsRef.current = next;
      return next;
    });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, authLoading, router]);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cols, us] = await Promise.all([
        apiFetch<KanbanColumn[]>(`${API}/kanban/columns/`),
        apiFetch<{ results: UserBrief[] } | UserBrief[]>(`${API}/kanban/users/`),
      ]);
      setColumnsAndRef(cols);
      setUsers(Array.isArray(us) ? us : us.results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [setColumnsAndRef]);

  useEffect(() => { if (isAuthenticated) loadData(); }, [isAuthenticated, loadData]);

  // ── DnD handlers ───────────────────────────────────────────────────────────

  // findTask always reads from columnsRef so it's never stale
  const findTask = useCallback((id: string | number, fromCols?: KanbanColumn[]): { task: KanbanTask; colIdx: number; taskIdx: number } | null => {
    const src = fromCols ?? columnsRef.current;
    const numId = typeof id === 'string' ? Number(id.replace('task-', '')) : id;
    for (let ci = 0; ci < src.length; ci++) {
      const ti = src[ci].tasks.findIndex((t) => t.id === numId);
      if (ti !== -1) return { task: src[ci].tasks[ti], colIdx: ci, taskIdx: ti };
    }
    return null;
  }, []);

  const onDragStart = ({ active }: DragStartEvent) => {
    const found = findTask(String(active.id));
    if (found) setActiveTask(found.task);
  };

  // onDragOver handles BOTH cross-column AND same-column reordering live
  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId   = String(over.id);

    setColumnsAndRef((prev) => {
      const activeFound = findTask(activeId, prev);
      if (!activeFound) return prev;

      const overTaskFound = findTask(overId, prev);
      const targetColIdx = overTaskFound
        ? overTaskFound.colIdx
        : prev.findIndex((c) => overId === `col-${c.id}`);

      if (targetColIdx === -1) return prev;

      const next = prev.map((c) => ({ ...c, tasks: [...c.tasks] }));

      // Remove from source position
      const [moved] = next[activeFound.colIdx].tasks.splice(activeFound.taskIdx, 1);
      moved.column = next[targetColIdx].id;

      if (overTaskFound && targetColIdx === activeFound.colIdx) {
        // Same column reorder — insert at the over-task's current position
        next[targetColIdx].tasks.splice(overTaskFound.taskIdx, 0, moved);
      } else {
        // Different column or empty column drop zone
        const insertAt = overTaskFound ? overTaskFound.taskIdx : next[targetColIdx].tasks.length;
        next[targetColIdx].tasks.splice(insertAt, 0, moved);
      }

      return next;
    });
  };

  // onDragEnd only persists — visuals already done in onDragOver
  const onDragEnd = async ({ active }: DragEndEvent) => {
    setActiveTask(null);

    const activeId = String(active.id);
    const current  = columnsRef.current;
    const found    = findTask(activeId, current);
    if (!found) return;

    const col = current[found.colIdx];
    const siblingOrders = col.tasks.map((t, i) => ({ id: t.id, order: i }));

    try {
      await apiFetch(`${API}/kanban/tasks/move/`, {
        method: 'POST',
        body: JSON.stringify({
          task_id: found.task.id,
          column_id: col.id,
          order: found.taskIdx,
          sibling_orders: siblingOrders,
        }),
      });
    } catch (e) {
      console.error('Move failed', e);
      loadData();
    }
  };

  // ── CRUD ───────────────────────────────────────────────────────────────────

  const handleOpenAdd = (columnId: number) => {
    setDefaultColumnId(columnId);
    setEditTask(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (task: KanbanTask) => {
    setEditTask(task);
    setDefaultColumnId(null);
    setModalOpen(true);
  };

  const handleSave = async (data: TaskFormData) => {
    const body = {
      ...data,
      assignee: data.assignee === '' ? null : data.assignee,
      column: editTask ? data.column : (defaultColumnId ?? columns[0]?.id),
    };

    if (editTask) {
      const updated = await apiFetch<KanbanTask>(`${API}/kanban/tasks/${editTask.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setColumnsAndRef((prev) => prev.map((c) => ({
        ...c,
        tasks: c.id === updated.column
          ? c.tasks.map((t) => t.id === updated.id ? updated : t)
          : c.tasks.filter((t) => t.id !== updated.id),
      })));
      // Move to new column if changed
      if (editTask.column !== updated.column) {
        await loadData();
      }
    } else {
      const created = await apiFetch<KanbanTask>(`${API}/kanban/tasks/`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setColumnsAndRef((prev) => prev.map((c) =>
        c.id === created.column ? { ...c, tasks: [...c.tasks, created] } : c
      ));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить задачу?')) return;
    try {
      await apiFetch(`${API}/kanban/tasks/${id}/`, { method: 'DELETE' });
      setColumnsAndRef((prev) => prev.map((c) => ({ ...c, tasks: c.tasks.filter((t) => t.id !== id) })));
    } catch (e) { console.error('Delete error:', e); alert('Не удалось удалить задачу'); }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────

  // Stats

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Загрузка доски задач...</p>
        </div>
      </div>
    );
  }

  const totalTasks = columns.reduce((s, c) => s + c.tasks.length, 0);
  const doneTasks  = columns.find((c) => c.title === 'Готово')?.tasks.length ?? 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-violet-100">
              <ClipboardList className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Доска задач</h1>
              <p className="text-xs text-gray-500">
                {totalTasks} задач • {doneTasks} выполнено
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск задач..."
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
              />
            </div>

            <button
              onClick={() => { setEditTask(null); setDefaultColumnId(columns[0]?.id); setModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" />
              Задача
            </button>
          </div>
        </div>
      </div>

      {/* Date calendar strip — full width */}
      <div className="bg-white border-b border-gray-100 px-4 pt-2 pb-3 shrink-0">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => shiftMonth(-1)}
            className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700 capitalize">
              {new Date(viewMonth + '-01').toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => { setSelectedDate(null); setViewMonth(today.slice(0, 7)); }}
              className={`text-xs px-2 py-0.5 rounded-md font-medium transition-colors ${
                selectedDate === null && viewMonth === today.slice(0, 7)
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-violet-50 hover:text-violet-600'
              }`}
            >
              Все
            </button>
          </div>
          <button
            onClick={() => shiftMonth(1)}
            className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day cells — equal width, fill full row */}
        <div className="grid w-full" style={{ gridTemplateColumns: `repeat(${monthDays.length}, 1fr)`, gap: '2px' }}>
          {monthDays.map((dateStr) => {
            const date = new Date(dateStr + 'T00:00:00');
            const isToday    = dateStr === today;
            const isSelected = selectedDate === dateStr;
            const hasTask    = taskDates.has(dateStr);
            const weekday    = date.toLocaleDateString('ru-RU', { weekday: 'short' });
            const dayNum     = date.getDate();
            const isSunday   = date.getDay() === 0;
            const isSaturday = date.getDay() === 6;
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`relative flex flex-col items-center py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                  isSelected
                    ? 'bg-violet-600 text-white'
                    : isToday
                      ? 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-300'
                      : (isSaturday || isSunday)
                        ? 'text-red-400 hover:bg-red-50'
                        : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <span className={`text-[9px] font-normal capitalize leading-none mb-0.5 ${
                  isSelected ? 'text-violet-200' : 'opacity-60'
                }`}>
                  {weekday}
                </span>
                <span className="leading-none font-semibold">{dayNum}</span>
                {/* task dot */}
                <span className={`mt-0.5 w-1 h-1 rounded-full ${
                  hasTask
                    ? isSelected ? 'bg-white' : 'bg-violet-500'
                    : 'bg-transparent'
                }`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <div className="flex gap-5 h-full items-start">
            {columns.map((col) => (
              <ColumnContainer
                key={col.id}
                column={col}
                searchQuery={search}
                dateFilter={selectedDate}
                onAddTask={handleOpenAdd}
                onEditTask={handleOpenEdit}
                onDeleteTask={handleDelete}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask && (
              <TaskCard
                task={activeTask}
                onEdit={() => {}}
                onDelete={() => {}}
                overlay
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Task Modal */}
      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initialData={editTask}
        users={users}
        columns={columns}
      />
    </div>
  );
}
