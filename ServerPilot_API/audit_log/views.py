from rest_framework import viewsets, permissions
from django_filters.rest_framework import DjangoFilterBackend
from .models import Log
from .serializers import LogSerializer
from .pagination import StandardResultsSetPagination
from .filters import LogFilter

class LogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows audit logs to be viewed.
    Only accessible by admin users.
    """
    queryset = Log.objects.all().order_by('-timestamp')
    serializer_class = LogSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = LogFilter

