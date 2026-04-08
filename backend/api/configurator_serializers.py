from rest_framework import serializers
from .configurator_models import Series, MaterialRates, ProfileColor, GlassOption, Accessory


# ─── MaterialRates ────────────────────────────────────────────────────────────

class MaterialRatesSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaterialRates
        exclude = ['id', 'series', 'updated_at']


# ─── Series ───────────────────────────────────────────────────────────────────

class SeriesSerializer(serializers.ModelSerializer):
    rates = MaterialRatesSerializer(read_only=True)

    class Meta:
        model = Series
        fields = [
            'id', 'id_code', 'name', 'material', 'description',
            'features', 'categories',
            'min_width', 'max_width', 'min_height', 'max_height',
            'price_per_sqm', 'rates', 'is_active', 'sort_order',
        ]


class SeriesWriteSerializer(serializers.ModelSerializer):
    """Используется при CREATE/UPDATE — принимает rates вложенно"""
    rates = MaterialRatesSerializer()

    class Meta:
        model = Series
        fields = [
            'id_code', 'name', 'material', 'description',
            'features', 'categories',
            'min_width', 'max_width', 'min_height', 'max_height',
            'price_per_sqm', 'rates', 'is_active', 'sort_order',
        ]

    def create(self, validated_data):
        rates_data = validated_data.pop('rates')
        series = Series.objects.create(**validated_data)
        MaterialRates.objects.create(series=series, **rates_data)
        return series

    def update(self, instance, validated_data):
        rates_data = validated_data.pop('rates', None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if rates_data:
            rates, _ = MaterialRates.objects.get_or_create(series=instance)
            for attr, val in rates_data.items():
                setattr(rates, attr, val)
            rates.save()
        return instance


# ─── ProfileColor ─────────────────────────────────────────────────────────────

class ProfileColorSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfileColor
        fields = [
            'id', 'id_code', 'name', 'color_type', 'tier',
            'hex', 'highlight_hex', 'shadow_hex',
            'texture', 'materials', 'is_active', 'sort_order',
        ]


# ─── GlassOption ─────────────────────────────────────────────────────────────

class GlassOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlassOption
        fields = [
            'id', 'id_code', 'name', 'spec', 'description',
            'u_value', 'price_modifier', 'is_active', 'sort_order',
        ]


# ─── Accessory ────────────────────────────────────────────────────────────────

class AccessorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Accessory
        fields = [
            'id', 'id_code', 'name', 'category',
            'price', 'unit', 'price_mode',
            'is_active', 'sort_order',
        ]
