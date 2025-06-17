import os
import shutil
import tempfile
from unittest.mock import patch, MagicMock
from django.urls import reverse
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase
from django_celery_beat.models import PeriodicTask, CrontabSchedule
from ServerPilot_API.Users.models import CustomUser

# Get the original BASE_DIR
original_base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

@override_settings(BASE_DIR=tempfile.mkdtemp())
class DBManagementTests(APITestCase):

    def setUp(self):
        self.user = CustomUser.objects.create_user(username='testuser', password='testpassword')
        self.client.login(username='testuser', password='testpassword')
        # Use the temporary directory from override_settings
        from django.conf import settings
        self.backup_dir = os.path.join(settings.BASE_DIR, 'backups')
        os.makedirs(self.backup_dir, exist_ok=True)

    def tearDown(self):
        from django.conf import settings
        shutil.rmtree(settings.BASE_DIR)

    @patch('db_management.views.backup_db.delay')
    def test_trigger_backup_now(self, mock_backup_db_delay):
        """Ensure we can trigger a database backup."""
        mock_task = MagicMock()
        mock_task.id = 'test-task-id'
        mock_backup_db_delay.return_value = mock_task

        url = reverse('db-backup')
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(response.data['message'], 'Database backup process started.')
        self.assertEqual(response.data['task_id'], 'test-task-id')
        mock_backup_db_delay.assert_called_once()

    def test_list_backups(self):
        """Ensure we can list available backups."""
        with open(os.path.join(self.backup_dir, 'backup_2023-01-01_12-00-00.sqlc'), 'w') as f:
            f.write('dummy content')

        url = reverse('db-backups-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['filename'], 'backup_2023-01-01_12-00-00.sqlc')

    def test_download_backup(self):
        """Ensure we can download a valid backup file."""
        filename = 'backup_2023-01-01_12-00-00.sqlc'
        with open(os.path.join(self.backup_dir, filename), 'w') as f:
            f.write('dummy backup data')

        url = reverse('db-backup-download', kwargs={'filename': filename})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.get('Content-Disposition'), f'attachment; filename="{filename}"')

    def test_download_backup_not_found(self):
        """Ensure a 404 is returned for a non-existent backup file."""
        filename = 'backup_2023-01-01_12-00-00.sqlc'
        url = reverse('db-backup-download', kwargs={'filename': filename})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_download_backup_invalid_filename(self):
        """Ensure that invalid filenames are rejected."""
        # We construct the URL manually to bypass the URL pattern validation in reverse()
        url = '/api/db/backups/download/../etc/passwd/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_backup_schedule(self):
        """Ensure we can retrieve the backup schedule status."""
        url = reverse('db-backup-schedule')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['enabled'])

    def test_enable_backup_schedule(self):
        """Ensure we can enable and configure the backup schedule."""
        url = reverse('db-backup-schedule')
        data = {'enabled': True, 'hour': 3, 'minute': 30}
        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'Backup schedule enabled successfully.')

        task = PeriodicTask.objects.get(name='daily-database-backup')
        self.assertTrue(task.enabled)
        self.assertEqual(task.crontab.hour, '3')
        self.assertEqual(task.crontab.minute, '30')

    def test_disable_backup_schedule(self):
        """Ensure we can disable the backup schedule."""
        CrontabSchedule.objects.create(hour=2, minute=0)
        PeriodicTask.objects.create(
            name='daily-database-backup',
            task='db_management.tasks.backup_db',
            crontab=CrontabSchedule.objects.get(hour=2, minute=0),
            enabled=True
        )

        url = reverse('db-backup-schedule')
        data = {'enabled': False}
        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'Backup schedule disabled successfully.')

        task = PeriodicTask.objects.get(name='daily-database-backup')
        self.assertFalse(task.enabled)
