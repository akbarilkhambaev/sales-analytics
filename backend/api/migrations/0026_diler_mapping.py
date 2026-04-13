from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0025_readysale_tovary_mapping_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='DilerMapping',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('diler', models.CharField(db_index=True, max_length=255, unique=True, verbose_name='Дилер')),
                ('region', models.CharField(blank=True, max_length=100, null=True, verbose_name='Регион')),
                ('is_mapped', models.BooleanField(default=False, verbose_name='Сопоставлен')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Маппинг дилера',
                'verbose_name_plural': 'Маппинг дилеров',
                'db_table': 'diler_mapping',
                'ordering': ['is_mapped', 'diler'],
            },
        ),
    ]