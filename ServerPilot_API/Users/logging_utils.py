from .models import UserActionLog

def log_user_action(user, action, details=None):
    UserActionLog.objects.create(user=user, action=action, details=details)
