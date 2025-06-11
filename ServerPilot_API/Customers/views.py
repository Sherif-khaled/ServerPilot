from rest_framework import viewsets, permissions
from ServerPilot_API.Servers.permissions import IsOwnerOrAdmin
from .models import Customer, CustomerType
import logging
from .serializers import CustomerSerializer, CustomerTypeSerializer
from ServerPilot_API.audit_log.services import log_action

logger = logging.getLogger(__name__)

class CustomerViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Customer.objects.all().order_by('-created_at')
        return Customer.objects.filter(owner=user).order_by('-created_at')

    def perform_create(self, serializer):
        customer = serializer.save(owner=self.request.user)
        customer_full_name = f"{customer.first_name} {customer.last_name}".strip()
        log_action(user=self.request.user, action='customer_created', request=self.request, details={'customer_name': customer_full_name})

    def perform_update(self, serializer):
        customer = serializer.save()
        customer_full_name = f"{customer.first_name} {customer.last_name}".strip()
        log_action(user=self.request.user, action='customer_updated', request=self.request, details={'customer_name': customer_full_name})

    def perform_destroy(self, instance):
        customer_full_name = f"{instance.first_name} {instance.last_name}".strip()
        log_action(user=self.request.user, action='customer_deleted', request=self.request, details={'customer_name': customer_full_name})
        instance.delete()


class CustomerTypeViewSet(viewsets.ModelViewSet):
    queryset = CustomerType.objects.all().order_by('name')
    serializer_class = CustomerTypeSerializer
    permission_classes = [permissions.IsAuthenticated]
