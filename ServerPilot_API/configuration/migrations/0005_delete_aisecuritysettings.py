# Generated by Django 5.2.3 on 2025-07-14 12:03

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('configuration', '0004_aisecuritysettings_is_configured_and_more'),
    ]

    operations = [
        migrations.DeleteModel(
            name='AISecuritySettings',
        ),
    ]
