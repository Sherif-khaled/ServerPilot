from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import PasswordPolicy, SecuritySettings, SecurityRisk
from .serializers import PasswordPolicySerializer, SecuritySettingsSerializer, SecurityRiskSerializer

class PasswordPolicyViewSet(viewsets.ModelViewSet):
    """
    API endpoint for the site's password policy.
    It's a singleton model, so we only allow retrieving and updating the single instance.
    """
    queryset = PasswordPolicy.objects.all()
    serializer_class = PasswordPolicySerializer
    permission_classes = [permissions.IsAdminUser]
    http_method_names = ['get', 'put', 'head', 'options']

    def get_object(self):
        # .get_or_create() ensures a single policy object exists and returns it.
        obj, created = PasswordPolicy.objects.get_or_create(pk=1)
        return obj

class SecuritySettingsView(APIView):
    """
    API endpoint for general security settings, like reCAPTCHA.
    This is also a singleton model, so we provide GET and PUT for the single instance.
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, *args, **kwargs):
        settings, created = SecuritySettings.objects.get_or_create(pk=1)
        serializer = SecuritySettingsSerializer(settings)
        return Response(serializer.data)

    def put(self, request, *args, **kwargs):
        settings, created = SecuritySettings.objects.get_or_create(pk=1)
        serializer = SecuritySettingsSerializer(settings, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SecurityRiskViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows security risks to be created, viewed, edited, or deleted.
    This provides a full RESTful interface for the SecurityRisk model.
    """
    queryset = SecurityRisk.objects.all().order_by('title')
    serializer_class = SecurityRiskSerializer
    permission_classes = [permissions.IsAdminUser]

