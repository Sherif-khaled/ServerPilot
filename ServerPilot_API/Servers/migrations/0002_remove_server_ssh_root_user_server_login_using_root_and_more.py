# Generated by Django 5.2.2 on 2025-06-09 12:26

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Servers', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='server',
            name='ssh_root_user',
        ),
        migrations.AddField(
            model_name='server',
            name='login_using_root',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='server',
            name='ssh_port',
            field=models.PositiveIntegerField(default=22),
        ),
        migrations.AddField(
            model_name='server',
            name='ssh_root_password',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AlterField(
            model_name='server',
            name='ssh_password',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AlterField(
            model_name='server',
            name='ssh_user',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
    ]
