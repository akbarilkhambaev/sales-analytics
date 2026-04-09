from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0023_tovary_mapping'),
    ]

    operations = [
        migrations.CreateModel(
            name='SchetaMapping',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('scheta', models.CharField(db_index=True, max_length=255, unique=True, verbose_name='Счёт')),
                ('region', models.CharField(blank=True, max_length=100, null=True, verbose_name='Регион')),
                ('is_mapped', models.BooleanField(db_index=True, default=False, verbose_name='Сопоставлен')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Справочник счетов → регион',
                'verbose_name_plural': 'Справочник счетов → регион',
                'db_table': 'scheta_mapping',
                'ordering': ['is_mapped', 'scheta'],
            },
        ),
    ]
