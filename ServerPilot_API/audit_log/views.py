from rest_framework import viewsets, permissions
from .models import Log
from .serializers import LogSerializer
from .pagination import StandardResultsSetPagination

class LogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows audit logs to be viewed.
    Only accessible by admin users.
    """
    queryset = Log.objects.all().order_by('-timestamp')
    serializer_class = LogSerializer
    permission_classes = [permissions.IsAdminUser]
    pagination_class = StandardResultsSetPagination

