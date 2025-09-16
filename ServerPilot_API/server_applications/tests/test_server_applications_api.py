import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(django_user_model):
    return django_user_model.objects.create_user(
        username="user",
        email="user@example.com",
        password="pass",
        is_staff=False,
    )


def auth(client: APIClient, user):
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def application_payload():
    return {
        "name": "Nginx",
        "description": "Web server",
        "check_command": "systemctl is-active nginx",
        "version": "1.25.0",
        "detect_version": True,
        "icon": "nginx",
    }


def test_crud_application_authenticated_user(api_client, user, application_payload):
    base_url = "/api/applications/"

    # Create
    create_res = auth(api_client, user).post(base_url, application_payload, format="json")
    assert create_res.status_code in (201, 200)
    app_id = create_res.data["id"]

    # List
    list_res = api_client.get(base_url)
    assert list_res.status_code == 200
    assert any(item["id"] == app_id for item in list_res.data)

    # Retrieve
    detail_url = f"/api/applications/{app_id}/"
    get_res = api_client.get(detail_url)
    assert get_res.status_code == 200
    assert get_res.data["name"] == application_payload["name"]

    # Update partial
    patch_res = api_client.patch(detail_url, {"description": "Reverse proxy"}, format="json")
    assert patch_res.status_code == 200
    assert patch_res.data["description"] == "Reverse proxy"

    # Delete
    del_res = api_client.delete(detail_url)
    assert del_res.status_code in (204, 200)


def test_create_missing_required_field_returns_400(api_client, user, application_payload):
    base_url = "/api/applications/"
    bad_payload = application_payload.copy()
    del bad_payload["name"]
    res = auth(api_client, user).post(base_url, bad_payload, format="json")
    assert res.status_code == 400
    assert "name" in res.data


def test_list_requires_auth_or_returns_forbidden(api_client):
    base_url = "/api/applications/"
    res = api_client.get(base_url)
    # Depending on global DRF DEFAULT_PERMISSION_CLASSES, this may be 401 or 403
    assert res.status_code in (401, 403)