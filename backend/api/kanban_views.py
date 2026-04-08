from django.contrib.auth.models import User
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import KanbanColumn, KanbanTask
from .serializers import KanbanColumnSerializer, KanbanTaskSerializer, UserBriefSerializer
from authentication.permissions import IsAdmin


class KanbanColumnViewSet(viewsets.ModelViewSet):
    """Управление колонками доски задач"""

    queryset = KanbanColumn.objects.prefetch_related('tasks__assignee', 'tasks__created_by').all()
    serializer_class = KanbanColumnSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'reorder']:
            return [IsAdmin()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['post'], url_path='reorder')
    def reorder(self, request):
        """Изменить порядок колонок. Body: [{"id": 1, "order": 0}, ...]"""
        for item in request.data:
            KanbanColumn.objects.filter(pk=item['id']).update(order=item['order'])
        return Response({'status': 'ok'})


class KanbanTaskViewSet(viewsets.ModelViewSet):
    """Управление задачами"""

    queryset = KanbanTask.objects.select_related(
        'column', 'assignee', 'created_by'
    ).all()
    serializer_class = KanbanTaskSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        column_id = self.request.query_params.get('column')
        if column_id:
            qs = qs.filter(column_id=column_id)
        assignee_id = self.request.query_params.get('assignee')
        if assignee_id:
            qs = qs.filter(assignee_id=assignee_id)
        return qs

    @action(detail=False, methods=['post'], url_path='move')
    def move(self, request):
        """
        Переместить задачу в другую колонку и изменить порядок.
        Body: {
            "task_id": 5,
            "column_id": 2,
            "order": 1,
            "sibling_orders": [{"id": 3, "order": 0}, {"id": 5, "order": 1}]
        }
        """
        task_id = request.data.get('task_id')
        column_id = request.data.get('column_id')
        sibling_orders = request.data.get('sibling_orders', [])

        try:
            task = KanbanTask.objects.get(pk=task_id)
        except KanbanTask.DoesNotExist:
            return Response({'error': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)

        task.column_id = column_id
        task.order = request.data.get('order', task.order)
        task.save(update_fields=['column_id', 'order'])

        for item in sibling_orders:
            KanbanTask.objects.filter(pk=item['id']).update(order=item['order'])

        serializer = self.get_serializer(task)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], url_path='progress')
    def update_progress(self, request, pk=None):
        """Обновить прогресс задачи. Body: {"progress": 75}"""
        task = self.get_object()
        progress = request.data.get('progress')
        if progress is None or not (0 <= int(progress) <= 100):
            return Response({'error': 'progress must be 0–100'}, status=400)
        task.progress = int(progress)
        task.save(update_fields=['progress'])
        return Response(self.get_serializer(task).data)


class KanbanUsersView(viewsets.ReadOnlyModelViewSet):
    """Список пользователей (для назначения исполнителя)"""

    queryset = User.objects.filter(is_active=True).select_related('profile')
    serializer_class = UserBriefSerializer
    permission_classes = [IsAuthenticated]
