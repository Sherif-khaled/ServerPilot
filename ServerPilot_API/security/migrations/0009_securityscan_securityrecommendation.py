# Generated by Django 5.2.3 on 2025-07-20 11:57

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Servers', '0005_alter_securityrecommendation_status'),
        ('security', '0008_alter_securityrisk_options_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='SecurityScan',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('scan_date', models.DateTimeField(auto_now_add=True)),
                ('status', models.CharField(default='completed', max_length=50)),
                ('server', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='security_advisor_scans', to='Servers.server')),
            ],
        ),
        migrations.CreateModel(
            name='SecurityRecommendation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField()),
                ('risk_level', models.CharField(choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High')], max_length=10)),
                ('category', models.CharField(max_length=100)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('executed', 'Executed'), ('ignored', 'Ignored'), ('acknowledged', 'Acknowledged')], default='pending', max_length=20)),
                ('command_solution', models.TextField(blank=True, null=True)),
                ('scan', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='recommendations', to='security.securityscan')),
            ],
        ),
    ]
