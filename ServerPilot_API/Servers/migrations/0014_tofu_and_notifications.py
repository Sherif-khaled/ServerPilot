from django.db import migrations, models
import django.db.models.deletion


def default_empty_dict():
    return {}


class Migration(migrations.Migration):

    dependencies = [
        ('Servers', '0013_remove_server_legacy_ssh_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='server',
            name='stored_fingerprint',
            field=models.JSONField(blank=True, default=default_empty_dict, null=True),
        ),
        migrations.AddField(
            model_name='server',
            name='trusted',
            field=models.BooleanField(default=False),
        ),
        migrations.CreateModel(
            name='ServerNotification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('notification_type', models.CharField(choices=[('fingerprint_mismatch', 'Fingerprint Mismatch')], max_length=64)),
                ('severity', models.CharField(choices=[('info', 'Info'), ('warning', 'Warning'), ('critical', 'Critical')], default='critical', max_length=16)),
                ('message', models.CharField(max_length=512)),
                ('old_fingerprint', models.JSONField(blank=True, default=default_empty_dict, null=True)),
                ('new_fingerprint', models.JSONField(blank=True, default=default_empty_dict, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('server', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to='Servers.server')),
            ],
            options={
                'ordering': ['-created_at'],
                'verbose_name': 'Server Notification',
                'verbose_name_plural': 'Server Notifications',
            },
        ),
    ]
