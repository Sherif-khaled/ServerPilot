from django.urls import path
from .views import (
    DatabaseBackupView, 
    BackupListView, 
    DatabaseBackupDownloadView,
    BackupScheduleView,
    DatabaseBackupDeleteView
)

urlpatterns = [
    path('backup/', DatabaseBackupView.as_view(), name='db-backup'),
    path('backups/', BackupListView.as_view(), name='db-backups-list'),
    path('backups/download/<str:filename>/', DatabaseBackupDownloadView.as_view(), name='db-backup-download'),
    path('backups/delete/<str:filename>/', DatabaseBackupDeleteView.as_view(), name='db-backup-delete'),
    path('schedule/', BackupScheduleView.as_view(), name='db-backup-schedule'),
]
