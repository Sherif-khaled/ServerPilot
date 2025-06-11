from rest_framework import serializers
from .models import Log
from ServerPilot_API.Users.models import CustomUser

class UserLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email']

class LogSerializer(serializers.ModelSerializer):
    user = UserLogSerializer(read_only=True)

    class Meta:
        model = Log
        fields = ['id', 'user', 'action', 'timestamp', 'ip_address', 'details']
