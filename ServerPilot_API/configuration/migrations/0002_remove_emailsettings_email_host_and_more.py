# Generated by Django 5.2.3 on 2025-06-17 13:21

import encrypted_model_fields.fields
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('configuration', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='emailsettings',
            name='email_host',
        ),
        migrations.RemoveField(
            model_name='emailsettings',
            name='email_host_password',
        ),
        migrations.RemoveField(
            model_name='emailsettings',
            name='email_host_user',
        ),
        migrations.RemoveField(
            model_name='emailsettings',
            name='email_port',
        ),
        migrations.RemoveField(
            model_name='emailsettings',
            name='email_use_ssl',
        ),
        migrations.RemoveField(
            model_name='emailsettings',
            name='email_use_tls',
        ),
        migrations.RemoveField(
            model_name='emailsettings',
            name='from_email',
        ),
        migrations.AddField(
            model_name='emailsettings',
            name='alias_name',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='emailsettings',
            name='password',
            field=encrypted_model_fields.fields.EncryptedCharField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='emailsettings',
            name='send_from',
            field=models.EmailField(default='admin@example.com', max_length=255),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='emailsettings',
            name='smtp_port',
            field=models.PositiveIntegerField(default=587),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='emailsettings',
            name='smtp_server',
            field=models.CharField(default='smtp.example.com', max_length=255),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='emailsettings',
            name='use_ssl',
            field=models.BooleanField(default=False, verbose_name='Use SSL'),
        ),
        migrations.AddField(
            model_name='emailsettings',
            name='use_tls',
            field=models.BooleanField(default=False, verbose_name='Use TLS'),
        ),
        migrations.AddField(
            model_name='emailsettings',
            name='username',
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
