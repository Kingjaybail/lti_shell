import asyncio
import os
import pty
import struct
import fcntl
import termios
import subprocess
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/message")
def read_hello():
    return {"message": "hello world"}


# Initialize terminal object and give it perms / settings 
@app.websocket("/ws/terminal")
async def terminal_ws(websocket: WebSocket):
    await websocket.accept()

    parent_fd, child_fd = pty.openpty()

    proc = subprocess.Popen(
        [
            "docker", "run", "--rm", "-it",
            "--name", f"lti-shell-{id(websocket)}",
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
        try:
            os.close(parent_fd)
        except OSError:
            pass