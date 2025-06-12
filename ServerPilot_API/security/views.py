from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import PasswordPolicy, SecuritySettings
from .serializers import PasswordPolicySerializer, SecuritySettingsSerializer

class PasswordPolicyViewSet(viewsets.ModelViewSet):
    queryset = PasswordPolicy.objects.all()
    serializer_class = PasswordPolicySerializer
    permission_classes = [permissions.IsAdminUser]
    http_method_names = ['get', 'put', 'head', 'options']

    def get_object(self):
        # Always return the first policy object
        obj, created = PasswordPolicy.objects.get_or_create(pk=1)
        return obj


class SecuritySettingsView(APIView):
    """
    View to get and update security settings.
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, format=None):
        settings, created = SecuritySettings.objects.get_or_create(pk=1)
        serializer = SecuritySettingsSerializer(settings)
        return Response(serializer.data)

    def post(self, request, format=None):
        settings, created = SecuritySettings.objects.get_or_create(pk=1)
        serializer = SecuritySettingsSerializer(settings, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
