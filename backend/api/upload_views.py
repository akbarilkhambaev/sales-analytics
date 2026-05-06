import pandas as pd
import json
import uuid
import threading
import tempfile
import os
from datetime import datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from django.db import transaction
from django.core.cache import cache
from authentication.permissions import CanUpload
from .models import Sale, ReadySale, TovaryMapping, SchetaMapping

TASK_TTL = 7200  # 2 часа


def _set_task(task_id, data):
    cache.set(task_id, data, TASK_TTL)


def _process_sales_bg(task_id, df):
    """Фоновая обработка Sales с прогрессом"""
    required_columns = ['ТОВАРЫ', 'Дата']
    missing_columns = [col for col in required_columns if col not in df.columns]
    if missing_columns:
        _set_task(task_id, {
            'status': 'error',
            'error': f'Отсутствуют колонки: {", ".join(missing_columns)}',
            'available_columns': list(df.columns),
        })
        return

    mapping_cache = {m.tovary: m for m in TovaryMapping.objects.all()}
    scheta_cache = set(SchetaMapping.objects.values_list('scheta', flat=True))

    total = len(df)
    errors = []
    new_uncoded = []
    sales_to_create = []
    new_mapping_to_create = []

    BATCH = 1000
    for index, row in df.iterrows():
        try:
            tovary_val = str(row.get('ТОВАРЫ', '')).strip() if pd.notna(row.get('ТОВАРЫ')) else ''
            kod_val    = str(row.get('КОД_ТОВАРА', '')).strip() if pd.notna(row.get('КОД_ТОВАРА')) else ''

            if not tovary_val and not kod_val:
                continue

            m = mapping_cache.get(tovary_val) if tovary_val else None
            resolved_kod    = kod_val or (m.kod_tovara      if m else None)
            resolved_gruppa = (str(row.get('ГРУППА_ТОВАРА', '')).strip() if pd.notna(row.get('ГРУППА_ТОВАРА')) else '') or (m.gruppa_tovara   if m else None)
            resolved_cvet   = (str(row.get('ЦВЕТ', '')).strip()           if pd.notna(row.get('ЦВЕТ'))           else '') or (m.cvet            if m else None)
            resolved_profil = (str(row.get('профиль_перечень', '')).strip() if pd.notna(row.get('профиль_перечень')) else '') or (m.profil_perechen if m else None)

            if tovary_val and not m:
                new_uncoded.append(tovary_val)
                new_m = TovaryMapping(
                    tovary=tovary_val,
                    kod_tovara=resolved_kod or None,
                    gruppa_tovara=resolved_gruppa or None,
                    cvet=resolved_cvet or None,
                    profil_perechen=resolved_profil or None,
                )
                mapping_cache[tovary_val] = new_m
                new_mapping_to_create.append(new_m)

            sales_to_create.append(Sale(
                kod_tovara=resolved_kod or None,
                gruppa_tovara=resolved_gruppa or None,
                region=str(row.get('РЕГИОН', '')).strip() if pd.notna(row.get('РЕГИОН')) else None,
                sklad=str(row.get('СКЛАД', '')).strip() if pd.notna(row.get('СКЛАД')) else None,
                scheta=str(row.get('СЧЕТЫ', '')).strip() if pd.notna(row.get('СЧЕТЫ')) else None,
                data=str(row.get('Дата', '')) if pd.notna(row.get('Дата')) else None,
                dopoln_kol_vo=str(row.get('ДОПОЛН__КОЛ-ВО', '')) if pd.notna(row.get('ДОПОЛН__КОЛ-ВО')) else None,
                uch_kol_vo=str(row.get('УЧИТЫВАЯ_КОЛ-ВО', '')) if pd.notna(row.get('УЧИТЫВАЯ_КОЛ-ВО')) else None,
                tovary=tovary_val or None,
                cvet=resolved_cvet or None,
                profil_perechen=resolved_profil or None,
            ))
        except Exception as e:
            errors.append(f'Строка {index + 2}: {str(e)}')
            if len(errors) > 10:
                errors.append('...и другие ошибки')
                break

        # Обновляем прогресс каждые BATCH строк
        if (index + 1) % BATCH == 0:
            pct = int((index + 1) / total * 80)  # до 80% — парсинг
            _set_task(task_id, {
                'status': 'running',
                'progress': pct,
                'message': f'Обработано {index + 1} из {total} строк...',
                'total': total,
                'processed': index + 1,
            })

    _set_task(task_id, {'status': 'running', 'progress': 82, 'message': 'Сохранение справочника...', 'total': total})

    with transaction.atomic():
        if new_mapping_to_create:
            TovaryMapping.objects.bulk_create(new_mapping_to_create, ignore_conflicts=True)

        new_schetas = [
            SchetaMapping(scheta=s.scheta)
            for s in sales_to_create
            if s.scheta and s.scheta not in scheta_cache
        ]
        seen = set()
        unique_new_schetas = [
            sm for sm in new_schetas
            if sm.scheta not in seen and not seen.add(sm.scheta)
        ]
        if unique_new_schetas:
            SchetaMapping.objects.bulk_create(unique_new_schetas, ignore_conflicts=True)

        _set_task(task_id, {'status': 'running', 'progress': 90, 'message': f'Запись в БД ({len(sales_to_create)} записей)...', 'total': total})
        if sales_to_create:
            Sale.objects.bulk_create(sales_to_create, batch_size=500)

    result = {
        'status': 'done',
        'progress': 100,
        'message': f'Успешно загружено {len(sales_to_create)} записей',
        'records_count': len(sales_to_create),
        'errors': errors if errors else None,
    }
    if new_uncoded:
        result['uncoded_warning'] = (
            f'Внимание: {len(new_uncoded)} новых товаров не найдены в справочнике. '
            'Закодируйте их в Справочник товаров'
        )
        result['new_uncoded'] = new_uncoded[:20]
    _set_task(task_id, result)


