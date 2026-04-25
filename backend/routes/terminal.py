import asyncio
import json
import os
import subprocess
import threading
import struct
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv

load_dotenv()
LOCAL = os.getenv("LOCAL", "false").lower() == "true"

# pty/fcntl/termios are Linux-only — only import on production
if not LOCAL:
    import pty
    import fcntl
    import termios

router = APIRouter(tags=["terminal"])


@router.websocket("/ws/terminal")
async def terminal_ws(websocket: WebSocket):
    await websocket.accept()
    session_id = uuid.uuid4().hex[:8]
    await websocket.send_text(json.dumps({"type": "session", "id": session_id}))

    if LOCAL:
        await _local_docker_terminal(websocket, session_id)
    else:
        await _pty_docker_terminal(websocket, session_id)


async def _local_docker_terminal(websocket: WebSocket, session_id: str):
    """Docker terminal for local Windows — pipes instead of PTY."""
    container_name = f"lti-shell-{session_id}"

    proc = subprocess.Popen(
        [
            "docker", "run", "--rm", "-i",
            "--name", container_name,
            "--network", "none",
            "--memory", "256m",
            "--cpus", "0.5",
            "-w", "/workspace",
            "lti-shell:latest",
            "/bin/bash",
        ],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )

    loop = asyncio.get_event_loop()
    connected = True

    def read_output_sync():
        while connected:
            try:
                data = proc.stdout.read(1024)
                if not data:
                    break
                asyncio.run_coroutine_threadsafe(websocket.send_bytes(data), loop)
            except Exception:
                break

    async def read_input():
        nonlocal connected
        while True:
            try:
                message = await websocket.receive()
                if "bytes" in message:
                    data = message["bytes"]
                    # Ignore resize packets (0x01 prefix) — no PTY to resize
                    if data[0:1] != b"\x01":
                        proc.stdin.write(data)
                        proc.stdin.flush()
                elif "text" in message:
                    proc.stdin.write(message["text"].encode())
                    proc.stdin.flush()
            except WebSocketDisconnect:
                connected = False
                break
            except Exception:
                connected = False
                break

    reader_thread = threading.Thread(target=read_output_sync, daemon=True)
    reader_thread.start()

    try:
        await read_input()
    finally:
        connected = False
        proc.terminate()
        result = subprocess.run(["docker", "rm", "-f", container_name], capture_output=True, text=True)
        print(f"[cleanup] {container_name} — rc={result.returncode} {result.stderr.strip()}", flush=True)


async def _pty_docker_terminal(websocket: WebSocket, session_id: str):
    """Full PTY-backed Docker terminal for Linux/production."""
    parent_fd, child_fd = pty.openpty()
    container_name = f"lti-shell-{session_id}"

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
                    if data[0:1] == b"\x01" and len(data) == 5:
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
        result = subprocess.run(["docker", "rm", "-f", container_name], capture_output=True, text=True)
        print(f"[cleanup] {container_name} — rc={result.returncode} {result.stderr.strip()}", flush=True)
        try:
            os.close(parent_fd)
        except OSError:
            pass
