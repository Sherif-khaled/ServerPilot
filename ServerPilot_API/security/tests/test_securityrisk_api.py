import secrets
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from ..models import SecurityRisk


class SecurityRiskAPITests(APITestCase):
    """API tests for SecurityRisk CRUD endpoints."""

    def setUp(self):
        self.User = get_user_model()
        admin_password = secrets.token_urlsafe(16)
        self.admin_user = self.User.objects.create_superuser(
            username="admin", email="admin@example.com", password=admin_password
        )
        self.client: APIClient = APIClient()
        self.client.force_authenticate(user=self.admin_user)
        self.base_url = reverse("securityrisk-list")  # /api/security/risks/

    def test_create_list_update_delete_security_risk(self):
        """Full CRUD flow for security risk."""
        data = {
            "title": "Root SSH Enabled",
            "description": "Root login over SSH is enabled.",
            "check_command": "grep -E '^PermitRootLogin' /etc/ssh/sshd_config",
            "match_pattern": "PermitRootLogin yes",
            "fix_command": "sed -i 's/^PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config && systemctl restart sshd",
            "risk_level": "critical",
            "required_role": "admin",
            "is_enabled": True,
        }

        # Create
        create_resp = self.client.post(self.base_url, data, format="json")
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        risk_id = create_resp.data["id"]
        self.assertTrue(SecurityRisk.objects.filter(id=risk_id).exists())

        # List
        list_resp = self.client.get(self.base_url)
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(list_resp.data), 1)

        # Update
        update_data = {"title": "Root SSH Allowed"}
        detail_url = reverse("securityrisk-detail", args=[risk_id])
        update_resp = self.client.patch(detail_url, update_data, format="json")
        self.assertEqual(update_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(update_resp.data["title"], "Root SSH Allowed")

        # Delete
        delete_resp = self.client.delete(detail_url)
        self.assertEqual(delete_resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(SecurityRisk.objects.filter(id=risk_id).exists())
