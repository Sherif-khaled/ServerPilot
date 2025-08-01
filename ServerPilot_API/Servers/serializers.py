from rest_framework import serializers
from .models import Server, SecurityScan, SecurityRecommendation, FirewallRule
# Customer model import might not be strictly needed here anymore unless for type hinting
# from API.Customers.models import Customer 

class ServerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Server
        fields = (
            'id', 'customer', 'server_name', 'server_ip', 'ssh_port', 'firewall_enabled',
            'login_using_root',
            'ssh_user', 'ssh_password', 
            'ssh_root_password',
            'ssh_key',
            'is_active', 'created_at', 'updated_at'
        )
        read_only_fields = ('created_at', 'updated_at', 'customer')
        extra_kwargs = {
            'ssh_password': {'write_only': True, 'required': False, 'allow_null': True, 'allow_blank': True},
            'ssh_root_password': {'write_only': True, 'required': False, 'allow_null': True, 'allow_blank': True},
            'ssh_key': {'required': False, 'allow_blank': True, 'allow_null': True},
            'ssh_user': {'required': False, 'allow_blank': True, 'allow_null': True},
            'server_name': {'required': True},
            'server_ip': {'required': True},
            'ssh_port': {'required': False, 'default': 22},
            'is_active': {'required': False, 'default': True}
        }

    def validate(self, data):
        login_using_root = data.get('login_using_root', False) # Default to False if not provided
        # Get current values if instance exists (for partial updates)
        instance = getattr(self, 'instance', None)

        # Helper to get value from data or instance
        def get_value(field_name):
            if field_name in data: # Prioritize incoming data
                return data[field_name]
            if instance and hasattr(instance, field_name):
                return getattr(instance, field_name)
            return None

        ssh_user = get_value('ssh_user')
        ssh_password = get_value('ssh_password')
        ssh_root_password = get_value('ssh_root_password')
        ssh_key = get_value('ssh_key')

        # If login_using_root is explicitly set to True in incoming data, or if it's an update and it's already true
        if data.get('login_using_root', instance.login_using_root if instance else False):
            # Root login: requires root password or SSH key
            if not ssh_root_password and not ssh_key:
                # Check if we are in a PATCH request and these fields are not being updated
                # If it's a create (no instance) or these fields are explicitly set to None/empty
                is_creating = instance is None
                root_pass_provided = 'ssh_root_password' in data
                key_provided = 'ssh_key' in data

                if is_creating or (root_pass_provided and not ssh_root_password) or (key_provided and not ssh_key):
                     raise serializers.ValidationError(
                        "For root login, either SSH root password or an SSH key must be provided."
                    )

            if ssh_user and ssh_user.lower() == 'root':
                 raise serializers.ValidationError(
                    "When 'login_using_root' is true, 'ssh_user' should not be 'root'; it's implied."
                )
            # If login_using_root is true, ensure non-root fields are nulled in data if not already
            data['ssh_user'] = None
            data['ssh_password'] = None
        else: # Non-root login
            if not ssh_user:
                if not (instance and instance.ssh_user): # Required on create, or if clearing existing
                    raise serializers.ValidationError(
                        "For non-root login, 'ssh_user' is required."
                    )
            elif ssh_user.lower() == 'root': # Check even if ssh_user is from instance
                raise serializers.ValidationError(
                    "To login as root, please check the 'login_using_root' option. 'ssh_user' cannot be 'root' for non-root login."
                )
            
            # Non-root login: requires non-root password or SSH key
            if not ssh_password and not ssh_key:
                is_creating = instance is None
                user_pass_provided = 'ssh_password' in data
                key_provided = 'ssh_key' in data
                if is_creating or (user_pass_provided and not ssh_password) or (key_provided and not ssh_key):
                    raise serializers.ValidationError(
                        "For non-root login, either SSH password or an SSH key must be provided."
                    )
            # If not login_using_root, ensure root_password is nulled in data
            data['ssh_root_password'] = None
            
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

