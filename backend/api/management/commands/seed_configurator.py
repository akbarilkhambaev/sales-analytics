"""
Management command: seed_configurator
Usage:  python manage.py seed_configurator
        python manage.py seed_configurator --clear   # delete existing data first

Loads the initial configurator dataset (series, colors, glass, accessories)
that was previously hardcoded in frontend/app/configurator/mockData.ts.
"""

from django.core.management.base import BaseCommand
from api.configurator_models import Series, MaterialRates, ProfileColor, GlassOption, Accessory


SERIES_DATA = [
    {
        'id_code': 'akfa-60',
        'name': 'AKFA 60',
        'material': 'PVC',
        'description': 'Классическая ПВХ система — окна и двери для жилых помещений',
        'features': ['60мм профиль', '3 камеры', 'Стальное армирование'],
        'categories': ['window', 'door'],
        'min_width': 400,  'max_width': 2500,
        'min_height': 400, 'max_height': 2500,
        'price_per_sqm': 1_200_000,
        'sort_order': 1,
        'rates': dict(
            frame_per_m=130_000, frame_colored_per_m=163_000, frame_laminated_per_m=195_000,
            sash_per_m=100_000, sash_colored_per_m=125_000, sash_laminated_per_m=150_000,
            imposta_per_m=110_000, imposta_colored_per_m=138_000, imposta_laminated_per_m=165_000,
            glass_per_sqm=420_000,
            hardware_per_opening=160_000, hardware_per_sliding=90_000,
            seal_per_m=18_000, install_base=120_000,
        ),
    },
    {
        'id_code': 'akfa-70',
        'name': 'AKFA 70',
        'material': 'PVC',
        'description': 'Усиленная ПВХ система с пятикамерным профилем — окна и двери',
        'features': ['70мм профиль', '5 камер', 'Повышенная шумоизоляция'],
        'categories': ['window', 'door'],
        'min_width': 400,  'max_width': 2800,
        'min_height': 400, 'max_height': 2800,
        'price_per_sqm': 1_650_000,
        'sort_order': 2,
        'rates': dict(
            frame_per_m=180_000, frame_colored_per_m=225_000, frame_laminated_per_m=270_000,
            sash_per_m=138_000, sash_colored_per_m=173_000, sash_laminated_per_m=207_000,
            imposta_per_m=155_000, imposta_colored_per_m=194_000, imposta_laminated_per_m=233_000,
            glass_per_sqm=420_000,
            hardware_per_opening=220_000, hardware_per_sliding=120_000,
            seal_per_m=25_000, install_base=150_000,
        ),
    },
    {
        'id_code': 'akfa-alu-60',
        'name': 'AKFA Alu 60',
        'material': 'aluminum',
        'description': 'Алюминиевая система с термомостом — окна, двери, фасады',
        'features': ['60мм алюминий', 'Термомост', 'Архитектурные решения'],
        'categories': ['window', 'door'],
        'min_width': 600,  'max_width': 4000,
        'min_height': 600, 'max_height': 3500,
        'price_per_sqm': 2_800_000,
        'sort_order': 3,
        'rates': dict(
            frame_per_m=380_000, frame_colored_per_m=475_000, frame_laminated_per_m=570_000,
            sash_per_m=290_000, sash_colored_per_m=363_000, sash_laminated_per_m=435_000,
            imposta_per_m=320_000, imposta_colored_per_m=400_000, imposta_laminated_per_m=480_000,
            glass_per_sqm=420_000,
            hardware_per_opening=420_000, hardware_per_sliding=250_000,
            seal_per_m=32_000, install_base=280_000,
        ),
    },
    {
        'id_code': 'akfa-sliding',
        'name': 'AKFA Sliding',
        'material': 'aluminum',
        'description': 'Раздвижная алюминиевая система для панорамного остекления',
        'features': ['Раздвижная система', 'До 6м ширины', 'Роллерный механизм'],
        'categories': ['sliding'],
        'min_width': 1200, 'max_width': 6000,
        'min_height': 1800, 'max_height': 3000,
        'price_per_sqm': 3_200_000,
        'sort_order': 4,
        'rates': dict(
            frame_per_m=460_000, frame_colored_per_m=575_000, frame_laminated_per_m=690_000,
            sash_per_m=340_000, sash_colored_per_m=425_000, sash_laminated_per_m=510_000,
            imposta_per_m=360_000, imposta_colored_per_m=450_000, imposta_laminated_per_m=540_000,
            glass_per_sqm=420_000,
            hardware_per_opening=380_000, hardware_per_sliding=380_000,
            seal_per_m=40_000, install_base=400_000,
        ),
    },
]

