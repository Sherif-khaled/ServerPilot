import json
import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from ServerPilot_API.ai_handler.models import AISettings

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(django_user_model):
    return django_user_model.objects.create_user(
        username="aiuser",
        email="ai@example.com",
        password="pass",
        is_active=True,
        email_verified=True,
    )


def auth(client: APIClient, user):
    client.force_authenticate(user=user)
    return client


def test_ai_settings_retrieve_and_update(api_client, user):
    # Ensure singleton exists
    s = AISettings.objects.create(pk=1, provider="OpenAI", api_key="k", model="gpt-4o-mini")

    url = reverse("ai-settings")
    res_get = auth(api_client, user).get(url)
    assert res_get.status_code == 200
    assert res_get.data["provider"].lower() == "openai"

    res_put = api_client.put(url, {"provider": "OpenAI", "api_key": "new", "model": "gpt-3.5-turbo"}, format="json")
    assert res_put.status_code == 200
    assert res_put.data["model"] == "gpt-3.5-turbo"


def test_ai_models_requires_api_key(api_client, user):
    # No settings
    url = reverse("ai-models")
    res = auth(api_client, user).get(url)
    assert res.status_code == 400

    # Settings without api key
    AISettings.objects.create(pk=1, provider="OpenAI", api_key="", model="gpt-4o-mini")
    res2 = api_client.get(url)
    assert res2.status_code == 400


def test_ai_models_lists_gpt_models(api_client, user, monkeypatch):
    AISettings.objects.create(pk=1, provider="OpenAI", api_key="dummy", model="gpt-4o-mini")

    class DummyModels:
        def __init__(self):
            class X:
                def __init__(self, id):
                    self.id = id
            self.data = [X("gpt-4o-mini"), X("text-embedding-3-large"), X("gpt-3.5-turbo")] 

    class DummyClient:
        def __init__(self, api_key):
            self.models = type("M", (), {"list": lambda _self: DummyModels()})()

    monkeypatch.setattr("ServerPilot_API.ai_handler.views.OpenAI", lambda api_key: DummyClient(api_key))

    url = reverse("ai-models")
    res = auth(api_client, user).get(url)
    assert res.status_code == 200
    assert "gpt-4o-mini" in res.data["models"]
    assert "gpt-3.5-turbo" in res.data["models"]


def test_explain_security_risk_happy_path(api_client, user, monkeypatch):
    AISettings.objects.create(pk=1, provider="OpenAI", api_key="dummy", model="gpt-4o-mini")

    class Msg:
        def __init__(self, content):
            self.content = content

    class Choice:
        def __init__(self, content):
            self.message = Msg(content)

    class Resp:
        def __init__(self, content):
            self.choices = [Choice(content)]

    class DummyCompletions:
        def create(self, model, messages):
            return Resp("- Risk A\n- Risk B\n- Risk C")

    class DummyChat:
        def __init__(self):
            self.completions = DummyCompletions()

    class DummyClient:
        def __init__(self, api_key):
            self.chat = DummyChat()

    monkeypatch.setattr("ServerPilot_API.ai_handler.views.OpenAI", lambda api_key: DummyClient(api_key))

    url = reverse("explain-security-risk")
    payload = {"risk_description": "Exposed SSH port"}
    res = auth(api_client, user).post(url, payload, format="json")
    assert res.status_code == 200
    assert "explanation" in res.data


def test_generate_app_info(api_client, user, monkeypatch):
    AISettings.objects.create(pk=1, provider="OpenAI", api_key="dummy", model="gpt-4o-mini")

    class Msg:
        def __init__(self, content):
            self.content = content

    class Choice:
        def __init__(self, content):
            self.message = Msg(content)

    class Resp:
        def __init__(self, content):
            self.choices = [Choice(content)]

    class DummyCompletions:
        def create(self, model, messages, max_tokens):
            return Resp("A great app.")

    class DummyChat:
        def __init__(self):
            self.completions = DummyCompletions()

    class DummyClient:
        def __init__(self, api_key):
            self.chat = DummyChat()

    monkeypatch.setattr("ServerPilot_API.ai_handler.views.OpenAI", lambda api_key: DummyClient(api_key))

    url = reverse("generate-app-info")
    res = auth(api_client, user).post(url, {"app_name": "Demo App"}, format="json")
    assert res.status_code == 200
    assert res.data["description"]
    assert res.data["icon_url"].startswith("https://ui-avatars.com/api/")


def test_analyze_logs_returns_json_structure(api_client, user, monkeypatch):
    AISettings.objects.create(pk=1, provider="OpenAI", api_key="dummy", model="gpt-4o-mini")

    class Choice:
        def __init__(self, content):
            class Msg:
                def __init__(self, content):
                    self.content = content
            self.message = Msg(content)

    class Resp:
        def __init__(self, content):
            self.choices = [Choice(content)]

    class DummyCompletions:
        def create(self, model, response_format, messages, max_tokens, timeout):
            data = {
                "recommendation": "1. Do X\n2. Do Y",
                "commands": ["echo hello", "ls -la"],
                "error_code": "port_conflict",
                "doc_link": "https://example.com/docs"
            }
            return Resp(json.dumps(data))

    class DummyChat:
        def __init__(self):
            self.completions = DummyCompletions()

    class DummyClient:
        def __init__(self, api_key):
            self.chat = DummyChat()

    monkeypatch.setattr("ServerPilot_API.ai_handler.views.OpenAI", lambda api_key: DummyClient(api_key))

    url = reverse("analyze-logs")
    payload = {"logs": "error: port in use", "app_name": "Web"}
    res = auth(api_client, user).post(url, payload, format="json")
    assert res.status_code == 200
    assert res.data["recommendation"].startswith("1.")
    assert isinstance(res.data["commands"], list)
    assert res.data["error_code"] == "port_conflict"
    assert res.data["doc_link"] == "https://example.com/docs"
from django.test import TestCase

# Create your tests here.
