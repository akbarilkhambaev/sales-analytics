"""
API для управления секторами (мультисекторная система).

Правила доступа:
  GET  /api/sectors/          - все аутентифицированные (список активных)
  POST /api/sectors/          - только ADMIN / SUPER_ADMIN
  PATCH/PUT /api/sectors/{id}/ - только ADMIN / SUPER_ADMIN
  DELETE /api/sectors/{id}/   - только ADMIN / SUPER_ADMIN (soft-delete: is_active=False)
"""

from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Sector
from authentication.permissions import IsAdmin


# ─── Serializer ───────────────────────────────────────────────────────────────

class SectorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sector
        fields = ['id', 'name', 'code', 'description', 'is_active', 'gruppa_filters', 'created_at']
        read_only_fields = ['id', 'created_at']


# ─── ViewSet ──────────────────────────────────────────────────────────────────

class SectorViewSet(viewsets.ModelViewSet):
    """CRUD секторов"""

    serializer_class = SectorSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Sector.objects.all()
        # Non-admin users only see active sectors
        profile = getattr(self.request.user, 'profile', None)
        if not (profile and profile.is_admin):
            qs = qs.filter(is_active=True)
        return qs.order_by('name')

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'toggle_active']:
            return [IsAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        """Soft-delete: mark is_active=False instead of deleting the row."""
        sector = self.get_object()
        sector.is_active = False
        sector.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='toggle-active')
    def toggle_active(self, request, pk=None):
        """Toggle sector active status."""
        sector = self.get_object()
        sector.is_active = not sector.is_active
        sector.save()
        return Response(SectorSerializer(sector).data)
