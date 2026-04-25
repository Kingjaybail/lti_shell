import uuid
import json
import base64
import httpx
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, RedirectResponse
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend
from jose import jwt

PLATFORM_ISSUER = "https://wku.moodlecloud.com"
CLIENT_ID = "6MHXhJtCVMVV4gp"
AUTH_LOGIN_URL = "https://wku.moodlecloud.com/mod/lti/auth.php"
PLATFORM_JWKS_URL = "https://wku.moodlecloud.com/mod/lti/certs.php"
TOOL_LAUNCH_URL = "https://api.stushellbackend.xyz/lti/launch"
FRONTEND_URL = "https://stushell.vercel.app/"

import os
from dotenv import load_dotenv

load_dotenv()
LOCAL = os.getenv("LOCAL", "false").lower() == "true"

if LOCAL:
    _key_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    PRIVATE_KEY_FILE = os.path.join(_key_dir, "lti_private.key")
    PUBLIC_KEY_FILE = os.path.join(_key_dir, "lti_public.key")
else:
    PRIVATE_KEY_FILE = "/app/lti_private.key"
    PUBLIC_KEY_FILE = "/app/lti_public.key"

router = APIRouter(prefix="/lti", tags=["lti"])


def ensure_keys():
    if not os.path.exists(PRIVATE_KEY_FILE):
        private_key = rsa.generate_private_key(
            public_exponent=65537, key_size=2048, backend=default_backend()
        )
        with open(PRIVATE_KEY_FILE, "wb") as f:
            f.write(private_key.private_bytes(
                serialization.Encoding.PEM,
                serialization.PrivateFormat.TraditionalOpenSSL,
                serialization.NoEncryption(),
            ))
        with open(PUBLIC_KEY_FILE, "wb") as f:
            f.write(private_key.public_key().public_bytes(
                serialization.Encoding.PEM,
                serialization.PublicFormat.SubjectPublicKeyInfo,
            ))


def get_private_key():
    ensure_keys()
    return open(PRIVATE_KEY_FILE).read()


def get_public_key():
    ensure_keys()
    return open(PUBLIC_KEY_FILE).read()


@router.get("/jwks")
def lti_jwks():
    from cryptography.hazmat.primitives.serialization import load_pem_public_key

    public_key_pem = get_public_key()
    pub = load_pem_public_key(public_key_pem.encode())
    pub_numbers = pub.public_numbers()

    def to_base64url(n, length):
        return base64.urlsafe_b64encode(n.to_bytes(length, "big")).rstrip(b"=").decode()

    key_size_bytes = (pub_numbers.n.bit_length() + 7) // 8
    jwk_key = {
        "kty": "RSA",
        "use": "sig",
        "alg": "RS256",
        "kid": "lti-shell-key",
        "n": to_base64url(pub_numbers.n, key_size_bytes),
        "e": to_base64url(pub_numbers.e, 3),
    }
    return JSONResponse({"keys": [jwk_key]})


@router.post("/login")
@router.get("/login")
async def lti_login(request: Request):
    if request.method == "POST":
        params = dict(await request.form())
    else:
        params = dict(request.query_params)

    nonce = str(uuid.uuid4())
    state = str(uuid.uuid4())

    auth_url = (
        f"{AUTH_LOGIN_URL}"
        f"?scope=openid"
        f"&response_type=id_token"
        f"&client_id={CLIENT_ID}"
        f"&redirect_uri={TOOL_LAUNCH_URL}"
        f"&login_hint={params.get('login_hint', '')}"
        f"&lti_message_hint={params.get('lti_message_hint', '')}"
        f"&state={state}"
        f"&response_mode=form_post"
        f"&nonce={nonce}"
        f"&prompt=none"
    )

    return RedirectResponse(auth_url, status_code=302)


@router.post("/launch")
async def lti_launch(request: Request):
    form_data = dict(await request.form())
    id_token = form_data.get("id_token")

    if not id_token:
        return JSONResponse({"error": "Missing id_token"}, status_code=400)

    async with httpx.AsyncClient() as client:
        resp = await client.get(PLATFORM_JWKS_URL)
        jwks = resp.json()

    claims = jwt.decode(
        id_token,
        jwks,
        algorithms=["RS256"],
        audience=CLIENT_ID,
        issuer=PLATFORM_ISSUER,
    )

    claims_b64 = base64.urlsafe_b64encode(json.dumps(claims).encode()).decode()
    return RedirectResponse(f"{FRONTEND_URL}?lti_claims={claims_b64}", status_code=302)
