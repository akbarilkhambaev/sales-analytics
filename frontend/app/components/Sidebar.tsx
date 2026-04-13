'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Package,
  Tag,
  PackageOpen,
  Palette,
  Users,
  Database,
  LineChart,
  Wallet,
  Briefcase,
  FileText,
  BookOpen,
  UserCircle,
  Target,
  LogOut,
  User,
  ShieldCheck,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  TrendingUp,
  Settings2,
  MapPin,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  color: string;
}

interface NavSection {
  title: string;
  icon: React.ElementType;
  color: string;
  items: NavItem[];
  roles?: string[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Анализ и статистика',
    icon: BarChart3,
    color: 'text-blue-600',
    items: [
      { href: '/plan-fact',  label: 'План-факт',         icon: Target,      color: 'text-red-500' },
      // { href: '/dashboard',  label: 'Дашборд',           icon: LineChart,   color: 'text-cyan-500' },
      { href: '/products',   label: 'Все продукты',      icon: Package,     color: 'text-blue-500' },
      { href: '/groups',     label: 'По группам',        icon: Tag,         color: 'text-green-500' },
      { href: '/hierarchy',  label: 'Перечень товаров',  icon: PackageOpen, color: 'text-purple-500' },
      { href: '/colors',     label: 'Продукты по цветам',icon: Palette,     color: 'text-orange-500' },
      { href: '/clients',           label: 'Клиентская база', icon: Users,       color: 'text-pink-500' },
      { href: '/analytics/abc',     label: 'ABC-анализ',      icon: TrendingUp,  color: 'text-teal-500' },
    ],
  },
  {
    title: 'Команда',
    icon: ClipboardList,
    color: 'text-violet-600',
    items: [
      { href: '/tasks', label: 'Доска задач',    icon: ClipboardList, color: 'text-violet-500' },
      { href: '/kpi',   label: 'KPI менеджеров', icon: TrendingUp,    color: 'text-emerald-500' },
    ],
  },
  {
    title: 'Инструменты',
    icon: Settings2,
    color: 'text-teal-600',
    items: [
      { href: '/configurator', label: 'Конфигуратор', icon: Settings2, color: 'text-teal-500' },
    ],
  },
  {
    title: 'Управление сектором',
    icon: Briefcase,
    color: 'text-emerald-600',
    roles: ['ADMIN', 'MANAGER'],
    items: [
      { href: '/expenses',     label: 'Расходы отдела',      icon: Wallet,      color: 'text-emerald-500' },
      { href: '/work-reports', label: 'Выполненные работы',  icon: FileText,    color: 'text-purple-500' },
      { href: '/catalogs',     label: 'Каталоги продукции',  icon: BookOpen,    color: 'text-blue-500' },
      { href: '/client-cards', label: 'Карточки клиентов',   icon: UserCircle,  color: 'text-indigo-500' },
    ],
  },
  {
    title: 'Настройки',
    icon: Database,
    color: 'text-indigo-600',
    roles: ['ADMIN'],
    items: [
      { href: '/admin', label: 'Администрирование', icon: Database, color: 'text-indigo-500' },
    ],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) return null;

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const roleIcons: Record<string, React.ElementType> = {
    ADMIN: ShieldCheck,
    MANAGER: UserCheck,
    VIEWER: User,
  };
  const RoleIcon = roleIcons[user.role] || User;

  return (
    <aside
      className={`
        relative flex flex-col bg-white border-r border-gray-200 shadow-sm
        transition-all duration-300 ease-in-out shrink-0 h-screen
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 z-10 flex items-center justify-center w-6 h-6 rounded-full bg-white border border-gray-300 shadow text-gray-500 hover:text-blue-600 hover:border-blue-400 transition-colors"
        title={collapsed ? 'Развернуть' : 'Свернуть'}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-4 border-b border-gray-100 ${collapsed ? 'justify-center' : ''}`}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white shrink-0">
          <BarChart3 className="w-5 h-5" />
        </div>
        {!collapsed && (
          <div>
            <div className="text-sm font-bold text-gray-900 leading-tight">AKFA SALES</div>
            <div className="text-xs text-gray-500">VISION</div>
          </div>
        )}
      </div>

      {/* Home Link */}
      <div className="px-2 pt-2">
        <Link
          href="/"
          className={`
            flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors
            ${pathname === '/'
              ? 'bg-blue-50 text-blue-700 font-medium'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
            ${collapsed ? 'justify-center' : ''}
          `}
          title={collapsed ? 'Карта продаж' : undefined}
        >
          <MapPin className={`w-4 h-4 shrink-0 ${pathname === '/' ? 'text-blue-600' : 'text-gray-400'}`} />
          {!collapsed && <span>Карта продаж</span>}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
        {NAV_SECTIONS.map((section) => {
          // Role filter
          if (section.roles && !section.roles.includes(user.role)) return null;

          const SectionIcon = section.icon;

          return (
            <div key={section.title}>
              {/* Section header */}
              {!collapsed && (
                <div className={`flex items-center gap-2 px-2 mb-1`}>
                  <SectionIcon className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    {section.title}
                  </span>
                </div>
              )}
              {collapsed && (
                <div className="flex justify-center mb-1">
                  <div className="w-6 border-t border-gray-200" />
                </div>
              )}

              {/* Items */}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`
                        flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors
                        ${isActive
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                        ${collapsed ? 'justify-center' : ''}
                      `}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User / Footer */}
      <div className="border-t border-gray-100 px-2 py-3 space-y-1">
        <Link
          href="/profile"
          className={`
            flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors
            ${pathname === '/profile'
              ? 'bg-blue-50 text-blue-700 font-medium'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
            ${collapsed ? 'justify-center' : ''}
          `}
          title={collapsed ? 'Профиль' : undefined}
        >
          <RoleIcon className={`w-4 h-4 shrink-0 ${pathname === '/profile' ? 'text-blue-600' : 'text-gray-400'}`} />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium text-gray-700">{user.username}</div>
              <div className="text-[10px] text-gray-400">{user.role_display}</div>
            </div>
          )}
        </Link>

        <button
          onClick={handleLogout}
          className={`
            w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-gray-600
            hover:bg-red-50 hover:text-red-600 transition-colors
            ${collapsed ? 'justify-center' : ''}
          `}
          title={collapsed ? 'Выйти' : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Выйти</span>}
        </button>
      </div>
    </aside>
  );
}
