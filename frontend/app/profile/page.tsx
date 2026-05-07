'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Users,
  Home,
  Key,
  Shield,
  Plus,
  Trash2,
  X,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  FileText,
  ClipboardList,
  Send,
  Link2,
  Link2Off,
  RefreshCw,
  Copy,
  Check,
  Layers,
  Power,
  Eye,
  EyeOff,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import type { UserData, CreateUserData, ChangePasswordData, UserRole, TelegramLinkStatus, TelegramLinkCodeResponse, UserLoginLog, Sector } from '@/lib/types';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Sectors
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [newSector, setNewSector] = useState({ name: '', code: '', description: '' });
  const [sectorError, setSectorError] = useState('');
  const [sectorSaving, setSectorSaving] = useState(false);
  const [showCreateSector, setShowCreateSector] = useState(false);
  const [editingFilters, setEditingFilters] = useState<{ sectorId: number; selected: string[] } | null>(null);
  const [filterSaving, setFilterSaving] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  // Show password in create user form
  const [showUserPassword, setShowUserPassword] = useState(false);

  // Login logs
  const [loginLogs, setLoginLogs] = useState<UserLoginLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [selectedUserLogs, setSelectedUserLogs] = useState<number | null>(null);

  // Active panel
  const [activePanel, setActivePanel] = useState<null | 'last-login' | 'telegram' | 'security' | 'management' | 'sectors'>(null);

  const selectPanel = (panel: 'last-login' | 'telegram' | 'security' | 'management' | 'sectors') => {
    setActivePanel(prev => prev === panel ? null : panel);
  };

  // Telegram
  const [telegramStatus, setTelegramStatus] = useState<TelegramLinkStatus | null>(null);
  const [telegramCode, setTelegramCode] = useState<TelegramLinkCodeResponse | null>(null);
  const [telegramCodeCopied, setTelegramCodeCopied] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(false);
  
  // Password change form
  const [passwordData, setPasswordData] = useState<ChangePasswordData>({
    old_password: '',
    new_password: '',
  });

  // New user form
  const [newUserData, setNewUserData] = useState<CreateUserData>({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    role: 'VIEWER',
    phone: '',
    department: '',
    sector_id: null,
  });

  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
      loadUsers();
    }
    if (user?.role === 'SUPER_ADMIN') {
      loadSectors();
    }
    loadTelegramStatus();
    loadLoginLogs();
  }, [isAuthenticated, authLoading, router, user]);

  const loadSectors = async () => {
    try {
      setSectors(await apiClient.getSectors());
    } catch { /* ignore */ }
  };

  const handleCreateSector = async (e: React.FormEvent) => {
    e.preventDefault();
    setSectorError('');
    setSectorSaving(true);
    try {
      await apiClient.createSector(newSector);
      setNewSector({ name: '', code: '', description: '' });
      setShowCreateSector(false);
      await loadSectors();
    } catch (err) {
      setSectorError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setSectorSaving(false);
    }
  };

  const handleToggleSector = async (id: number) => {
    try {
      await apiClient.toggleSectorActive(id);
      await loadSectors();
    } catch { /* ignore */ }
  };

  const handleSaveGroupFilters = async () => {
    if (!editingFilters) return;
    setFilterSaving(true);
    try {
      await apiClient.updateSector(editingFilters.sectorId, { gruppa_filters: editingFilters.selected });
      await loadSectors();
      setEditingFilters(null);
    } catch { /* ignore */ } finally {
      setFilterSaving(false);
    }
  };

  const openEditFilters = async (sector: Sector) => {
    setEditingFilters({ sectorId: sector.id, selected: sector.gruppa_filters || [] });
    if (availableGroups.length === 0) {
      setGroupsLoading(true);
      try {
        const data = await apiClient.getRegionMapFilters();
        setAvailableGroups(data.groups);
      } catch { /* ignore */ } finally {
        setGroupsLoading(false);
      }
    }
  };

  const toggleGroupFilter = (group: string) => {
    if (!editingFilters) return;
    setEditingFilters(prev => {
      if (!prev) return prev;
      const has = prev.selected.includes(group);
      return { ...prev, selected: has ? prev.selected.filter(g => g !== group) : [...prev.selected, group] };
    });
  };

  const loadTelegramStatus = async () => {
    try {
      const status = await apiClient.getTelegramLinkStatus();
      setTelegramStatus(status);
    } catch {
      // ignore
    }
  };

  const loadLoginLogs = async (userId?: number) => {
    setLogsLoading(true);
    try {
      const data = await apiClient.getLoginLogs(userId);
      setLoginLogs(data);
    } catch {
      // ignore
    } finally {
      setLogsLoading(false);
    }
  };

  const handleGenerateTelegramCode = async () => {
    setTelegramLoading(true);
    try {
      const data = await apiClient.generateTelegramLinkCode();
      setTelegramCode(data);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ошибка генерации кода');
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!telegramCode) return;
    navigator.clipboard.writeText(telegramCode.code).then(() => {
      setTelegramCodeCopied(true);
      setTimeout(() => setTelegramCodeCopied(false), 2000);
    });
  };

  const handleUnlinkTelegram = async () => {
    if (!confirm('Отвязать Telegram-аккаунт?')) return;
    setTelegramLoading(true);
    try {
      await apiClient.unlinkTelegram();
      setTelegramStatus({ linked: false });
      setTelegramCode(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Ошибка отвязки');
    } finally {
      setTelegramLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await apiClient.changePassword(passwordData);
      alert('Пароль успешно изменен!');
      setShowChangePassword(false);
      setPasswordData({ old_password: '', new_password: '' });
    } catch (error) {
      console.error('Error changing password:', error);
      alert(error instanceof Error ? error.message : 'Ошибка при смене пароля');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await apiClient.createUser(newUserData);
      alert('Пользователь успешно создан!');
      setShowCreateUser(false);
      setNewUserData({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        role: 'VIEWER',
        phone: '',
        department: '',
        sector_id: null,
      });
      loadUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      alert(error instanceof Error ? error.message : 'Ошибка при создании пользователя');
    }
  };

  const handleUpdateRole = async (userId: number, newRole: UserRole) => {
    try {
      await apiClient.updateUserRole(userId, newRole);
      loadUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Ошибка при изменении роли');
    }
  };

  const handleChangeUserSector = async (userId: number, sectorId: number | null) => {
    try {
      await apiClient.updateUserSector(userId, sectorId);
      await loadUsers();
    } catch { /* ignore */ }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!confirm(`Вы уверены, что хотите удалить пользователя ${username}?`)) {
      return;
    }

    try {
      await apiClient.deleteUser(userId);
      alert('Пользователь успешно удален!');
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Ошибка при удалении пользователя');
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800';
      case 'ADMIN':
        return 'bg-red-100 text-red-800';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-800';
      case 'VIEWER':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="w-8 h-8" />
              <div>
                <h1 className="text-3xl font-bold">Личный кабинет</h1>
                <p className="text-indigo-100 mt-1">Управление профилем и настройками</p>
              </div>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition flex items-center gap-2"
            >
              <Home className="w-5 h-5" /> Главная
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {user.first_name && user.last_name
                      ? `${user.first_name} ${user.last_name}`
                      : user.username}
                  </h2>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-1 ${getRoleBadgeColor(user.role)}`}>
                    {user.role_display}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-600">
                  <Mail className="w-5 h-5" />
                  <span className="text-sm">{user.email || 'Не указан'}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <Phone className="w-5 h-5" />
                    <span className="text-sm">{user.phone}</span>
                  </div>
                )}
                {user.department && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <Briefcase className="w-5 h-5" />
                    <span className="text-sm">{user.department}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-gray-600">
                  <Calendar className="w-5 h-5" />
                  <span className="text-sm">
                    С {new Date(user.date_joined).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Access Panel */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Быстрый доступ</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Link
                  href="/work-reports"
                  className="flex flex-col items-center justify-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition border border-purple-200"
                >
                  <FileText className="w-8 h-8 text-purple-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">Выполненные работы</span>
                </Link>

                <Link
                  href="/tasks"
                  className="flex flex-col items-center justify-center p-4 bg-violet-50 hover:bg-violet-100 rounded-lg transition border border-violet-200"
                >
                  <ClipboardList className="w-8 h-8 text-violet-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">Доска задач</span>
                </Link>

                {isAdmin && (
                  <button
                    onClick={() => selectPanel('management')}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg transition border ${
                      activePanel === 'management' ? 'bg-emerald-100 border-emerald-500 ring-2 ring-emerald-300' : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                    }`}
                  >
                    <Users className="w-8 h-8 text-emerald-600 mb-2" />
                    <span className="text-sm font-medium text-gray-900">Пользователи</span>
                    <span className="text-xs text-gray-400 mt-1">Управление</span>
                  </button>
                )}

                {isSuperAdmin && (
                  <button
                    onClick={() => selectPanel('sectors')}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg transition border ${
                      activePanel === 'sectors' ? 'bg-purple-100 border-purple-500 ring-2 ring-purple-300' : 'bg-purple-50 hover:bg-purple-100 border-purple-200'
                    }`}
                  >
                    <Layers className="w-8 h-8 text-purple-600 mb-2" />
                    <span className="text-sm font-medium text-gray-900">Секторы</span>
                    <span className="text-xs text-gray-400 mt-1">Управление</span>
                  </button>
                )}

                {/* Last Login tile */}
                <button
                  onClick={() => selectPanel('last-login')}
                  className={`flex flex-col items-center justify-center p-4 rounded-lg transition border ${
                    activePanel === 'last-login' ? 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-300' : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200'
                  }`}
                >
                  <Calendar className="w-8 h-8 text-indigo-500 mb-2" />
                  <span className="text-xs font-medium text-gray-500 mb-1">Последний вход</span>
                  <span className="text-xs text-gray-800 text-center font-semibold">
                    {user.last_login
                      ? new Date(user.last_login).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </span>
                </button>

                {/* Telegram tile */}
                <button
                  onClick={() => selectPanel('telegram')}
                  className={`flex flex-col items-center justify-center p-4 rounded-lg transition border ${
                    activePanel === 'telegram' ? 'bg-sky-100 border-sky-500 ring-2 ring-sky-300' : 'bg-sky-50 hover:bg-sky-100 border-sky-200'
                  }`}
                >
                  <Send className="w-8 h-8 text-sky-500 mb-2" />
                  <span className="text-sm font-medium text-gray-900">Telegram</span>
                  <span className="text-xs mt-1 font-medium">
                    {telegramStatus?.linked
                      ? <span className="text-green-600">Привязан</span>
                      : <span className="text-gray-400">Не привязан</span>}
                  </span>
                </button>

                {/* Security tile */}
                <button
                  onClick={() => selectPanel('security')}
                  className={`flex flex-col items-center justify-center p-4 rounded-lg transition border ${
                    activePanel === 'security' ? 'bg-orange-100 border-orange-500 ring-2 ring-orange-300' : 'bg-orange-50 hover:bg-orange-100 border-orange-200'
                  }`}
                >
                  <Key className="w-8 h-8 text-orange-500 mb-2" />
                  <span className="text-sm font-medium text-gray-900">Безопасность</span>
                  <span className="text-xs text-gray-400 mt-1">Сменить пароль</span>
                </button>
              </div>
            </div>

            {/* Active Panel Content */}
            {activePanel === 'security' && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Key className="w-5 h-5" /> Безопасность
                </h3>
                {!showChangePassword ? (
                  <button
                    onClick={() => setShowChangePassword(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                  >
                    Сменить пароль
                  </button>
                ) : (
                  <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Текущий пароль</label>
                      <input
                        type="password"
                        value={passwordData.old_password}
                        onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Новый пароль</label>
                      <input
                        type="password"
                        value={passwordData.new_password}
                        onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        minLength={8}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Минимум 8 символов</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">Сохранить</button>
                      <button
                        type="button"
                        onClick={() => { setShowChangePassword(false); setPasswordData({ old_password: '', new_password: '' }); }}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                      >Отмена</button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {activePanel === 'telegram' && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Send className="w-5 h-5 text-blue-500" /> Telegram
                </h3>
                {telegramStatus?.linked ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-600 font-medium">
                      <Link2 className="w-5 h-5" />
                      <span>Аккаунт привязан</span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      {telegramStatus.telegram_first_name && (
                        <p>Имя: <span className="font-medium">{telegramStatus.telegram_first_name} {telegramStatus.telegram_last_name}</span></p>
                      )}
                      {telegramStatus.telegram_username && (
                        <p>Username: <span className="font-medium">@{telegramStatus.telegram_username}</span></p>
                      )}
                      {telegramStatus.linked_at && (
                        <p>Привязан: <span className="font-medium">{new Date(telegramStatus.linked_at).toLocaleDateString('ru-RU')}</span></p>
                      )}
                    </div>
                    <button
                      onClick={handleUnlinkTelegram}
                      disabled={telegramLoading}
                      className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition flex items-center gap-2 disabled:opacity-50"
                    >
                      <Link2Off className="w-4 h-4" /> Отвязать
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 max-w-sm">
                    <p className="text-sm text-gray-600">Привяжите Telegram-аккаунт, чтобы отправлять рабочие отчёты через бота.</p>
                    {telegramCode ? (
                      <div className="space-y-3">
                        <p className="text-sm text-gray-500">Код действует до {new Date(telegramCode.expires_at).toLocaleTimeString('ru-RU')}. Отправьте его боту:</p>
                        <div className="bg-gray-100 rounded-lg p-3 flex items-center justify-between gap-2">
                          <code className="text-lg font-mono font-bold tracking-widest text-indigo-700">{telegramCode.code}</code>
                          <button onClick={handleCopyCode} className="text-gray-500 hover:text-gray-700">
                            {telegramCodeCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500">Найдите бота и отправьте: <code className="bg-gray-100 px-1 rounded">/link {telegramCode.code}</code></p>
                        <button onClick={handleGenerateTelegramCode} disabled={telegramLoading} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition flex items-center gap-2 text-sm disabled:opacity-50">
                          <RefreshCw className="w-4 h-4" /> Новый код
                        </button>
                      </div>
                    ) : (
                      <button onClick={handleGenerateTelegramCode} disabled={telegramLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50">
                        <Send className="w-4 h-4" />
                        {telegramLoading ? 'Генерация...' : 'Получить код привязки'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {activePanel === 'last-login' && (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    {isSuperAdmin ? 'Логи входов всех пользователей' : 'Мои последние входы'}
                  </h3>
                  {isSuperAdmin && (
                    <select
                      className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
                      value={selectedUserLogs ?? ''}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : undefined;
                        setSelectedUserLogs(val ?? null);
                        loadLoginLogs(val);
                      }}
                    >
                      <option value="">Все пользователи</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.username}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {isSuperAdmin && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Пользователь</th>}
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Время входа</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP адрес</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Браузер</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {logsLoading ? (
                        <tr><td colSpan={isSuperAdmin ? 4 : 3} className="px-4 py-8 text-center text-gray-500">Загрузка...</td></tr>
                      ) : loginLogs.length === 0 ? (
                        <tr><td colSpan={isSuperAdmin ? 4 : 3} className="px-4 py-8 text-center text-gray-500">Нет данных</td></tr>
                      ) : loginLogs.slice(0, 50).map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          {isSuperAdmin && (
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium text-gray-900">{log.user_username}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(log.user_role as UserRole)}`}>{log.user_role_display}</span>
                            </td>
                          )}
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {new Date(log.timestamp).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 font-mono">{log.ip_address ?? '—'}</td>
                          <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate" title={log.user_agent ?? ''}>
                            {log.user_agent ? log.user_agent.substring(0, 60) + (log.user_agent.length > 60 ? '...' : '') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activePanel === 'sectors' && isSuperAdmin && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-purple-600" /> Управление секторами
                  </h3>
                  <button
                    onClick={() => { setShowCreateSector(v => !v); setSectorError(''); }}
                    className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Новый сектор
                  </button>
                </div>

                {showCreateSector && (
                  <form onSubmit={handleCreateSector} className="mb-5 p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Название *</label>
                        <input required placeholder="Ташкент" value={newSector.name}
                          onChange={e => setNewSector(p => ({ ...p, name: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Код * (slug)</label>
                        <input required placeholder="tashkent" value={newSector.code}
                          onChange={e => setNewSector(p => ({ ...p, code: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Описание</label>
                        <input placeholder="Необязательно" value={newSector.description}
                          onChange={e => setNewSector(p => ({ ...p, description: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                      </div>
                    </div>
                    {sectorError && <p className="text-red-600 text-sm mb-2">{sectorError}</p>}
                    <div className="flex gap-2">
                      <button type="submit" disabled={sectorSaving}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1.5">
                        {sectorSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                        Создать
                      </button>
                      <button type="button" onClick={() => setShowCreateSector(false)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                        Отмена
                      </button>
                    </div>
                  </form>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Название</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Код</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Описание</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Статус</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Группы товара</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sectors.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2.5 font-medium text-gray-900">{s.name}</td>
                          <td className="px-3 py-2.5 text-gray-500 font-mono text-xs">{s.code}</td>
                          <td className="px-3 py-2.5 text-gray-400">{s.description || '—'}</td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {s.is_active ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              {s.is_active ? 'Активен' : 'Отключён'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 max-w-xs">
                            {editingFilters?.sectorId === s.id ? (
                              <div className="relative">
                                <div className="border border-purple-300 rounded-lg bg-white shadow-lg p-3 min-w-[220px] z-20">
                                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Группы товара</p>
                                  {groupsLoading ? (
                                    <p className="text-xs text-gray-400 py-2">Загрузка...</p>
                                  ) : availableGroups.length === 0 ? (
                                    <p className="text-xs text-gray-400 py-2">Нет данных</p>
                                  ) : (
                                    <div className="space-y-1 max-h-48 overflow-y-auto mb-3">
                                      {availableGroups.map(g => (
                                        <label key={g} className="flex items-center gap-2 cursor-pointer hover:bg-purple-50 px-1 py-0.5 rounded">
                                          <input
                                            type="checkbox"
                                            checked={editingFilters.selected.includes(g)}
                                            onChange={() => toggleGroupFilter(g)}
                                            className="accent-purple-600"
                                          />
                                          <span className="text-sm font-mono text-gray-700">{g}</span>
                                        </label>
                                      ))}
                                    </div>
                                  )}
                                  {editingFilters.selected.length === 0 && (
                                    <p className="text-xs text-amber-600 mb-2">⚠ Пусто = видеть все данные</p>
                                  )}
                                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                                    <button onClick={handleSaveGroupFilters} disabled={filterSaving}
                                      className="flex-1 px-2 py-1.5 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700 disabled:opacity-50">
                                      {filterSaving ? 'Сохранение...' : 'Сохранить'}
                                    </button>
                                    <button onClick={() => setEditingFilters(null)}
                                      className="px-2 py-1.5 text-gray-500 hover:text-gray-700 text-xs border rounded">
                                      Отмена
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 flex-wrap cursor-pointer group"
                                onClick={() => openEditFilters(s)}>
                                {(s.gruppa_filters || []).length > 0
                                  ? (s.gruppa_filters || []).map(f => (
                                      <span key={f} className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-mono">{f}</span>
                                    ))
                                  : <span className="text-gray-300 text-xs italic group-hover:text-purple-400">нажмите, чтобы задать фильтры</span>
                                }
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <button onClick={() => handleToggleSector(s.id)}
                              title={s.is_active ? 'Деактивировать' : 'Активировать'}
                              className={`p-1.5 rounded-lg transition ${s.is_active ? 'hover:bg-red-50 text-red-500' : 'hover:bg-green-50 text-green-600'}`}>
                              <Power className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {sectors.length === 0 && (
                        <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-400">Нет секторов</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activePanel === 'management' && isAdmin && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-red-600" /> Управление пользователями
                  </h3>
                  {!showCreateUser && (
                    <button
                      onClick={() => setShowCreateUser(true)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 text-sm"
                    >
                      <Plus className="w-4 h-4" /> Добавить пользователя
                    </button>
                  )}
                </div>

                {showCreateUser && (
                  <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900">Новый пользователь</h4>
                      <button onClick={() => setShowCreateUser(false)} className="text-gray-500 hover:text-gray-700">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <form onSubmit={handleCreateUser} className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Логин *</label>
                        <input type="text" value={newUserData.username} onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                        <input type="email" value={newUserData.email} onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
                        <input type="text" value={newUserData.first_name} onChange={(e) => setNewUserData({ ...newUserData, first_name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Фамилия</label>
                        <input type="text" value={newUserData.last_name} onChange={(e) => setNewUserData({ ...newUserData, last_name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Пароль *</label>
                        <div className="relative">
                          <input type={showUserPassword ? 'text' : 'password'} value={newUserData.password} onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-9 text-sm" minLength={8} required />
                          <button type="button" onClick={() => setShowUserPassword(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {showUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Роль *</label>
                        <select value={newUserData.role} onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as UserRole })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                          <option value="VIEWER">Просмотр</option>
                          <option value="MANAGER">Менеджер</option>
                          <option value="ADMIN">Администратор</option>
                          {isSuperAdmin && <option value="SUPER_ADMIN">Главный администратор</option>}
                        </select>
                      </div>
                      {isSuperAdmin && sectors.length > 0 && (
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Сектор</label>
                          <select value={newUserData.sector_id ?? ''} onChange={e => setNewUserData({ ...newUserData, sector_id: e.target.value ? Number(e.target.value) : null })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                            <option value="">— Все секторы (нет ограничения) —</option>
                            {sectors.filter(s => s.is_active).map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className="col-span-2">
                        <button type="submit" className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold">Создать пользователя</button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Пользователь</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Роль</th>
                        {isSuperAdmin && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сектор</th>}
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Последний вход</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {loading ? (
                        <tr><td colSpan={isSuperAdmin ? 6 : 5} className="px-4 py-8 text-center text-gray-500">Загрузка...</td></tr>
                      ) : users.length === 0 ? (
                        <tr><td colSpan={isSuperAdmin ? 6 : 5} className="px-4 py-8 text-center text-gray-500">Нет пользователей</td></tr>
                      ) : users.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-gray-900">{u.username}</p>
                            {u.first_name && u.last_name && <p className="text-xs text-gray-500">{u.first_name} {u.last_name}</p>}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                          <td className="px-4 py-3">
                            <select
                              value={u.role}
                              onChange={(e) => handleUpdateRole(u.id, e.target.value as UserRole)}
                              disabled={u.id === user.id || (u.role === 'SUPER_ADMIN' && !isSuperAdmin)}
                              className={`text-sm rounded-lg px-3 py-1 font-medium border ${getRoleBadgeColor(u.role)} ${u.id === user.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              {isSuperAdmin && <option value="SUPER_ADMIN">Главный администратор</option>}
                              <option value="ADMIN">Администратор</option>
                              <option value="MANAGER">Менеджер</option>
                              <option value="VIEWER">Просмотр</option>
                            </select>
                          </td>
                          {isSuperAdmin && (
                            <td className="px-4 py-3">
                              <select
                                value={u.sector_id ?? ''}
                                onChange={e => handleChangeUserSector(u.id, e.target.value ? Number(e.target.value) : null)}
                                className="text-sm border rounded-lg px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-purple-400"
                              >
                                <option value="">— Все —</option>
                                {sectors.filter(s => s.is_active).map(s => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                            </td>
                          )}
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {u.last_login ? new Date(u.last_login).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {u.id !== user.id && !(u.role === 'SUPER_ADMIN' && !isSuperAdmin) && (
                              <button onClick={() => handleDeleteUser(u.id, u.username)} className="text-red-600 hover:text-red-900" title="Удалить">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
