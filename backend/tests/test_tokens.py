import json
import base64
from urllib import request, response
import pytest
from unittest.mock import patch
from fastapi.responses import RedirectResponse, JSONResponse

from routes.lti import lti_login, lti_launch, lti_jwks


class FakeRequest:
    def __init__(self, method="GET", query_params=None, form_data=None):
        self.method = method
        self.query_params = query_params or {}
        self._form_data = form_data or {}

    async def form(self):
        return self._form_data


@pytest.mark.asyncio
async def test_lti_login_get_redirects():
    request = FakeRequest(
        method="GET",
        query_params={"login_hint": "student1", "lti_message_hint": "msg1"},
    )

    response = await lti_login(request)

    assert isinstance(response, RedirectResponse)
    assert response.status_code == 302
    assert "login_hint=student1" in response.headers["location"]


@pytest.mark.asyncio
async def test_lti_login_post_redirects():
    request = FakeRequest(
        method="POST",
        form_data={"login_hint": "student2", "lti_message_hint": "msg2"},
    )

    response = await lti_login(request)

    assert isinstance(response, RedirectResponse)
    assert response.status_code == 302
    assert "login_hint=student2" in response.headers["location"]
    assert "lti_message_hint=msg2" in response.headers["location"]


@pytest.mark.asyncio
async def test_lti_launch_missing_token():
    request = FakeRequest(method="POST", form_data={})

    response = await lti_launch(request)

    assert isinstance(response, JSONResponse)
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_lti_launch_success():
    claims = {"sub": "student1", "name": "Test Student"}

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            pass

        async def get(self, url):
            class Resp:
                def json(self):
                    return {"keys": ["fake"]}
            return Resp()

    request = FakeRequest(method="POST", form_data={"id_token": "fake-token"})

    with patch("routes.lti.httpx.AsyncClient", return_value=FakeClient()):
        with patch("routes.lti.jwt.decode", return_value=claims):
            response = await lti_launch(request)

    assert isinstance(response, RedirectResponse)
    assert response.status_code == 302

    encoded = response.headers["location"].split("lti_claims=")[1]
    decoded = json.loads(base64.urlsafe_b64decode(encoded.encode()).decode())
    assert decoded["sub"] == "student1"


@pytest.mark.asyncio
async def test_lti_launch_preserves_role_claims():
    claims = {
        "sub": "student1",
        "name": "Test Student",
        "https://purl.imsglobal.org/spec/lti/claim/roles": [
            "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"
        ],
    }

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            pass

        async def get(self, url):
            class Resp:
                def json(self):
                    return {"keys": ["fake"]}
            return Resp()

    request = FakeRequest(method="POST", form_data={"id_token": "fake-token"})

    with patch("routes.lti.httpx.AsyncClient", return_value=FakeClient()):
        with patch("routes.lti.jwt.decode", return_value=claims):
            response = await lti_launch(request)

    encoded = response.headers["location"].split("lti_claims=")[1]
    decoded = json.loads(base64.urlsafe_b64decode(encoded.encode()).decode())

    assert decoded["sub"] == "student1"
    assert "https://purl.imsglobal.org/spec/lti/claim/roles" in decoded
    assert "Learner" in decoded["https://purl.imsglobal.org/spec/lti/claim/roles"][0]


@pytest.mark.asyncio
async def test_lti_launch_invalid_token_raises():
    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            pass

        async def get(self, url):
            class Resp:
                def json(self):
                    return {"keys": ["fake"]}
            return Resp()

    request = FakeRequest(method="POST", form_data={"id_token": "bad-token"})

    with patch("routes.lti.httpx.AsyncClient", return_value=FakeClient()):
        with patch("routes.lti.jwt.decode", side_effect=Exception("Invalid token")):
            response = await lti_launch(request)

    assert isinstance(response, JSONResponse)
    assert response.status_code in (400, 401)


def test_lti_jwks_returns_keys():
    class FakePublicNumbers:
        n = 123456789
        e = 65537

    class FakePublicKey:
        def public_numbers(self):
            return FakePublicNumbers()

    with patch("routes.lti.get_public_key", return_value="fake-key"):
        with patch(
            "cryptography.hazmat.primitives.serialization.load_pem_public_key",
            return_value=FakePublicKey(),
        ):
            response = lti_jwks()

    body = json.loads(response.body.decode())
    assert "keys" in body
    assert body["keys"][0]["kty"] == "RSA"