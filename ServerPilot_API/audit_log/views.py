from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
import os
import re
import traceback
from django.conf import settings
from datetime import datetime
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


class SystemLogPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 1000

class SystemLogView(APIView):
    """
    API endpoint to view the system's debug.log file.
    Only accessible by admin users.
    """
    permission_classes = [permissions.IsAdminUser]
    pagination_class = SystemLogPagination

    def get(self, request, *args, **kwargs):
        try:
            log_file_path = os.path.join(settings.BASE_DIR, 'debug.log')
            all_logs = []
            
            log_patterns = [
                # New Format: INFO 2025-06-17 09:48:47,506 ...
                re.compile(
                    r'^(?P<level>DEBUG|INFO|WARNING|ERROR|CRITICAL)\s+'
                    r'(?P<timestamp>\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}(,\d{3})?)\s+'
                    r'(?P<message>.*)$',
                    re.DOTALL | re.IGNORECASE
                ),
                # Format: 2025-06-17 14:06:41,123 INFO message
                re.compile(
                    r'^(?P<timestamp>\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}(,\d{3})?)\s+'
                    r'(?P<level>DEBUG|INFO|WARNING|ERROR|CRITICAL)\s+'
                    r'(?P<message>.*)$',
                    re.DOTALL | re.IGNORECASE
                ),
                # Format: [2025-06-17 14:06:41] [LEVEL] message
                re.compile(
                    r'^\s*\[(?P<timestamp>\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}(,\d{3})?)?\]\s+'
                    r'\[(?P<level>DEBUG|INFO|WARNING|ERROR|CRITICAL)\]\s+'
                    r'(?P<message>.*)$',
                    re.DOTALL | re.IGNORECASE
                )
            ]

            with open(log_file_path, 'r', encoding='utf-8', errors='ignore') as f:
                # Read line by line to handle different formats more robustly
                for line in f:
                    if not line.strip():
                        continue
                    
                    match = None
                    for pattern in log_patterns:
                        match = pattern.match(line.strip())
                        if match:
                            break
                    
                    if match:
                        data = match.groupdict()
                        # Ensure all required fields are present
                        if data.get('timestamp') and data.get('level') and data.get('message') is not None:
                            data['level'] = data['level'].upper()
                            all_logs.append(data)
                        else:
                             all_logs.append({
                                'timestamp': 'N/A',
                                'level': 'UNPARSED',
                                'message': line.strip()
                            })
                    else:
                        all_logs.append({
                            'timestamp': 'N/A',
                            'level': 'UNPARSED',
                            'message': line.strip()
                        })
            # Reverse the logs so the newest are first, which is more natural for log viewing
            all_logs.reverse()

            # Filtering
            level_filter = request.query_params.get('level')
            start_date_str = request.query_params.get('start_date')
            end_date_str = request.query_params.get('end_date')

            filtered_logs = all_logs
            if level_filter:
                filtered_logs = [log for log in filtered_logs if log.get('level', '').upper() == level_filter.upper()]

            if start_date_str:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                filtered_logs = [log for log in filtered_logs if log.get('timestamp') != 'N/A' and datetime.strptime(log['timestamp'].split(' ')[0], '%Y-%m-%d').date() >= start_date]

            if end_date_str:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                filtered_logs = [log for log in filtered_logs if log.get('timestamp') != 'N/A' and datetime.strptime(log['timestamp'].split(' ')[0], '%Y-%m-%d').date() <= end_date]

            # Pagination
            paginator = self.pagination_class()
            page = paginator.paginate_queryset(filtered_logs, request, view=self)
            if page is not None:
                return paginator.get_paginated_response(page)

            return Response(filtered_logs)

        except FileNotFoundError:
            return Response({'error': 'Log file not found.'}, status=404)
        except Exception as e:
            tb_str = traceback.format_exc()
            return Response({
                'error': f'An unexpected error occurred: {str(e)}',
                'traceback': tb_str
            }, status=500)

