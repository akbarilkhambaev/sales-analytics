'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Home, Upload, FileSpreadsheet, Database, CheckCircle, AlertCircle, Loader2, FileText, Trash2, BookOpen } from 'lucide-react';

interface UploadResult {
  success: boolean;
  message: string;
  records?: number;
  errors?: string[];
}

export default function AdminPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [dataType, setDataType] = useState<'sales' | 'ready_sales'>('sales');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('data_type', dataType);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const response = await fetch(`${apiBase}/upload/excel/`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult({
          success: true,
          message: data.message || 'Файл успешно загружен',
          records: data.records_count,
        });
        setSelectedFile(null);
      } else {
        setResult({
          success: false,
          message: data.error || 'Ошибка при загрузке файла',
          errors: data.errors,
        });
      }
    } catch {
      setResult({
        success: false,
        message: 'Ошибка соединения с сервером',
      });
    } finally {
      setUploading(false);
    }
  };

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
              <Link
                href="/settings/tovary"
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition flex items-center gap-2"
              >
                <BookOpen className="w-5 h-5" /> Справочник товаров
              </Link>
              <Link
                href="/data-management"
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition flex items-center gap-2"
              >
                <Trash2 className="w-5 h-5" /> Управление данными
              </Link>
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
                    Основные данные продаж 2020-2025. Поля: КОД_ТОВАРА, ГРУППА_ТОВАРА, РЕГИОН, СКЛАД, Дата, и т.д.
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
                  <h3 className="font-semibold text-gray-900 mb-2">Готовые продажи (Ready Sales)</h3>
                  <p className="text-sm text-gray-600">
                    Данные 2024-2025 с клиентами. Поля: Дата, Дилер, Клиент, ТОВАРЫ, Вес_кг, и т.д.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Form */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Upload className="w-6 h-6" />
              Загрузка данных
            </h2>

            {/* Data Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Тип данных
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDataType('sales')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    dataType === 'sales'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
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
                  className={`p-4 rounded-lg border-2 transition-all ${
                    dataType === 'ready_sales'
                      ? 'border-green-600 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileText className={`w-5 h-5 ${dataType === 'ready_sales' ? 'text-green-600' : 'text-gray-400'}`} />
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">Ready Sales</div>
                      <div className="text-xs text-gray-500">С клиентами 2024-2025</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* File Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Excel файл
              </label>
              <div className="flex items-center gap-4">
                <label className="flex-1 cursor-pointer">
                  <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    selectedFile 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}>
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">
                          Нажмите для выбора файла или перетащите сюда
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Поддерживаются форматы: .xlsx, .xls
                        </p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>
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
                  Загрузка...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Загрузить в базу данных
                </>
              )}
            </button>

            {/* Result Message */}
            {result && (
              <div className={`mt-6 p-4 rounded-lg ${
                result.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`font-medium ${
                      result.success ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {result.message}
                    </p>
                    {result.records && (
                      <p className="text-sm text-green-700 mt-1">
                        Загружено записей: {result.records}
                      </p>
                    )}
                    {result.errors && result.errors.length > 0 && (
                      <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                        {result.errors.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Инструкция по загрузке
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• Убедитесь, что структура Excel файла соответствует формату базы данных</li>
              <li>• Для Sales: обязательны колонки <b>ТОВАРЫ</b> и <b>Дата</b>. КОД_ТОВАРА, ГРУППА_ТОВАРА, ЦВЕТ, профиль_перечень — подтянутся автоматически из справочника</li>
              <li>• Для Ready Sales: должны быть колонки Дата, Дилер, Клиент, ТОВАРЫ, Вес_кг</li>
              <li>• Файл будет автоматически обработан и данные добавлены в базу</li>
              <li>• В случае ошибок вы получите подробный отчет</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
