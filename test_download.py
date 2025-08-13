#!/usr/bin/env python3
"""
Test script to verify backup download functionality
"""
import os
import sys
import django
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).resolve().parent
sys.path.insert(0, str(project_root))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'serverpilot_project.settings')
django.setup()

from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
import tempfile
import shutil

User = get_user_model()

def test_backup_download():
    """Test the backup download functionality"""
    
    # Create a test user
    user = User.objects.create_user(
        username='testuser',
        password='testpass123',
        email='test@example.com'
    )
    
    # Create a test client
    client = Client()
    
    # Login the user
    login_success = client.login(username='testuser', password='testpass123')
    print(f"Login successful: {login_success}")
    
    if not login_success:
        print("Failed to login user")
        return False
    
    # Test listing backups
    print("\nTesting backup list...")
    response = client.get('/api/db/backups/')
    print(f"Backup list status: {response.status_code}")
    print(f"Backup list data: {response.json()}")
    
    if response.status_code != 200:
        print("Failed to list backups")
        return False
    
    backups = response.json()
    if not backups:
        print("No backups found")
        return False
    
    # Test downloading the first backup
    backup = backups[0]
    filename = backup['filename']
    print(f"\nTesting download for: {filename}")
    
    response = client.get(f'/api/db/backups/download/{filename}/')
    print(f"Download status: {response.status_code}")
    print(f"Download headers: {dict(response.headers)}")
    
    if response.status_code == 200:
        print("Download successful!")
        print(f"Content length: {len(response.content)} bytes")
        return True
    else:
        print(f"Download failed: {response.content}")
        return False

if __name__ == '__main__':
    success = test_backup_download()
    if success:
        print("\n✅ All tests passed!")
    else:
        print("\n❌ Tests failed!")
        sys.exit(1)

