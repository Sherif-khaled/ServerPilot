from rest_framework import viewsets, permissions
from ServerPilot_API.Servers.permissions import IsOwnerOrAdmin
from .models import Customer, CustomerType
from .serializers import CustomerSerializer, CustomerTypeSerializer

class CustomerViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Customer.objects.all().order_by('-created_at')
        return Customer.objects.filter(owner=user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class CustomerTypeViewSet(viewsets.ModelViewSet):
    queryset = CustomerType.objects.all().order_by('name')
    serializer_class = CustomerTypeSerializer
    permission_classes = [permissions.IsAuthenticated]
