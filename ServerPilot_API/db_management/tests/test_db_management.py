import io
import os
import re
import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from django.conf import settings
from django_celery_beat.models import PeriodicTask, CrontabSchedule

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db, django_user_model):
    return django_user_model.objects.create_user(
        username="tester",
        email="tester@example.com",
        password="pass",
        is_staff=False,
    )


def auth(client: APIClient, user):
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def base_dir_with_backups(tmp_path, monkeypatch):
    """
    Points settings.BASE_DIR to a temp dir and returns the backup dir path.
    """
    monkeypatch.setattr(settings, "BASE_DIR", tmp_path)
    backup_dir = tmp_path / "backups"
    backup_dir.mkdir(exist_ok=True)
    return backup_dir


# -----------------------
# Backup listing endpoint
# -----------------------

def test_list_backups_empty_dir(api_client, user, base_dir_with_backups):
    url = reverse("db-backups-list")
    res = auth(api_client, user).get(url)
    assert res.status_code == 200
    assert res.data == []


def test_list_backups_filters_sqlc_and_returns_metadata(api_client, user, base_dir_with_backups):
    # Create some files
    valid1 = base_dir_with_backups / "db_backup_2025-09-16_10-00-00.sqlc"
    valid1.write_bytes(b"dummy1")
    valid2 = base_dir_with_backups / "db_backup_2025-09-16_11-00-00.sqlc"
    valid2.write_bytes(b"dummy2")
    ignored = base_dir_with_backups / "readme.txt"
    ignored.write_text("ignore me")

    url = reverse("db-backups-list")
    res = auth(api_client, user).get(url)
    assert res.status_code == 200
    # Only .sqlc files should be included
    filenames = {item["filename"] for item in res.data}
    assert "db_backup_2025-09-16_10-00-00.sqlc" in filenames
    assert "db_backup_2025-09-16_11-00-00.sqlc" in filenames
    assert "readme.txt" not in filenames
    # Check presence of size and created_at metadata
    for item in res.data:
        assert "size" in item
        assert "created_at" in item


# -----------------------
# Backup download endpoint
# -----------------------

def test_download_backup_happy_path(api_client, user, base_dir_with_backups):
    name = "mydb_backup_2025-09-16_12-00-00.sqlc"
    fp = base_dir_with_backups / name
    fp.write_bytes(b"content")

    url = reverse("db-backup-download", args=[name])
    res = auth(api_client, user).get(url)
    assert res.status_code == 200
    # FileResponse with headers
    assert res["Content-Disposition"] == f'attachment; filename="{name}"'
    assert res["Content-Type"] == "application/octet-stream"
    # Stream the content
    content = b"".join(res.streaming_content)
    assert content == b"content"


def test_download_backup_invalid_name_rejected(api_client, user, base_dir_with_backups):
    # Name that doesn't match the strict pattern
    bad_name = "escape.sqlc"
    url = reverse("db-backup-download", args=[bad_name])
    res = auth(api_client, user).get(url)
    assert res.status_code == 400
    assert "Invalid filename format" in str(res.data)


def test_download_backup_missing_file_404(api_client, user, base_dir_with_backups):
    name = "mydb_backup_2025-09-16_13-00-00.sqlc"
    url = reverse("db-backup-download", args=[name])
    res = auth(api_client, user).get(url)
    assert res.status_code == 404


# -----------------------
# Backup delete endpoint
# -----------------------

def test_delete_backup_happy_path(api_client, user, base_dir_with_backups):
    name = "mydb_backup_2025-09-16_14-00-00.sqlc"
    fp = base_dir_with_backups / name
    fp.write_text("delete me")

    url = reverse("db-backup-delete", args=[name])
    res = auth(api_client, user).delete(url)
    assert res.status_code == 200
    assert "deleted successfully" in str(res.data).lower()
    assert not fp.exists()


def test_delete_backup_invalid_name_rejected(api_client, user, base_dir_with_backups):
    bad_name = "evil.sqlc"
    # Does not match the strict pattern
    url = reverse("db-backup-delete", args=[bad_name])
    res = auth(api_client, user).delete(url)
    assert res.status_code == 400
    assert "Invalid filename format" in str(res.data)


