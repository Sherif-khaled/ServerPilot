# Generated by Django 5.2.3 on 2025-07-29 11:34

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('server_applications', '0005_remove_application_detect_type_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='application',
            name='version_command',
            field=models.CharField(blank=True, help_text="The command to run to get the application's version (e.g., 'nginx -v').", max_length=512, null=True),
        ),
    ]
