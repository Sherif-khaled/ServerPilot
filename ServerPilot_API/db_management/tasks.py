import logging
import os
import subprocess  # nosec B404 - controlled, shell is not used, args derived from trusted settings
from datetime import datetime

from celery import shared_task
from django.conf import settings

# Configure logger
logger = logging.getLogger(__name__)

@shared_task
def backup_db():
    """
    A Celery task to back up the PostgreSQL database using pg_dump.
    Security notes:
    - Command arguments are constructed from Django settings (trusted), not user input.
    - We pass a list of arguments with shell disabled (default), mitigating injection risk.
    - Environment variables are set explicitly for pg_dump.
    """
    db_settings = settings.DATABASES['default']
    db_name = db_settings['NAME']
    db_user = db_settings['USER']
    db_password = db_settings['PASSWORD']
    db_host = db_settings['HOST']
    db_port = db_settings['PORT']

    # Ensure the backup directory exists
    backup_dir = os.path.join(settings.BASE_DIR, 'backups')
    os.makedirs(backup_dir, exist_ok=True)

    # Create a unique filename with a timestamp
    timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    backup_file_name = f'{db_name}_backup_{timestamp}.sqlc'
    backup_file_path = os.path.join(backup_dir, backup_file_name)

    # Construct the pg_dump command
    command = [
        'pg_dump',
        f'--dbname=postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}',
        '-f',
        backup_file_path,
        '--format=c',  # Use custom format for flexibility with pg_restore
        '--no-owner',
        '--no-privileges',
    ]

    try:
        # Set the PGPASSWORD environment variable for pg_dump
        env = os.environ.copy()
        env['PGPASSWORD'] = db_password

        # Execute the command
        process = subprocess.run(  # nosec B603 - no shell; args from trusted settings
            command,
            check=True,
            capture_output=True,
            text=True,
            env=env
        )
        logger.info(f"Database backup successful. File saved to {backup_file_path}")
        return f"Backup successful: {backup_file_path}"

    except subprocess.CalledProcessError as e:
        error_message = f"Database backup failed. Error: {e.stderr}"
        logger.error(error_message)
        # Clean up failed backup file if it was created
        if os.path.exists(backup_file_path):
            os.remove(backup_file_path)
        raise Exception(error_message) from e

    except Exception as e:
        error_message = f"An unexpected error occurred during database backup: {str(e)}"
        logger.error(error_message)
        # Clean up failed backup file if it was created
        if os.path.exists(backup_file_path):
            os.remove(backup_file_path)
        raise Exception(error_message) from e
