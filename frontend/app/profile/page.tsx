'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
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
  BarChart3,
  Wallet,
  Package
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import type { UserData, CreateUserData, ChangePasswordData, UserRole } from '@/lib/types';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  
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
  });

  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.role === 'ADMIN') {
      loadUsers();
    }
  }, [isAuthenticated, authLoading, router, user]);

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
      alert('Роль успешно изменена!');
      loadUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Ошибка при изменении роли');
    }
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

  const isAdmin = user?.role === 'ADMIN';

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

            {/* Change Password Card */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Key className="w-5 h-5" /> Безопасность
              </h3>
              
              {!showChangePassword ? (
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  Сменить пароль
                </button>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Текущий пароль
                    </label>
                    <input
                      type="password"
                      value={passwordData.old_password}
                      onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Новый пароль
                    </label>
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
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                      Сохранить
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowChangePassword(false);
                        setPasswordData({ old_password: '', new_password: '' });
                      }}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                      Отмена
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Right Column - Quick Links & Admin Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Access Links */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Быстрый доступ</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Link
                  href="/dashboard"
                  className="flex flex-col items-center justify-center p-4 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition border border-cyan-200"
                >
                  <BarChart3 className="w-8 h-8 text-cyan-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">Дашборд</span>
                </Link>

                <Link
                  href="/expenses"
                  className="flex flex-col items-center justify-center p-4 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition border border-emerald-200"
                >
                  <Wallet className="w-8 h-8 text-emerald-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">Расходы</span>
                </Link>

                <Link
                  href="/products"
                  className="flex flex-col items-center justify-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition border border-blue-200"
                >
                  <Package className="w-8 h-8 text-blue-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">Продукты</span>
                </Link>
              </div>
            </div>

            {/* Admin Panel - Only for Admins */}
            {isAdmin && (
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

                {/* Create User Form */}
                {showCreateUser && (
                  <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900">Новый пользователь</h4>
                      <button
                        onClick={() => setShowCreateUser(false)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleCreateUser} className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Логин *
                        </label>
                        <input
                          type="text"
                          value={newUserData.username}
                          onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email *
                        </label>
                        <input
                          type="email"
                          value={newUserData.email}
                          onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Имя
                        </label>
                        <input
                          type="text"
                          value={newUserData.first_name}
                          onChange={(e) => setNewUserData({ ...newUserData, first_name: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Фамилия
                        </label>
                        <input
                          type="text"
                          value={newUserData.last_name}
                          onChange={(e) => setNewUserData({ ...newUserData, last_name: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Пароль *
                        </label>
                        <input
                          type="password"
                          value={newUserData.password}
                          onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          minLength={8}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Роль *
                        </label>
                        <select
                          value={newUserData.role}
                          onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as UserRole })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        >
                          <option value="VIEWER">Просмотр</option>
                          <option value="MANAGER">Менеджер</option>
                          <option value="ADMIN">Администратор</option>
                        </select>
                      </div>

                      <div className="col-span-2">
                        <button
                          type="submit"
                          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold"
                        >
                          Создать пользователя
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Users List */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Пользователь
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Роль
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                          Действия
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {loading ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                            Загрузка...
                          </td>
                        </tr>
                      ) : users.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                            Нет пользователей
                          </td>
                        </tr>
                      ) : (
                        users.map((u) => (
                          <tr key={u.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{u.username}</p>
                                {u.first_name && u.last_name && (
                                  <p className="text-xs text-gray-500">
                                    {u.first_name} {u.last_name}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                            <td className="px-4 py-3">
                              <select
                                value={u.role}
                                onChange={(e) => handleUpdateRole(u.id, e.target.value as UserRole)}
                                disabled={u.id === user.id}
                                className={`text-sm rounded-lg px-3 py-1 font-medium border ${getRoleBadgeColor(u.role)} ${
                                  u.id === user.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                }`}
                              >
                                <option value="ADMIN">Администратор</option>
                                <option value="MANAGER">Менеджер</option>
                                <option value="VIEWER">Просмотр</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {u.id !== user.id && (
                                <button
                                  onClick={() => handleDeleteUser(u.id, u.username)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Удалить"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
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
