# Generated by Django 5.2.3 on 2025-06-18 11:29

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Users', '0002_usersession'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='date_format',
            field=models.CharField(default='YYYY-MM-DD', max_length=20),
        ),
        migrations.AddField(
            model_name='customuser',
            name='phone_number',
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='customuser',
            name='timezone',
            field=models.CharField(default='UTC', max_length=50),
        ),
    ]
