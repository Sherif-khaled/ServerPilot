from celery import shared_task
from django.utils import timezone
from .models import Server, ServerNotification

@shared_task
def recheck_server_fingerprints():
    """
    Periodically re-check SSH host key fingerprints for all trusted servers.
    If a mismatch is detected, log a critical ServerNotification.
    """
    count_checked = 0
    count_mismatch = 0
    for server in Server.objects.filter(trusted=True, is_active=True):
        try:
            ok, fps, _host_key = server._verify_or_alert_fingerprint(timeout=10)
            count_checked += 1
            if not ok:
                count_mismatch += 1
        except Exception as e:
            # record a notification for failure to check (optional)
            ServerNotification.objects.create(
                server=server,
                notification_type='fingerprint_mismatch',
                severity='warning',
                message=f"Failed to verify host key for {server.server_name}: {e}",
                old_fingerprint=server.stored_fingerprint or {},
                new_fingerprint={},
            )
    return {"checked": count_checked, "mismatch": count_mismatch}