def _process_ready_sales_bg(task_id, df):
    """Фоновая обработка ReadySales с bulk_create и прогрессом"""
    required_columns = ['Дата', 'Клиент']
    missing_columns = [col for col in required_columns if col not in df.columns]
    if missing_columns:
        _set_task(task_id, {
            'status': 'error',
            'error': f'Отсутствуют колонки: {", ".join(missing_columns)}',
            'available_columns': list(df.columns),
        })
        return

    mapping_cache = {m.tovary: m for m in TovaryMapping.objects.all()}
    total = len(df)
    errors = []
    records_to_create = []
    year = None
    BATCH = 1000

    for index, row in df.iterrows():
        try:
            if pd.isna(row.get('Клиент')) or row.get('Клиент') == '':
                continue

            date_value = row.get('Дата')
            parsed_date = None
            if pd.notna(date_value):
                if isinstance(date_value, str):
                    try:
                        parsed_date = pd.to_datetime(date_value).date()
                    except Exception:
                        parsed_date = None
                elif isinstance(date_value, (pd.Timestamp, datetime)):
                    parsed_date = date_value.date() if hasattr(date_value, 'date') else date_value
                if parsed_date and not year:
                    year = parsed_date.year

            tovary_val  = str(row.get('ТОВАРЫ', '')).strip()  if pd.notna(row.get('ТОВАРЫ'))  else ''
            produkt_val = str(row.get('Продукт', '')).strip() if pd.notna(row.get('Продукт')) else ''
            kod_val     = str(row.get('КОД_ТОВАРА', '')).strip() if pd.notna(row.get('КОД_ТОВАРА')) else ''

            m = mapping_cache.get(produkt_val) or (mapping_cache.get(tovary_val) if tovary_val else None)
            resolved_kod    = kod_val or (m.kod_tovara      if m else None)
            resolved_gruppa = (str(row.get('Группа_товара', '')).strip() if pd.notna(row.get('Группа_товара')) else '') or (m.gruppa_tovara if m else None)
            resolved_cvet   = (str(row.get('ЦВЕТ', '')).strip()           if pd.notna(row.get('ЦВЕТ'))          else '') or (m.cvet           if m else None)
            resolved_profil = (str(row.get('профиль_перечень', '')).strip() if pd.notna(row.get('профиль_перечень')) else '') or (m.profil_perechen if m else None)

            records_to_create.append(ReadySale(
                data=parsed_date,
                diler=str(row.get('Дилер', ''))          if pd.notna(row.get('Дилер'))          else None,
                region=str(row.get('Регион', '')).strip() if pd.notna(row.get('Регион'))         else None,
                klient_id=float(row.get('Клиент_ИД'))    if pd.notna(row.get('Клиент_ИД'))      else None,
                klient=str(row.get('Клиент', '')),
                invoice_sid=int(row.get('Инвоиcе_CИД'))  if pd.notna(row.get('Инвоиcе_CИД'))   else None,
                tip=str(row.get('Тип', ''))               if pd.notna(row.get('Тип'))            else None,
                tip_organizacii=str(row.get('Тип_организации', '')) if pd.notna(row.get('Тип_организации')) else None,
                produkt=str(row.get('Продукт', ''))       if pd.notna(row.get('Продукт'))        else None,
                gruppa_produktov=str(row.get('Группа_продуктов', '')) if pd.notna(row.get('Группа_продуктов')) else None,
                kolichestvo=float(row.get('Количество'))  if pd.notna(row.get('Количество'))     else None,
                ves_kg=float(row.get('Вес_кг'))           if pd.notna(row.get('Вес_кг'))         else None,
                obshchaya_summa=float(row.get('Общая_сумма')) if pd.notna(row.get('Общая_сумма')) else None,
                dokhod=float(row.get('Доход'))            if pd.notna(row.get('Доход'))          else None,
                valyuta=str(row.get('Валюта', ''))        if pd.notna(row.get('Валюта'))         else None,
                tovary=tovary_val or None,
                kod_tovara=resolved_kod or None,
                gruppa_tovara=resolved_gruppa or None,
                cvet=resolved_cvet or None,
                profil_perechen=resolved_profil or None,
                year=year,
                sheet_name=None,
            ))
        except Exception as e:
            errors.append(f'Строка {index + 2}: {str(e)}')
            if len(errors) > 10:
                errors.append('...и другие ошибки')
                break

        if (index + 1) % BATCH == 0:
            pct = int((index + 1) / total * 80)
            _set_task(task_id, {
                'status': 'running',
                'progress': pct,
                'message': f'Обработано {index + 1} из {total} строк...',
                'total': total,
                'processed': index + 1,
            })

    _set_task(task_id, {'status': 'running', 'progress': 85, 'message': f'Запись в БД ({len(records_to_create)} записей)...', 'total': total})

    with transaction.atomic():
        # bulk_create батчами по 2000
        chunk_size = 2000
        saved = 0
        for i in range(0, len(records_to_create), chunk_size):
            chunk = records_to_create[i:i + chunk_size]
            ReadySale.objects.bulk_create(chunk, batch_size=chunk_size)
            saved += len(chunk)
            pct = 85 + int(saved / len(records_to_create) * 13)
            _set_task(task_id, {
                'status': 'running',
                'progress': pct,
                'message': f'Сохранено {saved} из {len(records_to_create)}...',
                'total': total,
                'processed': saved,
            })

    _set_task(task_id, {
        'status': 'done',
        'progress': 100,
        'message': f'Успешно загружено {len(records_to_create)} записей',
        'records_count': len(records_to_create),
        'errors': errors if errors else None,
    })


