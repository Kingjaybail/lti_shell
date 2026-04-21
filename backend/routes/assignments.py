import subprocess
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List
from db import get_db
from models.assignment import Assignment, TestCase
from models.course import Course


class SubmitRequest(BaseModel):
    session_id: str
    test_cases: List[TestCase]

router = APIRouter(prefix="/api", tags=["assignments"])

# for now had claude generate a bunch of these working still on layout
DUMMY_ASSIGNMENT = {
    "moodle_resource_id": "dummy_resource_001",
    "moodle_course_id": "dummy_course_cs301",
    "student_id": "student_12345",
    "professor_id": "prof_67890",
    "class_name": "CS301 - Intro to Linux",
    "title": "Linux & Python Fundamentals",
    "description": "Complete the following tasks in the terminal. Each task will be graded by automated test cases.",
    "questions": [
        {
            "id": "q1",
            "prompt": "Create a Python list named 'numbers' containing integers 1 through 5, then print it. Name the file numbers.py",
            "test_cases": [
                {"input": "python3 numbers.py", "expected_output": "[1, 2, 3, 4, 5]"},
            ],
        },
        {
            "id": "q2",
            "prompt": "Create a directory tree with: project/src, project/tests, and project/docs",
            "test_cases": [
                {"input": "ls project/", "expected_output": "docs\nsrc\ntests"},
            ],
        },
        {
            "id": "q3",
            "prompt": "Write a Python script named hello.py that prints 'Hello, World!'",
            "test_cases": [
                {"input": "python3 hello.py", "expected_output": "Hello, World!"},
            ],
        },
        {
            "id": "q4",
            "prompt": "Create a file named output.txt containing exactly the word 'Done'.",
            "test_cases": [
                {"input": "cat output.txt", "expected_output": "Done"},
            ],
        },
        {
            "id": "q5",
            "prompt": "Write a Python function add(a, b) in a file named math_ops.py. Read two numbers using input() (no prompt string) and print their sum.",
            "test_cases": [
                {"input": "python3 math_ops.py", "stdin": "3\n4\n", "expected_output": "7"},
                {"input": "python3 math_ops.py", "stdin": "10\n20\n", "expected_output": "30"},
                {"input": "python3 math_ops.py", "stdin": "100\n250\n", "expected_output": "350"},
            ],
        },
    ],
}


@router.get("/assignment/dummy")
async def get_dummy_assignment():
    return JSONResponse(DUMMY_ASSIGNMENT)


@router.post("/submit")
async def submit_tests(body: SubmitRequest):
    container_name = f"lti-shell-{body.session_id}"
    results = []

    for i, tc in enumerate(body.test_cases):
        try:
            cmd = ["docker", "exec"]
            if tc.stdin is not None:
                cmd.append("-i")
            cmd += [container_name, "bash", "-c", tc.input]

            proc = subprocess.run(
                cmd,
                input=tc.stdin,
                capture_output=True, text=True, timeout=10,
            )
            actual = proc.stdout.strip()
            passed = actual == tc.expected_output.strip()
            results.append({"id": i, "passed": passed, "actual": actual, "expected": tc.expected_output})
        except subprocess.TimeoutExpired:
            results.append({"id": i, "passed": False, "actual": "Timed out", "expected": tc.expected_output})
        except Exception as e:
            results.append({"id": i, "passed": False, "actual": str(e), "expected": tc.expected_output})

    return {"results": results}


@router.get("/assignment/current")
async def get_current_assignment(
    assignment_id: str = Query(..., description="Moodle resource_link.id"),
    course_id: str = Query(..., description="Moodle context.id"),
):
    db = get_db()

    course = await db["courses"].find_one({"moodle_course_id": course_id})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    assignment = await db["assignments"].find_one({
        "moodle_resource_id": assignment_id,
        "moodle_course_id": course_id,
    })
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    assignment["_id"] = str(assignment["_id"])
    return JSONResponse(assignment)


@router.post("/course", status_code=201)
async def create_course(course: Course):
    db = get_db()

    existing = await db["courses"].find_one({"moodle_course_id": course.moodle_course_id})
    if existing:
        raise HTTPException(status_code=409, detail="Course already exists")

    result = await db["courses"].insert_one(course.model_dump())
    return {"inserted_id": str(result.inserted_id)}


@router.post("/assignment", status_code=201)
async def create_assignment(assignment: Assignment):
    db = get_db()

    course = await db["courses"].find_one({"moodle_course_id": assignment.moodle_course_id})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found — create the course first")

    existing = await db["assignments"].find_one({
        "moodle_resource_id": assignment.moodle_resource_id,
        "moodle_course_id": assignment.moodle_course_id,
    })
    if existing:
        raise HTTPException(status_code=409, detail="Assignment already exists")

    result = await db["assignments"].insert_one(assignment.model_dump())
    return {"inserted_id": str(result.inserted_id)}
