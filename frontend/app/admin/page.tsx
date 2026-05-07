'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Home, Upload, FileSpreadsheet, Database, CheckCircle, AlertCircle, Loader2, FileText, Trash2, BookOpen, MapPin, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

type DataType = 'sales' | 'ready_sales';

interface TaskStatus {
  status: 'pending' | 'running' | 'done' | 'error' | 'not_found';
  progress?: number;
  message?: string;
  total?: number;
  processed?: number;
  records_count?: number;
  errors?: string[] | null;
  error?: string;
  uncoded_warning?: string;
  new_uncoded?: string[];
}

export default function AdminPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  // ── Upload state ──────────────────────────────────────────────────────────
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dataType, setDataType] = useState<DataType>('sales');
  const [uploading, setUploading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || user?.role !== 'SUPER_ADMIN') {
      setRedirecting(true);
      window.location.href = isAuthenticated ? '/' : '/login';
    }
  }, [authLoading, isAuthenticated, user]);

  const authHeaders = (): Record<string, string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Polling task status
  useEffect(() => {
    if (!taskId) return;

    const poll = async () => {
      try {
        const res = await fetch(`${apiBase}/upload/status/${taskId}/`, {
          headers: authHeaders(),
        });
        if (!res.ok) return;
        const data: TaskStatus = await res.json();
        setTaskStatus(data);

        if (data.status === 'done' || data.status === 'error') {
          setUploading(false);
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } catch {
        // ignore network errors during polling
      }
    };

    pollRef.current = setInterval(poll, 2000);
    poll(); // immediate first check
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [taskId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setTaskStatus(null);
      setTaskId(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setTaskStatus({ status: 'pending', progress: 0, message: 'Отправка файла на сервер...' });
    setTaskId(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('data_type', dataType);

    try {
      const res = await fetch(`${apiBase}/upload/start/`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.task_id) {
        setTaskId(data.task_id);
        setSelectedFile(null);
      } else {
        setTaskStatus({ status: 'error', error: data.error || 'Ошибка при запуске загрузки' });
        setUploading(false);
      }
    } catch {
      setTaskStatus({ status: 'error', error: 'Ошибка соединения с сервером' });
      setUploading(false);
    }
  };

  const progressPct = taskStatus?.progress ?? 0;
  const isDone = taskStatus?.status === 'done';
  const isError = taskStatus?.status === 'error';

  if (authLoading || redirecting || !isAuthenticated || user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        {authLoading ? (
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        ) : (
          <div className="text-center">
            <ShieldAlert className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Доступ запрещён. Только для главного администратора.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Database className="w-8 h-8" /> Администрирование
            </h1>
            <div className="flex items-center gap-3">
              <Link href="/settings/tovary" className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition flex items-center gap-2">
                <BookOpen className="w-5 h-5" /> Справочник товаров
              </Link>
              <Link href="/settings/regions" className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition flex items-center gap-2">
                <MapPin className="w-5 h-5" /> Справочник регионов
              </Link>
              <Link href="/data-management" className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition flex items-center gap-2">
                <Trash2 className="w-5 h-5" /> Управление данными
              </Link>
              <Link href="/" className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition flex items-center gap-2">
                <Home className="w-5 h-5" /> Главная
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">

          {/* Info Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Продажи (Sales)</h3>
                  <p className="text-sm text-gray-600">
                    Основные данные продаж. Поля: КОД_ТОВАРА, ГРУППА_ТОВАРА, РЕГИОН, СКЛАД, Дата, и т.д.
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start gap-4">
                <div className="bg-green-100 p-3 rounded-lg">
                  <FileSpreadsheet className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">SELLOUT (Ready Sales)</h3>
                  <p className="text-sm text-gray-600">
                    Данные с клиентами. Поля: Дата, Дилер, Клиент, ТОВАРЫ, Вес_кг, и т.д.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Form */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Upload className="w-6 h-6" /> Загрузка данных
            </h2>

            {/* Data Type */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Тип данных</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDataType('sales')}
                  disabled={uploading}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    dataType === 'sales' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Database className={`w-5 h-5 ${dataType === 'sales' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">Sales</div>
                      <div className="text-xs text-gray-500">Основные продажи</div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => setDataType('ready_sales')}
                  disabled={uploading}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    dataType === 'ready_sales' ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileText className={`w-5 h-5 ${dataType === 'ready_sales' ? 'text-green-600' : 'text-gray-400'}`} />
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">Ready Sales (SELLOUT)</div>
                      <div className="text-xs text-gray-500">С клиентами</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* File picker */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Excel файл</label>
              <label className={`block cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  selectedFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'
                }`}>
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Нажмите для выбора файла или перетащите сюда</p>
                      <p className="text-xs text-gray-400 mt-1">Поддерживаются форматы: .xlsx, .xls</p>
                    </div>
                  )}
                </div>
                <input type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />
              </label>
            </div>

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Загрузка в процессе...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Загрузить в базу данных
                </>
              )}
            </button>

            {/* Progress Block */}
            {taskStatus && (uploading || isDone || isError) && (
              <div className={`mt-6 rounded-lg border p-5 ${
                isError ? 'bg-red-50 border-red-200' :
                isDone  ? 'bg-green-50 border-green-200' :
                          'bg-blue-50 border-blue-200'
              }`}>
                {/* Status row */}
                <div className="flex items-center gap-3 mb-3">
                  {isError ? (
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  ) : isDone ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
                  )}
                  <span className={`font-medium text-sm ${
                    isError ? 'text-red-800' : isDone ? 'text-green-800' : 'text-blue-800'
                  }`}>
                    {isError ? (taskStatus.error || 'Ошибка загрузки') : taskStatus.message}
                  </span>
                </div>

                {/* Progress bar */}
                {!isError && (
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${isDone ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                )}
                {!isError && (
                  <p className="text-xs text-gray-500 text-right">{progressPct}%
                    {taskStatus.total ? ` • ${taskStatus.processed?.toLocaleString() ?? 0} / ${taskStatus.total.toLocaleString()} строк` : ''}
                  </p>
                )}

                {/* Done summary */}
                {isDone && taskStatus.records_count !== undefined && (
                  <p className="mt-2 text-sm font-semibold text-green-700">
                    ✓ Загружено {taskStatus.records_count.toLocaleString()} записей
                  </p>
                )}

                {/* Uncoded warning */}
                {isDone && taskStatus.uncoded_warning && (
                  <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded p-3 text-xs text-yellow-800">
                    ⚠ {taskStatus.uncoded_warning}
                  </div>
                )}

                {/* Errors */}
                {isDone && taskStatus.errors && taskStatus.errors.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-red-700 mb-1">Ошибки при обработке строк:</p>
                    <ul className="text-xs text-red-600 list-disc list-inside space-y-0.5">
                      {taskStatus.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Инструкция по загрузке
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• Загрузка выполняется <strong>в фоне</strong> — страницу можно не закрывать, прогресс обновляется каждые 2 сек</li>
              <li>• Для Sales: обязательны колонки <b>ТОВАРЫ</b> и <b>Дата</b></li>
              <li>• Для Ready Sales (SELLOUT): обязательны <b>Дата</b> и <b>Клиент</b></li>
              <li>• КОД_ТОВАРА, ГРУППА_ТОВАРА, ЦВЕТ подтянутся автоматически из справочника</li>
              <li>• При ошибках вы получите подробный отчет</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

