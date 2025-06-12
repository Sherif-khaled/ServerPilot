from rest_framework import viewsets, mixins, permissions, status
from rest_framework.response import Response
from .models import PasswordPolicy, Setting
from .serializers import PasswordPolicySerializer

class PasswordPolicyViewSet(mixins.RetrieveModelMixin,
                            mixins.UpdateModelMixin,
                            viewsets.GenericViewSet):
    """
    A viewset for viewing and editing the password policy.
    This viewset manages a single object, the system-wide password policy.
    """
    queryset = PasswordPolicy.objects.all()
    serializer_class = PasswordPolicySerializer
    permission_classes = [permissions.IsAdminUser]

    def get_object(self):
        """
        Always return the single PasswordPolicy instance.
        """
        obj, created = PasswordPolicy.objects.get_or_create(pk=1)
        return obj

class SettingViewSet(viewsets.ViewSet):
    """
    A viewset for viewing and editing application settings.
    """
    permission_classes = [permissions.IsAdminUser]

    def list(self, request):
        """
        Get all settings as a dictionary.
        """
        settings = Setting.objects.all()
        data = {setting.name: setting.value for setting in settings}
        return Response(data)

    def create(self, request):
        """
        Update or create settings from a dictionary.
        Expects a dictionary like {'setting_name': 'value', ...}.
        """
        for name, value in request.data.items():
            Setting.objects.update_or_create(name=name, defaults={'value': str(value)})
        return Response(request.data, status=status.HTTP_200_OK)