def test_delete_backup_missing_file_404(api_client, user, base_dir_with_backups):
    name = "mydb_backup_2025-09-16_15-00-00.sqlc"
    url = reverse("db-backup-delete", args=[name])
    res = auth(api_client, user).delete(url)
    assert res.status_code == 404
    assert "does not exist" in str(res.data)


# -----------------------
# Scheduling endpoint
# -----------------------

def test_get_schedule_when_not_configured_returns_disabled(api_client, user):
    # Ensure no task exists
    PeriodicTask.objects.filter(name="daily-database-backup").delete()
    url = reverse("db-backup-schedule")
    res = auth(api_client, user).get(url)
    assert res.status_code == 200
    assert res.data == {"enabled": False}


def test_enable_schedule_creates_or_updates_task(api_client, user):
    url = reverse("db-backup-schedule")
    payload = {"enabled": True, "hour": 3, "minute": 30}
    res = auth(api_client, user).post(url, payload, format="json")
    assert res.status_code == 200
    assert "enabled successfully" in str(res.data).lower()

    # Validate task exists and is enabled with correct crontab
    task = PeriodicTask.objects.get(name="daily-database-backup")
    assert task.enabled is True
    assert task.task == "db_management.tasks.backup_db"
    assert task.crontab is not None
    assert task.crontab.hour == "3"
    assert task.crontab.minute == "30"


def test_disable_schedule_existing_task(api_client, user):
    # Pre-create a task as enabled
    crontab = CrontabSchedule.objects.create(minute="0", hour="2", day_of_week="*", day_of_month="*", month_of_year="*")
    task = PeriodicTask.objects.create(
        name="daily-database-backup",
        task="db_management.tasks.backup_db",
        crontab=crontab,
        enabled=True,
    )
    url = reverse("db-backup-schedule")
    payload = {"enabled": False}
    res = auth(api_client, user).post(url, payload, format="json")
    assert res.status_code == 200
    assert "disabled successfully" in str(res.data).lower()
    task.refresh_from_db()
    assert task.enabled is False


def test_disable_schedule_when_not_configured_returns_message(api_client, user):
    PeriodicTask.objects.filter(name="daily-database-backup").delete()
    url = reverse("db-backup-schedule")
    payload = {"enabled": False}
    res = auth(api_client, user).post(url, payload, format="json")
    assert res.status_code == 200
    assert "remains disabled" in str(res.data).lower()


def test_schedule_requires_enabled_field(api_client, user):
    url = reverse("db-backup-schedule")
    res = auth(api_client, user).post(url, {}, format="json")
    assert res.status_code == 400
    assert "enabled" in str(res.data).lower()


# -----------------------
# Backup trigger endpoint
# -----------------------

@pytest.fixture
def mock_delay(monkeypatch):
    class DummyTask:
        id = "task-123"

    # Patch the Celery delay call
    from ServerPilot_API.db_management import tasks as task_module
    def fake_delay():
        return DummyTask()

    monkeypatch.setattr(task_module.backup_db, "delay", lambda: fake_delay())
    return DummyTask


def test_trigger_backup_returns_202_with_task_id(api_client, user, mock_delay):
    url = reverse("db-backup")
    res = auth(api_client, user).get(url)
    assert res.status_code == 202
    assert "task_id" in res.data
    assert res.data["task_id"] == "task-123"

    # POST should behave the same
    res2 = auth(api_client, user).post(url)
    assert res2.status_code == 202
    assert res2.data["task_id"] == "task-123"


def test_trigger_backup_handles_task_error(api_client, user, monkeypatch):
    # Make delay raise an exception
    from ServerPilot_API.db_management import tasks as task_module
    def boom():
        raise RuntimeError("boom")
    monkeypatch.setattr(task_module.backup_db, "delay", lambda: boom())

    url = reverse("db-backup")
    res = auth(api_client, user).get(url)
    assert res.status_code == 500
    assert "failed to start backup task" in str(res.data).lower()