COLORS_DATA = [
    # RAL — белые
    dict(id_code='ral-9016', name='RAL 9016 Белый транспортный', color_type='ral', tier='white',
         hex='#F1F0EB', highlight_hex='#FFFFFF', shadow_hex='#D4D3CE', materials=['PVC', 'aluminum'], sort_order=1),
    dict(id_code='ral-9003', name='RAL 9003 Сигнальный белый', color_type='ral', tier='white',
         hex='#ECEDE8', highlight_hex='#FFFFFF', shadow_hex='#CFCFCB', materials=['PVC', 'aluminum'], sort_order=2),
    dict(id_code='ral-9010', name='RAL 9010 Чисто белый', color_type='ral', tier='white',
         hex='#F5F4EF', highlight_hex='#FFFFFF', shadow_hex='#D8D7D2', materials=['PVC', 'aluminum'], sort_order=3),
    # RAL — серые / чёрные
    dict(id_code='ral-7016', name='RAL 7016 Антрацит', color_type='ral', tier='colored',
         hex='#383E42', highlight_hex='#545D63', shadow_hex='#1E2326', materials=['PVC', 'aluminum'], sort_order=4),
    dict(id_code='ral-7035', name='RAL 7035 Светло-серый', color_type='ral', tier='colored',
         hex='#CBD0CC', highlight_hex='#E0E4E1', shadow_hex='#A8ADA9', materials=['PVC', 'aluminum'], sort_order=5),
    dict(id_code='ral-7040', name='RAL 7040 Оконно-серый', color_type='ral', tier='colored',
         hex='#9DA3A6', highlight_hex='#B8BDC0', shadow_hex='#787E81', materials=['PVC', 'aluminum'], sort_order=6),
    dict(id_code='ral-9005', name='RAL 9005 Чёрный', color_type='ral', tier='colored',
         hex='#1C1C1C', highlight_hex='#333333', shadow_hex='#0A0A0A', materials=['PVC', 'aluminum'], sort_order=7),
    # RAL — коричневые
    dict(id_code='ral-8017', name='RAL 8017 Шоколадный', color_type='ral', tier='colored',
         hex='#442F20', highlight_hex='#5E4132', shadow_hex='#2A1C13', materials=['PVC', 'aluminum'], sort_order=8),
    dict(id_code='ral-8019', name='RAL 8019 Серо-коричневый', color_type='ral', tier='colored',
         hex='#3D3635', highlight_hex='#574F4E', shadow_hex='#231F1F', materials=['PVC', 'aluminum'], sort_order=9),
    # RAL — зелёные
    dict(id_code='ral-6005', name='RAL 6005 Зелёный мох', color_type='ral', tier='colored',
         hex='#1F4037', highlight_hex='#2D5C4F', shadow_hex='#102418', materials=['PVC', 'aluminum'], sort_order=10),
    dict(id_code='ral-6009', name='RAL 6009 Пихтовый зелёный', color_type='ral', tier='colored',
         hex='#27352A', highlight_hex='#384C3C', shadow_hex='#141C16', materials=['PVC', 'aluminum'], sort_order=11),
    # RAL — синие
    dict(id_code='ral-5010', name='RAL 5010 Горечавково-синий', color_type='ral', tier='colored',
         hex='#0E4C8A', highlight_hex='#1A6BB5', shadow_hex='#072E54', materials=['PVC', 'aluminum'], sort_order=12),
    # Ламинации — металлик/браш
    dict(id_code='lam-metbrush-platin', name='Metbrush Platin (Платина)', color_type='lamination', tier='laminated',
         hex='#B8C0C8', highlight_hex='#D4DAE0', shadow_hex='#8A9198', materials=['PVC', 'aluminum'],
         texture='/textures/lamination/1004_Metbrush_platin.png', sort_order=13),
    dict(id_code='lam-metbrush-quarzgrau', name='Metbrush Quarzgrau (Кварцевый серый)', color_type='lamination', tier='laminated',
         hex='#9AA0A8', highlight_hex='#B4BAC0', shadow_hex='#6E7478', materials=['PVC', 'aluminum'],
         texture='/textures/lamination/1005_Metbrush_quarzgrau.png', sort_order=14),
    dict(id_code='lam-metbrush-anthrazit', name='Metbrush Anthrazitgrau (Антрацит браш)', color_type='lamination', tier='laminated',
         hex='#4A5058', highlight_hex='#606870', shadow_hex='#2C3038', materials=['PVC', 'aluminum'],
         texture='/textures/lamination/1006_Metbrush_anthrazitgrau.png', sort_order=15),
    dict(id_code='lam-alux-anthrazit', name='Alux Anthrazit (Алюкс антрацит)', color_type='lamination', tier='laminated',
         hex='#3A3F45', highlight_hex='#545960', shadow_hex='#202428', materials=['PVC', 'aluminum'],
         texture='/textures/lamination/1012_Alux_Anthrazit.png', sort_order=16),
    dict(id_code='lam-xbrush-stahlblau', name='X-Brush Stahlblau (Стальной синий)', color_type='lamination', tier='laminated',
         hex='#4A5E72', highlight_hex='#627A90', shadow_hex='#2E3E50', materials=['PVC', 'aluminum'],
         texture='/textures/lamination/1022_x_brush_stahlblau.jpg', sort_order=17),
    # Антрацитовые
    dict(id_code='lam-anthrazitgrau-6003', name='Anthrazitgrau F470-6003', color_type='lamination', tier='laminated',
         hex='#3E4448', highlight_hex='#585E64', shadow_hex='#262A2C', materials=['PVC', 'aluminum'],
         texture='/textures/lamination/anthrazitgrau_F470_6003.png', sort_order=18),
    dict(id_code='lam-sn508-anthracite', name='SN508 Anthracite Grey', color_type='lamination', tier='laminated',
         hex='#545A60', highlight_hex='#6E7480', shadow_hex='#383E42', materials=['PVC', 'aluminum'],
         texture='/textures/lamination/SN508_Anthracite_Grey.png', sort_order=19),
    # Дубовые серии
    dict(id_code='lam-staufer-mocca', name='Staufereiche Mocca (Дуб мокко)', color_type='lamination', tier='laminated',
         hex='#5C3A1E', highlight_hex='#7A502A', shadow_hex='#3A2210', materials=['PVC', 'aluminum'],
         texture='/textures/lamination/2048_Staufereiche_mocca.png', sort_order=20),
    dict(id_code='lam-turner-oak-malt', name='Turner Oak Malt (Дуб светлый)', color_type='lamination', tier='laminated',
         hex='#8A6040', highlight_hex='#A87C54', shadow_hex='#5A3C26', materials=['PVC', 'aluminum'],
         texture='/textures/lamination/3001_Turner_Oak_malt.png', sort_order=21),
    dict(id_code='lam-sheffield-alpine', name='Sheffield Oak Alpine (Шеффилд альпийский)', color_type='lamination', tier='laminated',
         hex='#B0905C', highlight_hex='#C8A870', shadow_hex='#7A6040', materials=['PVC', 'aluminum'],
         texture='/textures/lamination/3002_Sheffield_Oak_Alpine.png', sort_order=22),
    dict(id_code='lam-sheffield-concrete', name='Sheffield Oak Concrete (Шеффилд бетон)', color_type='lamination', tier='laminated',
         hex='#8A8074', highlight_hex='#A09888', shadow_hex='#5E5848', materials=['PVC', 'aluminum'],
         texture='/textures/lamination/3003_Sheffield_Oak_Concrete.png', sort_order=23),
    dict(id_code='lam-newcastle-khaki', name='Newcastle Oak Khaki (Дуб хаки)', color_type='lamination', tier='laminated',
         hex='#7A6848', highlight_hex='#9A8462', shadow_hex='#504830', materials=['PVC', 'aluminum'],
         texture='/textures/lamination/3077_Newcatle_Oak_khaki.png', sort_order=24),
    dict(id_code='lam-sheffield-grey', name='Sheffield Oak Grey F501', color_type='lamination', tier='laminated',
         hex='#848880', highlight_hex='#A0A49C', shadow_hex='#5A5E58', materials=['PVC', 'aluminum'],
         texture='/textures/lamination/F501_Sheffield_Oak_grey.png', sort_order=25),
    # Тёмные породы
    dict(id_code='lam-kitami-dark', name='Kitami Dark F470-9026 (Тёмная вишня)', color_type='lamination', tier='laminated',
         hex='#28241C', highlight_hex='#40382C', shadow_hex='#141008', materials=['PVC', 'aluminum'],
         texture='/textures/lamination/Kitami_dark_F470_9026.png', sort_order=26),
    dict(id_code='lam-staufer-kolonial', name='Staufereiche Kolonial ST540', color_type='lamination', tier='laminated',
         hex='#6A4C2C', highlight_hex='#8A6640', shadow_hex='#422E18', materials=['PVC', 'aluminum'],
         texture='/textures/lamination/ST540_Staufereiche_kolonial.png', sort_order=27),
    dict(id_code='lam-tropea-coffee', name='Tropea Oak Coffee F470-3007', color_type='lamination', tier='laminated',
         hex='#6E4828', highlight_hex='#8C5E38', shadow_hex='#462E16', materials=['PVC', 'aluminum'],
         texture='/textures/lamination/Tropea_Oak_coffee_F470_3007.png', sort_order=28),
    dict(id_code='lam-turner-walnut', name='Turner Oak Walnut F476-9036 (Дуб орех)', color_type='lamination', tier='laminated',
         hex='#5E3A1E', highlight_hex='#7A5030', shadow_hex='#3A2210', materials=['PVC', 'aluminum'],
         texture='/textures/lamination/Turner_Oak_walnut_F476_9036.png', sort_order=29),
]

