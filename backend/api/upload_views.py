import pandas as pd
import json
from datetime import datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from django.db import transaction
from authentication.permissions import CanUpload
from .models import Sale, ReadySale


class ExcelUploadView(APIView):
    """View для загрузки Excel файлов в базу данных"""
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [CanUpload]  # Только администраторы могут загружать данные
    
    def post(self, request):
        """Обработка загруженного Excel файла"""
        
        if 'file' not in request.FILES:
            return Response(
                {'error': 'Файл не найден'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        file = request.FILES['file']
        data_type = request.POST.get('data_type', 'sales')
        
        # Проверка формата файла
        if not file.name.endswith(('.xlsx', '.xls')):
            return Response(
                {'error': 'Неподдерживаемый формат файла. Используйте .xlsx или .xls'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Читаем Excel файл
            df = pd.read_excel(file)
            
            if data_type == 'sales':
                return self._process_sales_data(df)
            elif data_type == 'ready_sales':
                return self._process_ready_sales_data(df)
            else:
                return Response(
                    {'error': f'Неизвестный тип данных: {data_type}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            return Response(
                {'error': f'Ошибка при обработке файла: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _process_sales_data(self, df):
        """Обработка данных Sales"""
        required_columns = ['КОД_ТОВАРА', 'Дата']
        
        # Проверка наличия обязательных колонок
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            return Response(
                {
                    'error': f'Отсутствуют обязательные колонки: {", ".join(missing_columns)}',
                    'available_columns': list(df.columns)
                }, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        records_added = 0
        errors = []
        
        try:
            with transaction.atomic():
                for index, row in df.iterrows():
                    try:
                        # Пропускаем строки без кода товара
                        if pd.isna(row.get('КОД_ТОВАРА')) or row.get('КОД_ТОВАРА') == '':
                            continue
                        
                        sale = Sale(
                            kod_tovara=str(row.get('КОД_ТОВАРА', '')),
                            gruppa_tovara=str(row.get('ГРУППА_ТОВАРА', '')) if pd.notna(row.get('ГРУППА_ТОВАРА')) else None,
                            region=str(row.get('РЕГИОН', '')) if pd.notna(row.get('РЕГИОН')) else None,
                            sklad=str(row.get('СКЛАД', '')) if pd.notna(row.get('СКЛАД')) else None,
                            scheta=str(row.get('СЧЕТЫ', '')) if pd.notna(row.get('СЧЕТЫ')) else None,
                            data=str(row.get('Дата', '')) if pd.notna(row.get('Дата')) else None,
                            dopoln_kol_vo=str(row.get('ДОПОЛН__КОЛ-ВО', '')) if pd.notna(row.get('ДОПОЛН__КОЛ-ВО')) else None,
                            tovary=str(row.get('ТОВАРЫ', '')) if pd.notna(row.get('ТОВАРЫ')) else None,
                            cvet=str(row.get('ЦВЕТ', '')) if pd.notna(row.get('ЦВЕТ')) else None,
                            profil_perechen=str(row.get('профиль_перечень', '')) if pd.notna(row.get('профиль_перечень')) else None,
                        )
                        sale.save()
                        records_added += 1
                    except Exception as e:
                        errors.append(f'Строка {index + 2}: {str(e)}')
                        if len(errors) > 10:  # Ограничиваем количество ошибок
                            errors.append('...и другие ошибки')
                            break
            
            return Response({
                'message': f'Успешно загружено {records_added} записей',
                'records_count': records_added,
                'errors': errors if errors else None
            })
            
        except Exception as e:
            return Response(
                {'error': f'Ошибка при сохранении данных: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _process_ready_sales_data(self, df):
        """Обработка данных Ready Sales"""
        required_columns = ['Дата', 'Клиент']
        
        # Проверка наличия обязательных колонок
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            return Response(
                {
                    'error': f'Отсутствуют обязательные колонки: {", ".join(missing_columns)}',
                    'available_columns': list(df.columns)
                }, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        records_added = 0
        errors = []
        
        # Определяем год и лист из имени файла или данных
        year = None
        sheet_name = None
        
        try:
            with transaction.atomic():
                for index, row in df.iterrows():
                    try:
                        # Пропускаем строки без клиента
                        if pd.isna(row.get('Клиент')) or row.get('Клиент') == '':
                            continue
                        
                        # Парсим дату
                        date_value = row.get('Дата')
                        parsed_date = None
                        if pd.notna(date_value):
                            if isinstance(date_value, str):
                                try:
                                    parsed_date = pd.to_datetime(date_value).date()
                                except:
                                    parsed_date = None
                            elif isinstance(date_value, (pd.Timestamp, datetime)):
                                parsed_date = date_value.date() if hasattr(date_value, 'date') else date_value
                            
                            # Определяем год
                            if parsed_date and not year:
                                year = parsed_date.year
                        
                        ready_sale = ReadySale(
                            data=parsed_date,
                            diler=str(row.get('Дилер', '')) if pd.notna(row.get('Дилер')) else None,
                            klient_id=float(row.get('Клиент_ИД')) if pd.notna(row.get('Клиент_ИД')) else None,
                            klient=str(row.get('Клиент', '')),
                            invoice_sid=int(row.get('Инвоиcе_CИД')) if pd.notna(row.get('Инвоиcе_CИД')) else None,
                            tip=str(row.get('Тип', '')) if pd.notna(row.get('Тип')) else None,
                            tip_organizacii=str(row.get('Тип_организации', '')) if pd.notna(row.get('Тип_организации')) else None,
                            produkt=str(row.get('Продукт', '')) if pd.notna(row.get('Продукт')) else None,
                            gruppa_produktov=str(row.get('Группа_продуктов', '')) if pd.notna(row.get('Группа_продуктов')) else None,
                            kolichestvo=float(row.get('Количество')) if pd.notna(row.get('Количество')) else None,
                            ves_kg=float(row.get('Вес_кг')) if pd.notna(row.get('Вес_кг')) else None,
                            obshchaya_summa=float(row.get('Общая_сумма')) if pd.notna(row.get('Общая_сумма')) else None,
                            dokhod=float(row.get('Доход')) if pd.notna(row.get('Доход')) else None,
                            valyuta=str(row.get('Валюта', '')) if pd.notna(row.get('Валюта')) else None,
                            tovary=str(row.get('ТОВАРЫ', '')) if pd.notna(row.get('ТОВАРЫ')) else None,
                            year=year,
                            sheet_name=sheet_name,
                        )
                        ready_sale.save()
                        records_added += 1
                    except Exception as e:
                        errors.append(f'Строка {index + 2}: {str(e)}')
                        if len(errors) > 10:
                            errors.append('...и другие ошибки')
                            break
            
            return Response({
                'message': f'Успешно загружено {records_added} записей',
                'records_count': records_added,
                'errors': errors if errors else None
            })
            
        except Exception as e:
            return Response(
                {'error': f'Ошибка при сохранении данных: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
