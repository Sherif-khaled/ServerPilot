from rest_framework import viewsets, mixins, permissions
from .models import PasswordPolicy
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
