'use client';

import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExportToExcelProps {
  data: unknown[];
  filename: string;
  sheetName?: string;
  buttonText?: string;
}

export default function ExportToExcel({ 
  data, 
  filename, 
  sheetName = 'Sheet1',
  buttonText = 'Экспорт в Excel'
}: ExportToExcelProps) {
  const handleExport = () => {
    if (!data || data.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }

    try {
      // Создаем рабочую книгу
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      // Генерируем имя файла с датой
      const date = new Date().toISOString().split('T')[0];
      const fullFilename = `${filename}_${date}.xlsx`;

      // Сохраняем файл
      XLSX.writeFile(workbook, fullFilename);
    } catch (error) {
      console.error('Ошибка экспорта:', error);
      alert('Ошибка при экспорте данных');
    }
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
    >
      <Download className="w-4 h-4" />
      {buttonText}
    </button>
  );
}
