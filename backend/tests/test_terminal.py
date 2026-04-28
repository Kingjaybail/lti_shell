import json
import pytest
from unittest.mock import AsyncMock, Mock, patch

from routes.terminal import terminal_ws, _local_docker_terminal


class FakeWebSocket:
    def __init__(self):
        self.accept = AsyncMock()
        self.send_text = AsyncMock()


@pytest.mark.asyncio
async def test_terminal_ws_accepts_and_sends_session():
    websocket = FakeWebSocket()

    with patch("routes.terminal.uuid.uuid4") as mock_uuid:
        with patch("routes.terminal._local_docker_terminal", new_callable=AsyncMock) as mock_local:
            with patch("routes.terminal._pty_docker_terminal", new_callable=AsyncMock) as mock_pty:
                with patch("routes.terminal.LOCAL", True):
                    mock_uuid.return_value.hex = "abcdef1234567890"

                    await terminal_ws(websocket)

    websocket.accept.assert_awaited_once()
    websocket.send_text.assert_awaited_once()

    sent_message = websocket.send_text.await_args.args[0]
    payload = json.loads(sent_message)

    assert payload["type"] == "session"
    assert payload["id"] == "abcdef12"
    mock_local.assert_awaited_once_with(websocket, "abcdef12")
    mock_pty.assert_not_called()


@pytest.mark.asyncio
async def test_terminal_ws_calls_local_terminal_when_local_true():
    websocket = FakeWebSocket()

    with patch("routes.terminal.uuid.uuid4") as mock_uuid:
        with patch("routes.terminal._local_docker_terminal", new_callable=AsyncMock) as mock_local:
            with patch("routes.terminal._pty_docker_terminal", new_callable=AsyncMock) as mock_pty:
                with patch("routes.terminal.LOCAL", True):
                    mock_uuid.return_value.hex = "12345678abcdefgh"

                    await terminal_ws(websocket)

    mock_local.assert_awaited_once_with(websocket, "12345678")
    mock_pty.assert_not_called()


@pytest.mark.asyncio
async def test_terminal_ws_calls_pty_terminal_when_local_false():
    websocket = FakeWebSocket()

    with patch("routes.terminal.uuid.uuid4") as mock_uuid:
        with patch("routes.terminal._local_docker_terminal", new_callable=AsyncMock) as mock_local:
            with patch("routes.terminal._pty_docker_terminal", new_callable=AsyncMock) as mock_pty:
                with patch("routes.terminal.LOCAL", False):
                    mock_uuid.return_value.hex = "fedcba9876543210"

                    await terminal_ws(websocket)

    mock_pty.assert_awaited_once_with(websocket, "fedcba98")
    mock_local.assert_not_called()


class FakeStdout:
    def read(self, n):
        return b""


class FakeStdin:
    def __init__(self):
        self.writes = []
        self.flush = Mock()

    def write(self, data):
        self.writes.append(data)


class FakeProc:
    def __init__(self):
        self.stdin = FakeStdin()
        self.stdout = FakeStdout()
        self.terminate = Mock()


class ImmediateThread:
    def __init__(self, target=None, daemon=None):
        self.target = target

    def start(self):
        if self.target:
            self.target()


class FakeReceiveSocket:
    def __init__(self, messages):
        self._messages = list(messages)
        self.send_bytes = AsyncMock()

    async def receive(self):
        if not self._messages:
            raise Exception("done")
        item = self._messages.pop(0)
        if isinstance(item, Exception):
            raise item
        return item


@pytest.mark.asyncio
async def test_local_terminal_ignores_resize_packet():
    fake_proc = FakeProc()
    websocket = FakeReceiveSocket([
        {"bytes": b"\x01\x00P\x00\x18"},
        Exception("stop"),
    ])

    with patch("routes.terminal.subprocess.Popen", return_value=fake_proc):
        with patch("routes.terminal.subprocess.run") as mock_run:
            with patch("routes.terminal.threading.Thread", ImmediateThread):
                await _local_docker_terminal(websocket, "abc123")

    assert fake_proc.stdin.writes == []
    fake_proc.terminate.assert_called_once()
    mock_run.assert_called_once_with(
        ["docker", "rm", "-f", "lti-shell-abc123"],
        capture_output=True,
    )


@pytest.mark.asyncio
async def test_local_terminal_writes_normal_bytes_to_stdin():
    fake_proc = FakeProc()
    websocket = FakeReceiveSocket([
        {"bytes": b"ls\n"},
        Exception("stop"),
    ])

    with patch("routes.terminal.subprocess.Popen", return_value=fake_proc):
        with patch("routes.terminal.subprocess.run"):
            with patch("routes.terminal.threading.Thread", ImmediateThread):
                await _local_docker_terminal(websocket, "abc123")

    assert fake_proc.stdin.writes == [b"ls\n"]
    fake_proc.stdin.flush.assert_called()


@pytest.mark.asyncio
async def test_local_terminal_writes_text_to_stdin():
    fake_proc = FakeProc()
    websocket = FakeReceiveSocket([
        {"text": "pwd\n"},
        Exception("stop"),
    ])

    with patch("routes.terminal.subprocess.Popen", return_value=fake_proc):
        with patch("routes.terminal.subprocess.run"):
            with patch("routes.terminal.threading.Thread", ImmediateThread):
                await _local_docker_terminal(websocket, "abc123")

    assert fake_proc.stdin.writes == [b"pwd\n"]
    fake_proc.stdin.flush.assert_called()