def _run_upload_task(task_id, tmp_path, data_type):
    """Точка входа фоновой задачи"""
    from django.db import connection
    try:
        _set_task(task_id, {'status': 'running', 'progress': 2, 'message': 'Читаем Excel файл...'})
        df = pd.read_excel(tmp_path)
        total = len(df)
        _set_task(task_id, {'status': 'running', 'progress': 10, 'message': f'Файл прочитан: {total} строк', 'total': total})

        if data_type == 'sales':
            _process_sales_bg(task_id, df)
        elif data_type == 'ready_sales':
            _process_ready_sales_bg(task_id, df)
        else:
            _set_task(task_id, {'status': 'error', 'error': f'Неизвестный тип данных: {data_type}'})
    except Exception as e:
        _set_task(task_id, {'status': 'error', 'error': f'Ошибка при обработке файла: {str(e)}'})
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass
        connection.close()


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
        required_columns = ['ТОВАРЫ', 'Дата']
        
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
        new_uncoded = []

        # Загружаем справочники целиком в память
        mapping_cache = {m.tovary: m for m in TovaryMapping.objects.all()}
        scheta_cache = set(SchetaMapping.objects.values_list('scheta', flat=True))
        
        try:
            with transaction.atomic():
                sales_to_create = []
                new_mapping_to_create = []

                for index, row in df.iterrows():
                    try:
                        tovary_val = str(row.get('ТОВАРЫ', '')).strip() if pd.notna(row.get('ТОВАРЫ')) else ''
                        kod_val    = str(row.get('КОД_ТОВАРА', '')).strip() if pd.notna(row.get('КОД_ТОВАРА')) else ''

                        if not tovary_val and not kod_val:
                            continue

                        m = mapping_cache.get(tovary_val) if tovary_val else None

                        resolved_kod    = kod_val or (m.kod_tovara      if m else None)
                        resolved_gruppa = (str(row.get('ГРУППА_ТОВАРА', '')).strip() if pd.notna(row.get('ГРУППА_ТОВАРА')) else '') or (m.gruppa_tovara   if m else None)
                        resolved_cvet   = (str(row.get('ЦВЕТ', '')).strip()           if pd.notna(row.get('ЦВЕТ'))           else '') or (m.cvet            if m else None)
                        resolved_profil = (str(row.get('профиль_перечень', '')).strip() if pd.notna(row.get('профиль_перечень')) else '') or (m.profil_perechen if m else None)

                        if tovary_val and not m:
                            new_uncoded.append(tovary_val)
                            new_m = TovaryMapping(
                                tovary=tovary_val,
                                kod_tovara=resolved_kod or None,
                                gruppa_tovara=resolved_gruppa or None,
                                cvet=resolved_cvet or None,
                                profil_perechen=resolved_profil or None,
                            )
                            mapping_cache[tovary_val] = new_m
                            new_mapping_to_create.append(new_m)

                        sales_to_create.append(Sale(
                            kod_tovara=resolved_kod or None,
                            gruppa_tovara=resolved_gruppa or None,
                            region=str(row.get('РЕГИОН', '')).strip() if pd.notna(row.get('РЕГИОН')) else None,
                            sklad=str(row.get('СКЛАД', '')).strip() if pd.notna(row.get('СКЛАД')) else None,
                            scheta=str(row.get('СЧЕТЫ', '')).strip() if pd.notna(row.get('СЧЕТЫ')) else None,
                            data=str(row.get('Дата', '')) if pd.notna(row.get('Дата')) else None,
                            dopoln_kol_vo=str(row.get('ДОПОЛН__КОЛ-ВО', '')) if pd.notna(row.get('ДОПОЛН__КОЛ-ВО')) else None,
                            uch_kol_vo=str(row.get('УЧИТЫВАЯ_КОЛ-ВО', '')) if pd.notna(row.get('УЧИТЫВАЯ_КОЛ-ВО')) else None,
                            tovary=tovary_val or None,
                            cvet=resolved_cvet or None,
                            profil_perechen=resolved_profil or None,
                        ))
                    except Exception as e:
                        errors.append(f'Строка {index + 2}: {str(e)}')
                        if len(errors) > 10:
                            errors.append('...и другие ошибки')
                            break

                if new_mapping_to_create:
                    TovaryMapping.objects.bulk_create(new_mapping_to_create, ignore_conflicts=True)

                # Авто-добавление новых счетов в SchetaMapping
                new_schetas = [
                    SchetaMapping(scheta=s.scheta)
                    for s in sales_to_create
                    if s.scheta and s.scheta not in scheta_cache
                ]
                seen = set()
                unique_new_schetas = []
                for sm in new_schetas:
                    if sm.scheta not in seen:
                        seen.add(sm.scheta)
                        unique_new_schetas.append(sm)
                if unique_new_schetas:
                    SchetaMapping.objects.bulk_create(unique_new_schetas, ignore_conflicts=True)

                if sales_to_create:
                    Sale.objects.bulk_create(sales_to_create, batch_size=500)
                records_added = len(sales_to_create)
            
            response_data = {
                'message': f'Успешно загружено {records_added} записей',
                'records_count': records_added,
                'errors': errors if errors else None,
            }
            if new_uncoded:
                response_data['uncoded_warning'] = (
                    f'Внимание: {len(new_uncoded)} новых товаров не найдены в справочнике. '
                    'Закодируйте их в Раздел → Справочник товаров'
                )
                response_data['new_uncoded'] = new_uncoded[:20]  # показываем макс 20
            return Response(response_data)
            
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
        mapping_cache = {m.tovary: m for m in TovaryMapping.objects.all()}
        
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
                        
                        tovary_val = str(row.get('ТОВАРЫ', '')).strip() if pd.notna(row.get('ТОВАРЫ')) else ''
                        produkt_val = str(row.get('Продукт', '')).strip() if pd.notna(row.get('Продукт')) else ''
                        kod_val = str(row.get('КОД_ТОВАРА', '')).strip() if pd.notna(row.get('КОД_ТОВАРА')) else ''
                        # Маппинг ищем сначала по полному названию продукта, затем по ТОВАРЫ
                        m = mapping_cache.get(produkt_val) or (mapping_cache.get(tovary_val) if tovary_val else None)

                        resolved_kod = kod_val or (m.kod_tovara if m else None)
                        resolved_gruppa = (str(row.get('Группа_товара', '')).strip() if pd.notna(row.get('Группа_товара')) else '') or (m.gruppa_tovara if m else None)
                        resolved_cvet = (str(row.get('ЦВЕТ', '')).strip() if pd.notna(row.get('ЦВЕТ')) else '') or (m.cvet if m else None)
                        resolved_profil = (str(row.get('профиль_перечень', '')).strip() if pd.notna(row.get('профиль_перечень')) else '') or (m.profil_perechen if m else None)

                        ready_sale = ReadySale(
                            data=parsed_date,
                            diler=str(row.get('Дилер', '')) if pd.notna(row.get('Дилер')) else None,
                            region=str(row.get('Регион', '')).strip() if pd.notna(row.get('Регион')) else None,
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
                            tovary=tovary_val or None,
                            kod_tovara=resolved_kod or None,
                            gruppa_tovara=resolved_gruppa or None,
                            cvet=resolved_cvet or None,
                            profil_perechen=resolved_profil or None,
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


class AsyncExcelUploadView(APIView):
    """Запускает загрузку в фоне и немедленно возвращает task_id"""
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [CanUpload]

    def post(self, request):
        if 'file' not in request.FILES:
            return Response({'error': 'Файл не найден'}, status=status.HTTP_400_BAD_REQUEST)

        file = request.FILES['file']
        data_type = request.POST.get('data_type', 'sales')

        if not file.name.endswith(('.xlsx', '.xls')):
            return Response({'error': 'Используйте .xlsx или .xls'}, status=status.HTTP_400_BAD_REQUEST)

        if data_type not in ('sales', 'ready_sales'):
            return Response({'error': f'Неизвестный тип данных: {data_type}'}, status=status.HTTP_400_BAD_REQUEST)

        # Сохраняем файл во временный файл (request stream закроется после ответа)
        suffix = '.xlsx' if file.name.endswith('.xlsx') else '.xls'
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        try:
            for chunk in file.chunks():
                tmp.write(chunk)
        finally:
            tmp.close()

        task_id = f'upload_{uuid.uuid4().hex}'
        _set_task(task_id, {
            'status': 'pending',
            'progress': 0,
            'message': 'Задача поставлена в очередь...',
        })

        t = threading.Thread(target=_run_upload_task, args=(task_id, tmp.name, data_type), daemon=True)
        t.start()

        return Response({'task_id': task_id, 'status': 'pending'})


class UploadStatusView(APIView):
    """Возвращает текущий статус задачи загрузки"""
    permission_classes = [CanUpload]

    def get(self, request, task_id):
        data = cache.get(task_id)
        if data is None:
            return Response({'status': 'not_found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(data)


class DataManagementView(APIView):
    """Просмотр и удаление записей по диапазону дат (только Admin)"""
    permission_classes = [CanUpload]

    def _build_querysets(self, model_choice, date_from, date_to):
        result = {}
        if model_choice in ('sale', 'both'):
            qs = Sale.objects.all()
            if date_from:
                qs = qs.filter(data__gte=date_from)
            if date_to:
                qs = qs.filter(data__lte=date_to)
            result['sale'] = qs
        if model_choice in ('ready_sale', 'both'):
            qs = ReadySale.objects.all()
            if date_from:
                qs = qs.filter(data__gte=date_from)
            if date_to:
                qs = qs.filter(data__lte=date_to)
            result['ready_sale'] = qs
        return result

    def post(self, request):
        action = request.data.get('action')               # 'preview' | 'delete'
        model_choice = request.data.get('model', 'both')  # 'sale' | 'ready_sale' | 'both'
        date_from = request.data.get('date_from', '')
        date_to = request.data.get('date_to', '')

        if model_choice not in ('sale', 'ready_sale', 'both'):
            return Response({'error': 'Неверное значение model'}, status=status.HTTP_400_BAD_REQUEST)
        if not date_from and not date_to:
            return Response({'error': 'Укажите хотя бы одну дату'}, status=status.HTTP_400_BAD_REQUEST)

        querysets = self._build_querysets(model_choice, date_from, date_to)

        if action == 'preview':
            counts = {name: qs.count() for name, qs in querysets.items()}
            return Response({'counts': counts, 'total': sum(counts.values())})

        elif action == 'delete':
            deleted_counts = {}
            with transaction.atomic():
                for name, qs in querysets.items():
                    deleted_counts[name] = qs.count()
                    qs.delete()
            return Response({
                'deleted': deleted_counts,
                'total': sum(deleted_counts.values()),
                'message': f'Удалено {sum(deleted_counts.values())} записей',
            })

        return Response({'error': 'action должен быть preview или delete'}, status=status.HTTP_400_BAD_REQUEST)
