import pytest
import subprocess
from types import SimpleNamespace
from unittest.mock import patch
from fastapi import HTTPException

from routes.assignments import (
    get_current_assignment,
    create_course,
    create_assignment,
    update_questions,
    get_dev_assignment,
    submit_tests,
    SubmitRequest,
)
from models.assignment import TestCase


@pytest.fixture
def fake_db():
    class FakeCourses:
        async def find_one(self, query):
            if query.get("moodle_course_id") == "COURSE123":
                return {"_id": "1", "moodle_course_id": "COURSE123"}
            return None

        async def insert_one(self, doc):
            class Result:
                inserted_id = "12345"
            return Result()

    class FakeAssignments:
        async def find_one(self, query):
            if query.get("_id"):
                return {
                    "_id": "2",
                    "moodle_resource_id": "ASSIGN123",
                    "moodle_course_id": "COURSE123",
                    "title": "Linux Lab",
                }
            if query.get("moodle_resource_id") == "ASSIGN123":
                return {
                    "_id": "2",
                    "moodle_resource_id": "ASSIGN123",
                    "moodle_course_id": "COURSE123",
                    "title": "Linux Lab",
                }
            return None

        async def insert_one(self, doc):
            class Result:
                inserted_id = "A12345"
            return Result()

        async def update_one(self, query, update, upsert=False):
            return None

    return {
        "Courses": FakeCourses(),
        "Assignments": FakeAssignments(),
    }


@pytest.mark.asyncio
async def test_get_current_assignment_success(monkeypatch, fake_db):
    monkeypatch.setattr("routes.assignments.get_db", lambda: fake_db)

    response = await get_current_assignment("ASSIGN123", "COURSE123")

    assert response.status_code == 200
    assert b"Linux Lab" in response.body


@pytest.mark.asyncio
async def test_get_current_assignment_not_found(monkeypatch, fake_db):
    monkeypatch.setattr("routes.assignments.get_db", lambda: fake_db)

    with pytest.raises(HTTPException):
        await get_current_assignment("BAD_ID", "COURSE123")


@pytest.mark.asyncio
async def test_create_course_success(monkeypatch):
    class NoExistingCourses:
        async def find_one(self, query):
            return None

        async def insert_one(self, doc):
            class Result:
                inserted_id = "12345"
            return Result()

    monkeypatch.setattr(
        "routes.assignments.get_db",
        lambda: {"Courses": NoExistingCourses()},
    )

    course = SimpleNamespace(
        moodle_course_id="COURSE999",
        model_dump=lambda: {"moodle_course_id": "COURSE999", "name": "Intro"},
    )

    result = await create_course(course)

    assert result["inserted_id"] == "12345"


@pytest.mark.asyncio
async def test_create_course_duplicate(monkeypatch):
    class ExistingCourses:
        async def find_one(self, query):
            return {"_id": "1", "moodle_course_id": "COURSE123"}

    monkeypatch.setattr(
        "routes.assignments.get_db",
        lambda: {"Courses": ExistingCourses()},
    )

    course = SimpleNamespace(
        moodle_course_id="COURSE123",
        model_dump=lambda: {"moodle_course_id": "COURSE123", "name": "Intro"},
    )

    with pytest.raises(HTTPException) as exc:
        await create_course(course)

    assert exc.value.status_code == 409
    assert exc.value.detail == "Course already exists"


@pytest.mark.asyncio
async def test_create_assignment_success(monkeypatch):
    class FakeCourses:
        async def find_one(self, query):
            return {"_id": "1", "moodle_course_id": "COURSE123"}

    class FakeAssignments:
        async def find_one(self, query):
            return None

        async def insert_one(self, doc):
            class Result:
                inserted_id = "A12345"
            return Result()

    monkeypatch.setattr(
        "routes.assignments.get_db",
        lambda: {"Courses": FakeCourses(), "Assignments": FakeAssignments()},
    )

    assignment = SimpleNamespace(
        moodle_resource_id="ASSIGN123",
        moodle_course_id="COURSE123",
        model_dump=lambda: {
            "moodle_resource_id": "ASSIGN123",
            "moodle_course_id": "COURSE123",
            "title": "Linux Lab",
            "questions": [],
        },
    )

    result = await create_assignment(assignment)

    assert result["inserted_id"] == "A12345"


@pytest.mark.asyncio
async def test_create_assignment_missing_course(monkeypatch):
    class FakeCourses:
        async def find_one(self, query):
            return None

    class FakeAssignments:
        async def find_one(self, query):
            return None

    monkeypatch.setattr(
        "routes.assignments.get_db",
        lambda: {"Courses": FakeCourses(), "Assignments": FakeAssignments()},
    )

    assignment = SimpleNamespace(
        moodle_resource_id="ASSIGN123",
        moodle_course_id="COURSE123",
        model_dump=lambda: {
            "moodle_resource_id": "ASSIGN123",
            "moodle_course_id": "COURSE123",
            "title": "Linux Lab",
            "questions": [],
        },
    )

    with pytest.raises(HTTPException) as exc:
        await create_assignment(assignment)

    assert exc.value.status_code == 404
    assert "create the course first" in exc.value.detail


