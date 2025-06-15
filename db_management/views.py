from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .tasks import backup_db
import os
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import datetime
from django.http import FileResponse, Http404
import re
from django_celery_beat.models import PeriodicTask, CrontabSchedule
import json

class BackupListView(APIView):
    """
    API View to list all available database backups.
    """
    def get(self, request, *args, **kwargs):
        backup_dir = os.path.join(settings.BASE_DIR, 'backups')
        if not os.path.exists(backup_dir):
            return Response([], status=status.HTTP_200_OK)

        try:
            backups = []
            for filename in os.listdir(backup_dir):
                if filename.endswith('.sqlc'):
                    file_path = os.path.join(backup_dir, filename)
                    stat = os.stat(file_path)
                    backups.append({
                        'filename': filename,
                        'size': stat.st_size,
                        'created_at': datetime.datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    })
            # Sort backups by creation date, newest first
            backups.sort(key=lambda x: x['created_at'], reverse=True)
            return Response(backups, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': f'Failed to list backups: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DatabaseBackupDownloadView(APIView):
    """
    API View to download a specific database backup file.
    """
    def get(self, request, filename, *args, **kwargs):
        # Sanitize filename to prevent directory traversal.
        if not re.match(r'^backup_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.sqlc$', filename):
            return Response({'error': 'Invalid filename format.'}, status=status.HTTP_400_BAD_REQUEST)

        backup_dir = os.path.join(settings.BASE_DIR, 'backups')
        file_path = os.path.join(backup_dir, filename)

        # Security check: ensure the resolved path is within the backup directory.
        if not os.path.abspath(file_path).startswith(os.path.abspath(backup_dir)):
            return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

        if os.path.exists(file_path):
            try:
                response = FileResponse(open(file_path, 'rb'), as_attachment=True)
                return response
            except Exception as e:
                return Response(
                    {'error': 'An error occurred while trying to read the file.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        else:
            raise Http404("The requested backup file does not exist.")


class BackupScheduleView(APIView):
    """
    API View to manage the scheduled database backup task.
    A single periodic task named 'daily-database-backup' is managed here.
    """
    task_name = 'daily-database-backup'
    task_function = 'db_management.tasks.backup_db'

    def get(self, request, *args, **kwargs):
        """
        Check if the daily backup schedule is enabled.
        """
        try:
            task = PeriodicTask.objects.get(name=self.task_name)
            schedule_info = {
                'enabled': task.enabled,
                'hour': task.crontab.hour,
                'minute': task.crontab.minute,
            }
            return Response(schedule_info, status=status.HTTP_200_OK)
        except PeriodicTask.DoesNotExist:
            # If the task doesn't exist, it's considered disabled.
            return Response({'enabled': False}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request, *args, **kwargs):
        """
        Enable or disable the daily backup schedule.
        Expects {'enabled': True/False, 'hour': H, 'minute': M}
        """
        enabled = request.data.get('enabled')
        hour = request.data.get('hour', 2) # Default to 2 AM
        minute = request.data.get('minute', 0) # Default to 0 minutes

        if enabled is None:
            return Response({'error': 'Enabled field is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Define the crontab schedule, for example, daily at 2:00 AM UTC
            crontab, _ = CrontabSchedule.objects.get_or_create(
                minute=minute,
                hour=hour,
                day_of_week='*',
                day_of_month='*',
                month_of_year='*',
            )

            # Get or create the periodic task
            task, created = PeriodicTask.objects.get_or_create(
                name=self.task_name,
                defaults={
                    'task': self.task_function,
                    'crontab': crontab,
                    'enabled': enabled,
                    'args': json.dumps([]),
                }
            )

            if not created:
                # If task exists, update its state and schedule
                task.crontab = crontab
                task.enabled = enabled
                task.save()
            
            action = "enabled" if enabled else "disabled"
            return Response({'status': f'Backup schedule {action} successfully.'}, status=status.HTTP_200_OK)
        except Exception as e:
            # Log the exception e
            return Response({'error': 'Failed to update schedule.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DatabaseBackupView(APIView):
    """
    API View to trigger a database backup task.
    """
    def post(self, request, *args, **kwargs):
        """
        Handles POST requests to trigger the database backup.
        """
        try:
            task = backup_db.delay()
            return Response(
                {'message': 'Database backup process started.', 'task_id': task.id},
                status=status.HTTP_202_ACCEPTED
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to start backup task: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
