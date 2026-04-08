'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Wallet,
  Home,
  Plus,
  Edit,
  Trash2,
  Filter,
  Search,
  Download,
  FileText,
  DollarSign,
  TrendingUp,
  X,
  Eye
} from 'lucide-react';
import { apiClient, formatNumber } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import type { Expense, ExpenseCategory, ExpenseFilters, CurrencyType } from '@/lib/types';

export default function ExpensesPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  
  const [filters, setFilters] = useState<ExpenseFilters>({
    start_date: '',
    end_date: '',
    categories: [],
    currency: undefined,
    search: '',
  });

  const [formData, setFormData] = useState({
    tema: '',
    description: '',
    category: null as number | null,
    amount: '',
    currency: 'UZS' as CurrencyType,
    date: new Date().toISOString().split('T')[0],
    attachment: null as File | null,
    comment: '',
  });

  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    console.log('Current user:', user);
    console.log('User role:', user?.role);
    console.log('User permissions:', user?.permissions);
    
    loadData();
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadExpenses();
    }
  }, [filters, isAuthenticated]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [expensesData, categoriesData] = await Promise.all([
        apiClient.getExpenses(filters),
        apiClient.getExpenseCategories(),
      ]);
      setExpenses(expensesData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExpenses = async () => {
    try {
      const data = await apiClient.getExpenses(filters);
      setExpenses(data);
    } catch (error) {
      console.error('Error loading expenses:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tema || !formData.category || !formData.amount || !formData.date) {
      alert('Заполните обязательные поля: Тема, Категория, Сумма, Дата');
      return;
    }

    try {
      const data = new FormData();
      data.append('tema', formData.tema);
      data.append('description', formData.description);
      data.append('category', formData.category.toString());
      data.append('amount', formData.amount);
      data.append('currency', formData.currency);
      data.append('date', formData.date);
      data.append('comment', formData.comment);
      
      if (formData.attachment) {
        data.append('attachment', formData.attachment);
      }

      if (editingExpense) {
        await apiClient.updateExpense(editingExpense.id, data);
      } else {
        await apiClient.createExpense(data);
      }

      setShowModal(false);
      resetForm();
      loadExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Ошибка при сохранении расхода');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот расход?')) {
      return;
    }

    try {
      await apiClient.deleteExpense(id);
      loadExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Ошибка при удалении расхода');
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      tema: expense.tema,
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      currency: expense.currency,
      date: expense.date,
      attachment: null,
      comment: expense.comment,
    });
    setShowModal(true);
  };

  const handleView = (expense: Expense) => {
    setViewingExpense(expense);
    setShowViewModal(true);
  };

  const resetForm = () => {
    setFormData({
      tema: '',
      description: '',
      category: null,
      amount: '',
      currency: 'UZS',
      date: new Date().toISOString().split('T')[0],
      attachment: null,
      comment: '',
    });
    setEditingExpense(null);
    setShowNewCategoryForm(false);
    setNewCategoryName('');
    setNewCategoryDescription('');
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('Введите название категории');
      return;
    }

    try {
      setCreatingCategory(true);
      
      // Проверяем права доступа
      if (user?.role !== 'ADMIN') {
        alert('Только администраторы могут создавать категории');
        return;
      }
      
      console.log('Creating category:', newCategoryName);
      const newCategory = await apiClient.createExpenseCategory(
        newCategoryName.trim(),
        newCategoryDescription.trim()
      );
      
      // Добавляем новую категорию в список
      setCategories([...categories, newCategory]);
      
      // Автоматически выбираем созданную категорию
      setFormData({ ...formData, category: newCategory.id });
      
      // Скрываем форму создания категории
      setShowNewCategoryForm(false);
      setNewCategoryName('');
      setNewCategoryDescription('');
      
      alert('Категория успешно создана!');
    } catch (error) {
      console.error('Error creating category:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при создании категории';
      alert(`Ошибка: ${errorMessage}`);
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleFilterChange = (key: keyof ExpenseFilters, value: string | number[] | CurrencyType | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      start_date: '',
      end_date: '',
      categories: [],
      currency: undefined,
      search: '',
    });
  };

  const isAdmin = user?.role === 'ADMIN';

  const totalUZS = expenses
    .filter(e => e.currency === 'UZS')
    .reduce((sum, e) => sum + parseFloat(e.amount), 0);

  const totalUSD = expenses
    .filter(e => e.currency === 'USD')
    .reduce((sum, e) => sum + parseFloat(e.amount), 0);

  if (authLoading || loading) {
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
      <div className="bg-gradient-to-r from-green-600 to-emerald-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet className="w-8 h-8" />
              <div>
                <h1 className="text-3xl font-bold">Расходы отдела</h1>
                <p className="text-green-100 mt-1">Управление финансами</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isAdmin && (
                <button
                  onClick={() => {
                    resetForm();
                    setShowModal(true);
                  }}
                  className="px-4 py-2 bg-white text-green-600 rounded-lg hover:bg-green-50 transition flex items-center gap-2 font-semibold"
                >
                  <Plus className="w-5 h-5" /> Добавить расход
                </button>
              )}
              <Link
                href="/"
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition flex items-center gap-2"
              >
                <Home className="w-5 h-5" /> Главная
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Всего расходов</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{expenses.length}</p>
              </div>
              <FileText className="w-12 h-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Сумма (UZS)</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatNumber(totalUZS)} сум
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Сумма (USD)</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ${formatNumber(totalUSD)}
                </p>
              </div>
              <DollarSign className="w-12 h-12 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Filter className="w-5 h-5" /> Фильтры
            </h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-blue-600 hover:text-blue-700"
            >
              {showFilters ? 'Скрыть' : 'Показать'}
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Дата от
                </label>
                <input
                  type="date"
                  value={filters.start_date || ''}
                  onChange={(e) => handleFilterChange('start_date', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Дата до
                </label>
                <input
                  type="date"
                  value={filters.end_date || ''}
                  onChange={(e) => handleFilterChange('end_date', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Валюта
                </label>
                <select
                  value={filters.currency || ''}
                  onChange={(e) => handleFilterChange('currency', e.target.value || undefined)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Все</option>
                  <option value="UZS">Сум</option>
                  <option value="USD">Доллар</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Поиск
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Поиск по теме, описанию..."
                    value={filters.search || ''}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition"
                >
                  Сбросить фильтры
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Expenses Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Тема
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Категория
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Сумма
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Файл
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Создал
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      Нет расходов
                    </td>
                  </tr>
                ) : (
                  expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(expense.date).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{expense.tema}</p>
                          {expense.description && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                              {expense.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          {expense.category_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatNumber(parseFloat(expense.amount))}{' '}
                          {expense.currency === 'UZS' ? 'сум' : '$'}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {expense.attachment_url ? (
                          <a
                            href={expense.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                          >
                            <Download className="w-4 h-4" />
                            <span className="text-sm">Скачать</span>
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">Нет файла</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <p className="text-gray-900">{expense.created_by_username}</p>
                          {expense.updated_by_username && (
                            <p className="text-gray-500 text-xs mt-1">
                              Изм: {expense.updated_by_username}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleView(expense)}
                            className="text-purple-600 hover:text-purple-900"
                            title="Просмотр"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleEdit(expense)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Редактировать"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(expense.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Удалить"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal for Create/Edit */}
      {showModal && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingExpense ? 'Редактировать расход' : 'Новый расход'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Тема расхода *
                  </label>
                  <input
                    type="text"
                    value={formData.tema}
                    onChange={(e) => setFormData({ ...formData, tema: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Категория *
                  </label>
                  
                  {!showNewCategoryForm ? (
                    <>
                      <select
                        value={formData.category || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, category: Number(e.target.value) })
                        }
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-2"
                        required
                      >
                        <option value="">Выберите категорию</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setShowNewCategoryForm(true)}
                          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Plus className="w-4 h-4" /> Добавить новую категорию
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Название категории *
                        </label>
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Например: Транспорт"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Описание (опционально)
                        </label>
                        <input
                          type="text"
                          value={newCategoryDescription}
                          onChange={(e) => setNewCategoryDescription(e.target.value)}
                          placeholder="Краткое описание"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCreateCategory}
                          disabled={creatingCategory || !newCategoryName.trim()}
                          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
                        >
                          {creatingCategory ? 'Создание...' : 'Создать категорию'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewCategoryForm(false);
                            setNewCategoryName('');
                            setNewCategoryDescription('');
                          }}
                          className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Сумма *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Валюта *
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) =>
                        setFormData({ ...formData, currency: e.target.value as CurrencyType })
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    >
                      <option value="UZS">Сум</option>
                      <option value="USD">Доллар</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Дата *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Описание
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Прикрепить файл (PDF, изображения)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) =>
                      setFormData({ ...formData, attachment: e.target.files?.[0] || null })
                    }
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                  {editingExpense?.attachment_url && !formData.attachment && (
                    <p className="text-sm text-gray-500 mt-1">
                      Текущий файл:{' '}
                      <a
                        href={editingExpense.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Открыть
                      </a>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Комментарий
                  </label>
                  <textarea
                    value={formData.comment}
                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
                  >
                    {editingExpense ? 'Обновить' : 'Создать'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-semibold"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Просмотр расхода</h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Main info grid */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Дата</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(viewingExpense.date).toLocaleDateString('ru-RU')}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">Сумма</p>
                  <p className="text-lg font-semibold text-green-600 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    {formatNumber(parseFloat(viewingExpense.amount))}{' '}
                    {viewingExpense.currency === 'UZS' ? 'сум' : '$'}
                  </p>
                </div>

                <div className="col-span-2">
                  <p className="text-sm text-gray-500 mb-1">Категория</p>
                  <span className="inline-block px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded">
                    {viewingExpense.category_name}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">Тема расхода</p>
                <p className="text-lg font-semibold text-gray-900">{viewingExpense.tema}</p>
              </div>

              {viewingExpense.description && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Описание</p>
                  <p className="text-base text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                    {viewingExpense.description}
                  </p>
                </div>
              )}

              {viewingExpense.comment && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Комментарий</p>
                  <p className="text-base text-gray-700 whitespace-pre-wrap bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                    {viewingExpense.comment}
                  </p>
                </div>
              )}

              {viewingExpense.attachment_url && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Прикреплённый файл</p>
                  <a
                    href={viewingExpense.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                  >
                    <FileText className="w-5 h-5" />
                    <span className="font-medium">Открыть файл</span>
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              )}

              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Создал</p>
                    <p className="text-base font-medium text-gray-900">
                      {viewingExpense.created_by_username}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(viewingExpense.created_at).toLocaleString('ru-RU')}
                    </p>
                  </div>

                  {viewingExpense.updated_by_username && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Последнее изменение</p>
                      <p className="text-base font-medium text-gray-900">
                        {viewingExpense.updated_by_username}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(viewingExpense.updated_at).toLocaleString('ru-RU')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