@pytest.mark.asyncio
async def test_create_assignment_duplicate(monkeypatch):
    class FakeCourses:
        async def find_one(self, query):
            return {"_id": "1", "moodle_course_id": "COURSE123"}

    class FakeAssignments:
        async def find_one(self, query):
            return {"_id": "existing"}

    monkeypatch.setattr(
        "routes.assignments.get_db",
        lambda: {"Courses": FakeCourses(), "Assignments": FakeAssignments()},
    )

    assignment = SimpleNamespace(
        moodle_resource_id="ASSIGN123",
        moodle_course_id="COURSE123",
        model_dump=lambda: {
            "moodle_resource_id": "ASSIGN123",
            "moodle_course_id": "COURSE123",
            "title": "Linux Lab",
            "questions": [],
        },
    )

    with pytest.raises(HTTPException) as exc:
        await create_assignment(assignment)

    assert exc.value.status_code == 409
    assert exc.value.detail == "Assignment already exists"


@pytest.mark.asyncio
async def test_update_questions_success(monkeypatch):
    class FakeAssignments:
        def __init__(self):
            self.called = False

        async def update_one(self, query, update, upsert=False):
            self.called = True
            self.query = query
            self.update = update
            self.upsert = upsert

    fake_assignments = FakeAssignments()

    monkeypatch.setattr(
        "routes.assignments.get_db",
        lambda: {"Assignments": fake_assignments},
    )

    class FakeQuestion:
        def model_dump(self):
            return {
                "prompt": "What does ls do?",
                "test_cases": [],
            }

    body = SimpleNamespace(
        assignment_id="ASSIGN123",
        course_id="COURSE123",
        questions=[FakeQuestion()],
    )

    result = await update_questions(body)

    assert result == {"updated": True}
    assert fake_assignments.called is True
    assert fake_assignments.query == {
        "moodle_resource_id": "ASSIGN123",
        "moodle_course_id": "COURSE123",
    }
    assert fake_assignments.upsert is True


@pytest.mark.asyncio
async def test_get_dev_assignment_missing_env(monkeypatch):
    monkeypatch.delenv("DEV_ASSIGNMENT_ID", raising=False)

    with pytest.raises(HTTPException) as exc:
        await get_dev_assignment()

    assert exc.value.status_code == 404
    assert exc.value.detail == "DEV_ASSIGNMENT_ID not set"


@pytest.mark.asyncio
async def test_get_dev_assignment_not_found(monkeypatch):
    class FakeAssignments:
        async def find_one(self, query):
            return None

    monkeypatch.setenv("DEV_ASSIGNMENT_ID", "abc123")
    monkeypatch.setattr("routes.assignments.ObjectId", lambda x: x)
    monkeypatch.setattr(
        "routes.assignments.get_db",
        lambda: {"Assignments": FakeAssignments()},
    )

    with pytest.raises(HTTPException) as exc:
        await get_dev_assignment()

    assert exc.value.status_code == 404
    assert exc.value.detail == "Dev assignment not found"


@pytest.mark.asyncio
async def test_get_dev_assignment_success(monkeypatch):
    class FakeAssignments:
        async def find_one(self, query):
            return {
                "_id": "507f1f77bcf86cd799439011",
                "title": "Dev Assignment",
                "questions": [],
            }

    monkeypatch.setenv("DEV_ASSIGNMENT_ID", "abc123")
    monkeypatch.setattr("routes.assignments.ObjectId", lambda x: x)
    monkeypatch.setattr(
        "routes.assignments.get_db",
        lambda: {"Assignments": FakeAssignments()},
    )

    response = await get_dev_assignment()

    assert response.status_code == 200
    assert b"Dev Assignment" in response.body


@pytest.mark.asyncio
async def test_submit_tests_pass_and_fail():
    body = SubmitRequest(
        session_id="abc123",
        test_cases=[
            TestCase(input="echo hello", expected_output="hello", stdin=None),
            TestCase(input="echo bye", expected_output="bye", stdin=None),
        ],
    )

    with patch("routes.assignments.subprocess.run") as mock_run:
        mock_run.side_effect = [
            type("Proc", (), {"stdout": "hello\n"})(),
            type("Proc", (), {"stdout": "wrong\n"})(),
        ]

        result = await submit_tests(body)

    assert result["results"][0]["passed"] is True
    assert result["results"][1]["passed"] is False


@pytest.mark.asyncio
async def test_submit_tests_timeout():
    body = SubmitRequest(
        session_id="abc123",
        test_cases=[TestCase(input="sleep 20", expected_output="done", stdin=None)],
    )

    with patch("routes.assignments.subprocess.run") as mock_run:
        mock_run.side_effect = subprocess.TimeoutExpired(cmd="docker exec", timeout=10)

        result = await submit_tests(body)

    assert result["results"][0]["passed"] is False
    assert result["results"][0]["actual"] == "Timed out"


@pytest.mark.asyncio
async def test_submit_tests_adds_i_when_stdin_present():
    body = SubmitRequest(
        session_id="abc123",
        test_cases=[
            TestCase(input="cat", expected_output="hello", stdin="hello"),
        ],
    )

    with patch("routes.assignments.subprocess.run") as mock_run:
        mock_run.return_value = type("Proc", (), {"stdout": "hello"})()

        result = await submit_tests(body)

    called_cmd = mock_run.call_args.args[0]
    assert "-i" in called_cmd
    assert result["results"][0]["passed"] is True