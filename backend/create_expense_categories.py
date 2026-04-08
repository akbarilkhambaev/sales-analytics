"""
Скрипт для создания базовых категорий расходов
Запуск: python create_expense_categories.py
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import ExpenseCategory

def create_categories():
    """Создание базовых категорий расходов"""
    
    categories = [
        {
            'name': 'Канцелярия',
            'description': 'Покупка канцелярских принадлежностей, бумаги, ручек и т.д.'
        },
        {
            'name': 'Оборудование',
            'description': 'Приобретение оборудования, мебели, техники'
        },
        {
            'name': 'Командировки',
            'description': 'Расходы на командировки, транспорт, проживание'
        },
        {
            'name': 'Аренда',
            'description': 'Оплата аренды помещений, складов'
        },
        {
            'name': 'Коммунальные услуги',
            'description': 'Электричество, вода, интернет, телефон'
        },
        {
            'name': 'Обучение',
            'description': 'Курсы, тренинги, семинары для сотрудников'
        },
        {
            'name': 'Маркетинг',
            'description': 'Реклама, продвижение, маркетинговые материалы'
        },
        {
            'name': 'Хозяйственные расходы',
            'description': 'Уборка, ремонт, хозтовары'
        },
        {
            'name': 'Разное',
            'description': 'Прочие расходы, не входящие в другие категории'
        },
    ]
    
    created_count = 0
    for cat_data in categories:
        category, created = ExpenseCategory.objects.get_or_create(
            name=cat_data['name'],
            defaults={'description': cat_data['description']}
        )
        if created:
            print(f"✓ Создана категория: {category.name}")
            created_count += 1
        else:
            print(f"  Категория уже существует: {category.name}")
    
    print(f"\nИтого создано категорий: {created_count}")
    print(f"Всего категорий в базе: {ExpenseCategory.objects.count()}")

if __name__ == '__main__':
    print("Создание базовых категорий расходов...\n")
    create_categories()
    print("\nГотово!")
