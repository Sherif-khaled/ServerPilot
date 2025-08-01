# Generated by Django 5.2.3 on 2025-07-20 11:10

import encrypted_model_fields.fields
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='AISettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('provider', models.CharField(default='OpenAI', help_text='The AI provider, e.g., OpenAI, Anthropic.', max_length=100)),
                ('api_key', encrypted_model_fields.fields.EncryptedCharField(help_text='The API key for the selected AI provider.')),
                ('model', models.CharField(default='gpt-3.5-turbo', help_text='The specific model to be used, e.g., gpt-4, gpt-3.5-turbo.', max_length=100)),
            ],
            options={
                'verbose_name': 'AI Setting',
                'verbose_name_plural': 'AI Settings',
            },
        ),
    ]