GLASS_DATA = [
    dict(id_code='single', name='Однокамерный', spec='4-16-4',
         description='Базовое остекление', u_value='2.8 Вт/м²К', price_modifier='1.00', sort_order=1),
    dict(id_code='double', name='Двухкамерный', spec='4-12-4-12-4',
         description='Улучшенная теплоизоляция', u_value='1.8 Вт/м²К', price_modifier='1.35', sort_order=2),
    dict(id_code='energy', name='Энергосберегающий', spec='4-16Ar-4 i',
         description='Аргон + i-покрытие', u_value='1.1 Вт/м²К', price_modifier='1.70', sort_order=3),
]

ACCESSORIES_DATA = [
    # За штуку
    dict(id_code='handle-std',   name='Ручка стандарт',              category='handle',       price=15_000,  unit='шт',    price_mode='fixed',         sort_order=1),
    dict(id_code='handle-prem',  name='Ручка премиум',                category='handle',       price=45_000,  unit='шт',    price_mode='fixed',         sort_order=2),
    dict(id_code='net',          name='Москитная сетка',              category='net',          price=55_000,  unit='шт',    price_mode='fixed',         sort_order=3),
    dict(id_code='child-lock',   name='Детская блокировка',           category='lock',         price=12_000,  unit='шт',    price_mode='fixed',         sort_order=4),
    dict(id_code='slope-set',    name='Откосы (комплект)',            category='slope',        price=120_000, unit='компл', price_mode='fixed',         sort_order=5),
    dict(id_code='roller-blind', name='Тканевая штора',               category='blind',        price=150_000, unit='шт',    price_mode='fixed',         sort_order=6),
    # По ширине
    dict(id_code='sill-300',     name='Подоконник 300мм',             category='sill',         price=65_000,  unit='пог.м', price_mode='per_width',     sort_order=7),
    dict(id_code='sill-400',     name='Подоконник 400мм',             category='sill',         price=85_000,  unit='пог.м', price_mode='per_width',     sort_order=8),
    dict(id_code='sill-600',     name='Подоконник 600мм',             category='sill',         price=120_000, unit='пог.м', price_mode='per_width',     sort_order=9),
    dict(id_code='flash',        name='Отлив нержавейка',             category='flash',        price=40_000,  unit='пог.м', price_mode='per_width',     sort_order=10),
    # По высоте
    dict(id_code='espag-std',    name='Эспаньолет стандарт',          category='espagnolette', price=95_000,  unit='пог.м', price_mode='per_height',    sort_order=11),
    dict(id_code='espag-prem',   name='Эспаньолет премиум (сталь)',   category='espagnolette', price=145_000, unit='пог.м', price_mode='per_height',    sort_order=12),
    # По периметру
    dict(id_code='seal-extra',   name='Доп. уплотнитель (периметр)',  category='seal',         price=18_000,  unit='пог.м', price_mode='per_perimeter', sort_order=13),
]


