from rest_framework import serializers
from .models import EmailSettings

class EmailSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailSettings
        fields = [
            'send_from',
            'alias_name',
            'smtp_server',
            'smtp_port',
            'use_tls',
            'use_ssl',
            'username',
            'password',
        ]
        extra_kwargs = {
            'password': {'write_only': True}
        }
