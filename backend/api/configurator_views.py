from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from django_filters.rest_framework import DjangoFilterBackend

from .configurator_models import Series, ProfileColor, GlassOption, Accessory
from .configurator_serializers import (
    SeriesSerializer, SeriesWriteSerializer,
    ProfileColorSerializer, GlassOptionSerializer, AccessorySerializer,
)


class SeriesViewSet(viewsets.ModelViewSet):
    """
    GET  /api/configurator/series/           — активные серии (публичный список)
    GET  /api/configurator/series/all/       — все, включая неактивные (для админа)
    GET  /api/configurator/series/{id_code}/ — одна серия
    POST /api/configurator/series/           — создать (rates вложенно)
    PUT  /api/configurator/series/{id_code}/ — обновить
    DEL  /api/configurator/series/{id_code}/ — удалить
    """
    lookup_field = 'id_code'
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['material', 'is_active']
    search_fields = ['name', 'id_code']
    ordering_fields = ['sort_order', 'name']

    def get_queryset(self):
        qs = Series.objects.select_related('rates')
        if self.action == 'list':
            return qs.filter(is_active=True).order_by('sort_order')
        return qs.order_by('sort_order')

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return SeriesWriteSerializer
        return SeriesSerializer

    @action(detail=False, methods=['get'], url_path='all')
    def all_series(self, request):
        """Все серии включая неактивные — для интерфейса администрирования"""
        qs = Series.objects.select_related('rates').order_by('sort_order')
        serializer = SeriesSerializer(qs, many=True)
        return Response(serializer.data)


class ProfileColorViewSet(viewsets.ModelViewSet):
    """
    GET  /api/configurator/colors/             — активные цвета
    GET  /api/configurator/colors/all/         — все (включая неактивные)
    GET  /api/configurator/colors/?tier=...    — фильтр по тиру
    GET  /api/configurator/colors/?material=.. — по материалу (JSON contains)
    """
    lookup_field = 'id_code'
    serializer_class = ProfileColorSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['tier', 'color_type', 'is_active']
    search_fields = ['name', 'id_code']
    ordering_fields = ['sort_order', 'tier', 'name']

    def get_queryset(self):
        qs = ProfileColor.objects.all()
        if self.action == 'list':
            qs = qs.filter(is_active=True)
        material = self.request.query_params.get('material')
        if material:
            qs = qs.filter(materials__contains=material)
        return qs.order_by('sort_order')

    @action(detail=False, methods=['get'], url_path='all')
    def all_colors(self, request):
        qs = ProfileColor.objects.all().order_by('sort_order')
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


class GlassOptionViewSet(viewsets.ModelViewSet):
    """GET /api/configurator/glass/   GET /api/configurator/glass/all/"""
    lookup_field = 'id_code'
    serializer_class = GlassOptionSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['sort_order']

    def get_queryset(self):
        qs = GlassOption.objects.all().order_by('sort_order')
        if self.action == 'list':
            return qs.filter(is_active=True)
        return qs

    @action(detail=False, methods=['get'], url_path='all')
    def all_glass(self, request):
        qs = GlassOption.objects.all().order_by('sort_order')
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


class AccessoryViewSet(viewsets.ModelViewSet):
    """
    GET /api/configurator/accessories/      — активные
    GET /api/configurator/accessories/all/  — все
    GET /api/configurator/accessories/?category=sill
    """
    lookup_field = 'id_code'
    serializer_class = AccessorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'price_mode', 'is_active']
    search_fields = ['name', 'id_code', 'category']
    ordering_fields = ['category', 'sort_order', 'name']

    def get_queryset(self):
        qs = Accessory.objects.all().order_by('sort_order')
        if self.action == 'list':
            return qs.filter(is_active=True)
        return qs

    @action(detail=False, methods=['get'], url_path='all')
    def all_accessories(self, request):
        qs = Accessory.objects.all().order_by('sort_order')
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)
