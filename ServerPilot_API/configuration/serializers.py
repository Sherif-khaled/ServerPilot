from rest_framework import serializers
from .models import EmailSettings
from .utils import apply_email_settings

class EmailSettingsSerializer(serializers.ModelSerializer):
    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        apply_email_settings()
        return instance
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