class Command(BaseCommand):
    help = 'Seed the configurator tables with initial product data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear', action='store_true',
            help='Delete all existing configurator data before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Clearing existing configurator data…')
            MaterialRates.objects.all().delete()
            Series.objects.all().delete()
            ProfileColor.objects.all().delete()
            GlassOption.objects.all().delete()
            Accessory.objects.all().delete()
            self.stdout.write(self.style.WARNING('All configurator data cleared.'))

        # ── Series + MaterialRates ──────────────────────────────────────────
        series_created = series_updated = 0
        for item in SERIES_DATA:
            rates_data = item.pop('rates')
            series, created = Series.objects.update_or_create(
                id_code=item['id_code'],
                defaults=item,
            )
            MaterialRates.objects.update_or_create(
                series=series,
                defaults=rates_data,
            )
            if created:
                series_created += 1
            else:
                series_updated += 1

        self.stdout.write(
            self.style.SUCCESS(f'Series: {series_created} created, {series_updated} updated')
        )

        # ── ProfileColor ────────────────────────────────────────────────────
        colors_created = colors_updated = 0
        for item in COLORS_DATA:
            _, created = ProfileColor.objects.update_or_create(
                id_code=item['id_code'],
                defaults=item,
            )
            if created:
                colors_created += 1
            else:
                colors_updated += 1

        self.stdout.write(
            self.style.SUCCESS(f'Colors: {colors_created} created, {colors_updated} updated')
        )

        # ── GlassOption ─────────────────────────────────────────────────────
        glass_created = glass_updated = 0
        for item in GLASS_DATA:
            _, created = GlassOption.objects.update_or_create(
                id_code=item['id_code'],
                defaults=item,
            )
            if created:
                glass_created += 1
            else:
                glass_updated += 1

        self.stdout.write(
            self.style.SUCCESS(f'Glass: {glass_created} created, {glass_updated} updated')
        )

        # ── Accessories ─────────────────────────────────────────────────────
        acc_created = acc_updated = 0
        for item in ACCESSORIES_DATA:
            _, created = Accessory.objects.update_or_create(
                id_code=item['id_code'],
                defaults=item,
            )
            if created:
                acc_created += 1
            else:
                acc_updated += 1

        self.stdout.write(
            self.style.SUCCESS(f'Accessories: {acc_created} created, {acc_updated} updated')
        )

        self.stdout.write(self.style.SUCCESS('\nConfigurator seeding complete!'))
