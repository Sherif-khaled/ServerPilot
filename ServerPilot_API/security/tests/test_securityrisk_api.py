import pytest
from django.urls import reverse
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(django_user_model):
    return django_user_model.objects.create_user(
        username="admin",
        email="admin@example.com",
        password="pass",
        is_staff=True,
        is_superuser=True,
    )


@pytest.fixture
def normal_user(django_user_model):
    return django_user_model.objects.create_user(
        username="user",
        email="user@example.com",
        password="pass",
        is_staff=False,
        is_superuser=False,
    )


def auth(client: APIClient, user):
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def security_risk_payload():
    return {
        "title": "Root SSH Enabled",
        "description": "Root login over SSH is enabled.",
        "check_command": "grep -E '^PermitRootLogin' /etc/ssh/sshd_config",
        "match_pattern": "PermitRootLogin yes",
        "fix_command": "sed -i 's/^PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config && systemctl restart sshd",
        "risk_level": "critical",
        "required_role": "admin",
        "expect_non_zero_exit": False,
        "is_enabled": True,
    }


def test_admin_can_crud_security_risk(api_client, admin_user, security_risk_payload):
    base_url = reverse("security-risk-list")

    # Create
    create_res = auth(api_client, admin_user).post(base_url, security_risk_payload, format="json")
    assert create_res.status_code == 201
    risk_id = create_res.data["id"]

    # List
    list_res = api_client.get(base_url)
    assert list_res.status_code == 200
    assert any(item["id"] == risk_id for item in list_res.data)

    # Retrieve
    detail_url = reverse("security-risk-detail", args=[risk_id])
    get_res = api_client.get(detail_url)
    assert get_res.status_code == 200
    assert get_res.data["title"] == security_risk_payload["title"]

    # Update (partial)
    patch_res = api_client.patch(detail_url, {"title": "Root SSH Allowed"}, format="json")
    assert patch_res.status_code == 200
    assert patch_res.data["title"] == "Root SSH Allowed"

    # Delete
    del_res = api_client.delete(detail_url)
    assert del_res.status_code in (204, 200)


def test_non_admin_forbidden_for_all_actions(api_client, normal_user, security_risk_payload):
    base_url = reverse("security-risk-list")

    # List forbidden
    list_res = auth(api_client, normal_user).get(base_url)
    assert list_res.status_code in (403, 401)

    # Create forbidden
    create_res = api_client.post(base_url, security_risk_payload, format="json")
    assert create_res.status_code in (403, 401)

    # Create as normal user (even if authenticated) should be forbidden
    create_res2 = api_client.post(base_url, security_risk_payload, format="json")
    assert create_res2.status_code in (403, 401)


def test_unauthenticated_cannot_access(api_client, security_risk_payload):
    base_url = reverse("security-risk-list")

    # List
    res = api_client.get(base_url)
    assert res.status_code in (403, 401)

    # Create
    res = api_client.post(base_url, security_risk_payload, format="json")
    assert res.status_code in (403, 401)


def test_create_missing_required_field_returns_400(api_client, admin_user, security_risk_payload):
    base_url = reverse("security-risk-list")
    bad_payload = security_risk_payload.copy()
    del bad_payload["title"]

    res = auth(api_client, admin_user).post(base_url, bad_payload, format="json")
    assert res.status_code == 400
    assert "title" in res.data
