# Generated by Django 5.2.3 on 2025-07-14 12:03

import encrypted_model_fields.fields
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Users', '0003_customuser_date_format_customuser_phone_number_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='AISecuritySettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('provider', models.CharField(choices=[('openai', 'OpenAI'), ('gemini', 'Google Gemini')], default='openai', help_text='The AI provider to use for security analysis.', max_length=50)),
                ('api_key', encrypted_model_fields.fields.EncryptedCharField(blank=True, help_text='API key for the selected AI provider.', null=True)),
                ('security_token', encrypted_model_fields.fields.EncryptedCharField(blank=True, help_text='Optional security token or organization ID.', null=True)),
                ('is_configured', models.BooleanField(default=False, help_text='Indicates if the connection to the AI provider has been successfully tested.')),
            ],
            options={
                'verbose_name': 'AI Security Settings',
                'verbose_name_plural': 'AI Security Settings',
            },
        ),
    ]
