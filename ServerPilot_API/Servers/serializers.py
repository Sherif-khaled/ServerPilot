from rest_framework import serializers
from .models import Server, SecurityScan, SecurityRecommendation, FirewallRule, ServerCredential
# Customer model import might not be strictly needed here anymore unless for type hinting
# from API.Customers.models import Customer 

class ServerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Server
        fields = (
            'id', 'customer', 'server_name', 'server_ip', 'ssh_port', 'firewall_enabled',
            'is_active', 'created_at', 'updated_at'
        )
        read_only_fields = ('created_at', 'updated_at', 'customer')
        extra_kwargs = {
            'server_name': {'required': True},
            'server_ip': {'required': True},
            'ssh_port': {'required': False, 'default': 22},
            'is_active': {'required': False, 'default': True}
        }

    def validate(self, data):
        # Only basic validations remain; credentials are managed via Credentials vault
        return data

    # Optional: Keep validate_server_ip if you plan to add specific logic
    # def validate_server_ip(self, value):
    #     return value
        #     raise serializers.ValidationError("Loopback IP address is not allowed for servers.")
        return value

    def create(self, validated_data):
        # Customer will be added in the view's perform_create method
        return Server.objects.create(**validated_data)

    def update(self, instance, validated_data):
        # Customer should not be changed during an update via this serializer directly
        # If customer change is needed, it should be a specific action or handled differently
        validated_data.pop('customer', None) 
        return super().update(instance, validated_data)

class SecurityRecommendationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SecurityRecommendation
        fields = '__all__'

class FirewallRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = FirewallRule
        fields = ('id', 'server', 'port', 'protocol', 'source_ip', 'action', 'description', 'created_at')
        read_only_fields = ('created_at', 'server')

class InstalledApplicationSerializer(serializers.Serializer):
    """
    Serializer for representing a systemd service. This is not a model serializer
    as the data is fetched live from the server.
    """
    unit = serializers.CharField()
    load = serializers.CharField()
    active = serializers.CharField()
    sub = serializers.CharField()
    description = serializers.CharField()

class SecurityScanSerializer(serializers.ModelSerializer):
    recommendations = SecurityRecommendationSerializer(many=True, read_only=True)

    class Meta:
        model = SecurityScan
        fields = ('id', 'server', 'scanned_at', 'status', 'recommendations')
        read_only_fields = ('scanned_at', 'server')


class ServerCredentialListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing stored credentials metadata without revealing secrets.
    """
    class Meta:
        model = ServerCredential
        fields = ('id', 'username', 'created_at')
        read_only_fields = fields


class ServerCredentialCreateSerializer(serializers.Serializer):
    """
    Serializer used to accept plaintext secret and username for creation.
    Encryption happens in the view/service layer.
    """
    username = serializers.CharField(max_length=150)
    secret = serializers.CharField(allow_blank=False, allow_null=False, write_only=True)

    def validate(self, attrs):
        # Basic length checks to avoid extreme inputs
        secret = attrs.get('secret', '')
        if len(secret) > 16384:
            raise serializers.ValidationError('Secret too large.')
        return attrs

