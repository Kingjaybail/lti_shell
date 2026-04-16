from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db import connect_db, close_db
from routes import assignments, lti, terminal


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(assignments.router)
app.include_router(lti.router)
app.include_router(terminal.router)


@app.get("/message")
def read_hello():
    return {"message": "hello world"}
<<<<<<< Updated upstream

@app.get("/api/assignment/current")
async def get_current_assignment():
    return {
        "title": "Remove Array Duplicates",
        "course": "CS240",
        "description": """Given an array of length n, create a python program that will remove duplicate values from the given array.

        Example array:

        nums = [10, 99, 10, 12, 4]

        result = [10, 99, 333, 4]"""
    }


@app.get("/lti/jwks")
def lti_jwks():
    public_key_pem = get_public_key()
    from cryptography.hazmat.primitives.serialization import load_pem_public_key
    from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicKey
    import base64

    pub = load_pem_public_key(public_key_pem.encode())
    pub_numbers = pub.public_key().public_numbers() if hasattr(pub, 'public_key') else pub.public_numbers()

    def to_base64url(n, length):
        return base64.urlsafe_b64encode(n.to_bytes(length, 'big')).rstrip(b'=').decode()

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


@app.post("/lti/login")
@app.get("/lti/login")
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


@app.post("/lti/launch")
async def lti_launch(request: Request):
    form_data = dict(await request.form())
    id_token = form_data.get("id_token")

    if not id_token:
        return JSONResponse({"error": "Missing id_token"}, status_code=400)

    # Fetch Moodle's public keys
    async with httpx.AsyncClient() as client:
        resp = await client.get(PLATFORM_JWKS_URL)
        jwks = resp.json()

    # Decode and validate JWT
    claims = jwt.decode(
        id_token,
        jwks,
        algorithms=["RS256"],
        audience=CLIENT_ID,
        issuer=PLATFORM_ISSUER,
    )

    import json, base64
    claims_b64 = base64.urlsafe_b64encode(json.dumps(claims).encode()).decode()

    return RedirectResponse(f"{FRONTEND_URL}?lti_claims={claims_b64}", status_code=302)


@app.websocket("/ws/terminal")
async def terminal_ws(websocket: WebSocket):
    await websocket.accept()

    parent_fd, child_fd = pty.openpty()
    container_name = f"lti-shell-{id(websocket)}"

    proc = subprocess.Popen(
        [
            "docker", "run", "--rm", "-it",
            "--name", container_name,
            "-e", "TERM=xterm-256color",
            "--network", "none",
            "--memory", "256m",
            "--cpus", "0.5",
            "-w", "/workspace",
            "lti-shell:latest",
            "/bin/bash",
        ],
        stdin=child_fd,
        stdout=child_fd,
        stderr=child_fd,
        close_fds=True,
    )

    os.close(child_fd)
    loop = asyncio.get_event_loop()
    connected = True

    async def pty_to_ws():
        while connected:
            try:
                data = await loop.run_in_executor(None, os.read, parent_fd, 1024)
                if connected:
                    await websocket.send_bytes(data)
            except OSError:
                break

    async def ws_to_pty():
        nonlocal connected
        while True:
            try:
                message = await websocket.receive()

                if "bytes" in message:
                    data = message["bytes"]
                    if data[0:1] == b'\x01' and len(data) == 5:
                        cols, rows = struct.unpack(">HH", data[1:5])
                        fcntl.ioctl(parent_fd, termios.TIOCSWINSZ,
                                    struct.pack("HHHH", rows, cols, 0, 0))
                    else:
                        os.write(parent_fd, data)

                elif "text" in message:
                    os.write(parent_fd, message["text"].encode())

            except WebSocketDisconnect:
                connected = False
                break
            except Exception:
                connected = False
                break

    try:
        await asyncio.gather(pty_to_ws(), ws_to_pty())
    finally:
        connected = False
        proc.terminate()
        subprocess.run(["docker", "rm", "-f", container_name], capture_output=True)
        try:
            os.close(parent_fd)
        except OSError:
            pass
=======
>>>>>>> Stashed changes
