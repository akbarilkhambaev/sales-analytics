"""
Middleware для аудита действий пользователей
"""

from .models import AuditLog


class AuditMiddleware:
    """
    Middleware для логирования всех запросов пользователей
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        
        # Маппинг путей к ресурсам
        self.resource_mapping = {
            '/api/sales/': 'sales',
            '/api/products/': 'products',
            '/api/groups/': 'groups',
            '/api/hierarchy/': 'hierarchy',
            '/api/colors/': 'colors',
            '/api/clients/': 'clients',
            '/api/dashboard/': 'dashboard',
            '/api/upload/': 'upload',
            '/api/auth/': 'auth',
        }
        
        # Методы и действия
        self.method_action_mapping = {
            'GET': 'VIEW',
            'POST': 'CREATE',
            'PUT': 'UPDATE',
            'PATCH': 'UPDATE',
            'DELETE': 'DELETE',
        }
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Логируем только для аутентифицированных пользователей
        if request.user.is_authenticated and request.path.startswith('/api/'):
            # Пропускаем некоторые пути (логи, токены)
            skip_paths = ['/api/auth/token/', '/api/audit/']
            if not any(skip in request.path for skip in skip_paths):
                self.log_request(request, response)
        
        return response
    
    def log_request(self, request, response):
        """
        Логирование запроса
        """
        try:
            # Определяем ресурс
            resource = 'unknown'
            for path_prefix, resource_name in self.resource_mapping.items():
                if request.path.startswith(path_prefix):
                    resource = resource_name
                    break
            
            # Определяем действие
            action = self.method_action_mapping.get(request.method, 'VIEW')
            
            # Специальные случаи
            if 'export' in request.path.lower():
                action = 'EXPORT'
            elif 'upload' in request.path.lower():
                action = 'UPLOAD'
            elif 'filter' in request.GET:
                action = 'FILTER'
            
            # Собираем детали
            details = {
                'path': request.path,
                'method': request.method,
                'status_code': response.status_code,
            }
            
            # Добавляем query параметры если есть
            if request.GET:
                details['query_params'] = dict(request.GET)
            
            # Получаем IP адрес
            ip_address = self.get_client_ip(request)
            
            # Получаем User Agent
            user_agent = request.META.get('HTTP_USER_AGENT', '')[:255]
            
            # Успешность запроса
            success = 200 <= response.status_code < 400
            
            # Пропускаем логирование обычных VIEW запросов чтобы избежать database lock
            # Логируем только важные действия
            if action == 'VIEW' and success:
                return
            
            # Создаем запись в логе с отдельной транзакцией
            try:
                from django.db import transaction
                with transaction.atomic():
                    AuditLog.objects.create(
                        user=request.user,
                        action=action,
                        resource=resource,
                        details=details,
                        ip_address=ip_address,
                        user_agent=user_agent,
                        success=success,
                        error_message=None if success else f'HTTP {response.status_code}'
                    )
            except Exception as db_error:
                # Если база занята, просто пропускаем
                print(f"Audit log skipped (DB busy): {db_error}")
            
        except Exception as e:
            # Не падаем если логирование не удалось
            print(f"Audit logging error: {e}")
    
    def get_client_ip(self, request):
        """
        Получить IP адрес клиента
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
