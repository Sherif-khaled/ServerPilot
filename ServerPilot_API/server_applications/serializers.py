from rest_framework import serializers
from .models import Application

class ApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        fields = ['id', 'name', 'description', 'check_command', 'version', 'detect_version', 'icon', 'created_at', 'updated_at']
