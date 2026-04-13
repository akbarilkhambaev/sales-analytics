from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0024_scheta_mapping'),
    ]

    operations = [
        migrations.AddField(
            model_name='readysale',
            name='kod_tovara',
            field=models.CharField(blank=True, db_column='КОД_ТОВАРА', db_index=True, max_length=100, null=True, verbose_name='Код товара'),
        ),
        migrations.AddField(
            model_name='readysale',
            name='cvet',
            field=models.CharField(blank=True, db_column='ЦВЕТ', db_index=True, max_length=100, null=True, verbose_name='Цвет'),
        ),
        migrations.AddField(
            model_name='readysale',
            name='profil_perechen',
            field=models.CharField(blank=True, db_column='профиль_перечень', db_index=True, max_length=100, null=True, verbose_name='Профиль перечень'),
        ),
        migrations.AddIndex(
            model_name='readysale',
            index=models.Index(fields=['kod_tovara', 'year'], name='ready_sales_kod_year_idx'),
        ),
    ]