import os
import subprocess
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List
from db import get_db
from models.assignment import Assignment, Question, TestCase
from models.course import Course


class SubmitRequest(BaseModel):
    session_id: str
    test_cases: List[TestCase]


class UpdateQuestionsRequest(BaseModel):
    assignment_id: str
    course_id: str
    questions: List[Question]

router = APIRouter(prefix="/api", tags=["assignments"])


@router.get("/assignment/dev")
async def get_dev_assignment():
    dev_id = os.getenv("DEV_ASSIGNMENT_ID")
    if not dev_id:
        raise HTTPException(status_code=404, detail="DEV_ASSIGNMENT_ID not set")
    db = get_db()
    doc = await db["Assignments"].find_one({"_id": ObjectId(dev_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Dev assignment not found")
    doc["_id"] = str(doc["_id"])
    return JSONResponse(doc)


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


@router.patch("/assignment/questions")
async def update_questions(body: UpdateQuestionsRequest):
    db = get_db()
    await db["Assignments"].update_one(
        {"moodle_resource_id": body.assignment_id, "moodle_course_id": body.course_id},
        {"$set": {"questions": [q.model_dump() for q in body.questions]}},
        upsert=True,
    )
    return {"updated": True}


@router.get("/assignment/current")
async def get_current_assignment(
    assignment_id: str = Query(..., description="Moodle resource_link.id"),
    course_id: str = Query(..., description="Moodle context.id"),
):
    db = get_db()

    course = await db["Courses"].find_one({"moodle_course_id": course_id})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    assignment = await db["Assignments"].find_one({
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

    existing = await db["Courses"].find_one({"moodle_course_id": course.moodle_course_id})
    if existing:
        raise HTTPException(status_code=409, detail="Course already exists")

    result = await db["Courses"].insert_one(course.model_dump())
    return {"inserted_id": str(result.inserted_id)}


@router.post("/assignment", status_code=201)
async def create_assignment(assignment: Assignment):
    db = get_db()

    course = await db["Courses"].find_one({"moodle_course_id": assignment.moodle_course_id})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found — create the course first")

    existing = await db["Assignments"].find_one({
        "moodle_resource_id": assignment.moodle_resource_id,
        "moodle_course_id": assignment.moodle_course_id,
    })
    if existing:
        raise HTTPException(status_code=409, detail="Assignment already exists")

    result = await db["Assignments"].insert_one(assignment.model_dump())
    return {"inserted_id": str(result.inserted_id)}
