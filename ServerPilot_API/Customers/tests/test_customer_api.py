import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from ServerPilot_API.Users.models import CustomUser
from ServerPilot_API.Customers.models import Customer, CustomerType

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return CustomUser.objects.create_user(username="user1", email="user1@example.com", password="pass")


@pytest.fixture
def other_user(db):
    return CustomUser.objects.create_user(username="user2", email="user2@example.com", password="pass")


@pytest.fixture
def admin_user(db):
    return CustomUser.objects.create_user(username="admin", email="admin@example.com", password="pass", is_staff=True)


@pytest.fixture
def company_type(db):
    return CustomerType.objects.create(name="Company")


@pytest.fixture
def individual_type(db):
    return CustomerType.objects.create(name="Individual")


@pytest.fixture
def user_customer_individual(db, user, individual_type):
    return Customer.objects.create(
        owner=user,
        customer_type=individual_type,
        first_name="John",
        last_name="Doe",
        email="john.doe@example.com",
        city="Cairo",
        country="EG",
    )


@pytest.fixture
def user_customer_company(db, user, company_type):
    return Customer.objects.create(
        owner=user,
        customer_type=company_type,
        company_name="Acme Inc",
        delegated_person_name="Alice Manager",
        email="acme@example.com",
        city="Cairo",
        country="EG",
    )


@pytest.fixture
def other_customer(db, other_user, individual_type):
    return Customer.objects.create(
        owner=other_user,
        customer_type=individual_type,
        first_name="Jane",
        last_name="Roe",
        email="jane.roe@example.com",
    )


@pytest.fixture(autouse=True)
def mute_audit_log(monkeypatch):
    # Prevent side effects from audit logging during tests
    def _noop(*args, **kwargs):
        return None
    monkeypatch.setattr("ServerPilot_API.Customers.views.log_action", _noop)
    yield


def auth(client: APIClient, user: CustomUser) -> APIClient:
    client.force_authenticate(user=user)
    return client


def test_auth_required_for_list(api_client):
    url = reverse("customer-list")
    res = api_client.get(url)
    assert res.status_code in (401, 403)  # DRF can return 401 or 403 depending on settings


def test_list_returns_only_owned_for_regular_user(api_client, user, user_customer_individual, other_customer):
    url = reverse("customer-list")
    res = auth(api_client, user).get(url)
    assert res.status_code == 200
    ids = [c["id"] for c in res.data]
    assert user_customer_individual.id in ids
    assert other_customer.id not in ids


def test_list_admin_sees_all(api_client, admin_user, user_customer_individual, other_customer):
    url = reverse("customer-list")
    res = auth(api_client, admin_user).get(url)
    assert res.status_code == 200
    ids = [c["id"] for c in res.data]
    assert user_customer_individual.id in ids
    assert other_customer.id in ids


def test_retrieve_enforces_ownership(api_client, user, other_customer):
    url = reverse("customer-detail", args=[other_customer.id])
    res = auth(api_client, user).get(url)
    assert res.status_code in (403, 404)  # IsOwnerOrAdmin should block; depending on implementation it may 403 or hide as 404


def test_create_individual_requires_first_last(api_client, user, individual_type):
    url = reverse("customer-list")
    payload = {
        "email": "new.individual@example.com",
        "customer_type": individual_type.id,
        # missing first_name/last_name intentionally
    }
    res = auth(api_client, user).post(url, payload, format="json")
    assert res.status_code == 400
    assert "first_name" in res.data
    assert "last_name" in res.data


def test_create_company_requires_company_and_delegated(api_client, user, company_type):
    url = reverse("customer-list")
    payload = {
        "email": "new.company@example.com",
        "customer_type": company_type.id,
        # missing company_name, delegated_person_name
    }
    res = auth(api_client, user).post(url, payload, format="json")
    assert res.status_code == 400
    assert "company_name" in res.data
    assert "delegated_person_name" in res.data


def test_create_requires_customer_type(api_client, user):
    url = reverse("customer-list")
    payload = {
        "email": "missing.type@example.com",
    }
    res = auth(api_client, user).post(url, payload, format="json")
    assert res.status_code == 400
    assert "customer_type" in res.data


def test_unique_email_enforced_on_create(api_client, user, individual_type, user_customer_individual):
    url = reverse("customer-list")
    payload = {
        "email": user_customer_individual.email,  # duplicate
        "customer_type": individual_type.id,
        "first_name": "Dup",
        "last_name": "Email",
    }
    res = auth(api_client, user).post(url, payload, format="json")
    assert res.status_code == 400
    assert "email" in res.data


def test_owner_is_readonly_on_create(api_client, user, individual_type):
    url = reverse("customer-list")
    payload = {
        "email": "readonly.owner@example.com",
        "customer_type": individual_type.id,
        "first_name": "A",
        "last_name": "B",
        "owner": "should_be_ignored",
    }
    res = auth(api_client, user).post(url, payload, format="json")
    assert res.status_code == 201
    # owner returned as username string per serializer
    assert res.data["owner"] == user.username


def test_partial_update_individual_cannot_clear_names(api_client, user, user_customer_individual):
    url = reverse("customer-detail", args=[user_customer_individual.id])
    payload = {"first_name": ""}  # attempting to clear
    res = auth(api_client, user).patch(url, payload, format="json")
    assert res.status_code == 400
    assert "first_name" in res.data


def test_partial_update_company_cannot_clear_company_fields(api_client, user, user_customer_company):
    url = reverse("customer-detail", args=[user_customer_company.id])
    payload = {"company_name": ""}  # attempting to clear
    res = auth(api_client, user).patch(url, payload, format="json")
    assert res.status_code == 400
    assert "company_name" in res.data


def test_change_type_individual_to_company_requires_company_fields(api_client, user, user_customer_individual, company_type):
    url = reverse("customer-detail", args=[user_customer_individual.id])
    payload = {"customer_type": company_type.id}
    res = auth(api_client, user).patch(url, payload, format="json")
    assert res.status_code == 400
    assert "company_name" in res.data
    assert "delegated_person_name" in res.data


def test_change_type_company_to_individual_requires_names(api_client, user, user_customer_company, individual_type):
    url = reverse("customer-detail", args=[user_customer_company.id])
    payload = {"customer_type": individual_type.id}
    res = auth(api_client, user).patch(url, payload, format="json")
    assert res.status_code == 400
    assert "first_name" in res.data
    assert "last_name" in res.data


def test_admin_can_delete_any(api_client, admin_user, other_customer):
    url = reverse("customer-detail", args=[other_customer.id])
    res = auth(api_client, admin_user).delete(url)
    assert res.status_code in (204, 200)
    assert not Customer.objects.filter(id=other_customer.id).exists()


def test_non_owner_cannot_delete_other_users_customer(api_client, user, other_customer):
    url = reverse("customer-detail", args=[other_customer.id])
    res = auth(api_client, user).delete(url)
    assert res.status_code in (403, 404)
    assert Customer.objects.filter(id=other_customer.id).exists()


def test_owner_can_delete_own_customer(api_client, user, user_customer_individual):
    url = reverse("customer-detail", args=[user_customer_individual.id])
    res = auth(api_client, user).delete(url)
    assert res.status_code in (204, 200)
    assert not Customer.objects.filter(id=user_customer_individual.id).exists()