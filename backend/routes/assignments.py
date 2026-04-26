import os
import subprocess
import time
import uuid
import httpx
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List
from jose import jwt
from db import get_db
from models.assignment import Assignment, Question, TestCase
from models.course import Course
from routes.lti import get_private_key, CLIENT_ID

MOODLE_TOKEN_URL = "https://wku.moodlecloud.com/mod/lti/token.php"


class SetupSessionRequest(BaseModel):
    session_id: str
    question_count: int

class SubmitRequest(BaseModel):
    session_id: str
    question_index: int = 0
    test_cases: List[TestCase]


class UpdateQuestionsRequest(BaseModel):
    assignment_id: str
    course_id: str
    questions: List[Question]

class GradeRequest(BaseModel):
    lineitem_url: str
    user_id: str
    score: float


async def get_moodle_token() -> str:
    private_key = get_private_key()
    now = int(datetime.now(timezone.utc).timestamp())
    assertion = jwt.encode({
        "iss": CLIENT_ID,
        "sub": CLIENT_ID,
        "aud": MOODLE_TOKEN_URL,
        "iat": now,
        "exp": now + 60,
        "jti": str(uuid.uuid4()),
    }, private_key, algorithm="RS256")
    async with httpx.AsyncClient() as client:
        resp = await client.post(MOODLE_TOKEN_URL, data={
            "grant_type": "client_credentials",
            "client_assertion_type": "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
            "client_assertion": assertion,
            "scope": "https://purl.imsglobal.org/spec/lti-ags/scope/score",
        })
    data = resp.json()
    print(f"[token] status={resp.status_code} response={data}", flush=True)
    if "access_token" not in data:
        raise Exception(f"Moodle token error: {data}")
    return data["access_token"]

router = APIRouter(prefix="/api", tags=["assignments"])


@router.post("/grade")
async def submit_grade(body: GradeRequest):
    try:
        token = await get_moodle_token()
    except Exception as e:
        print(f"[grade] token error: {e}", flush=True)
        raise HTTPException(status_code=500, detail=f"Token error: {e}")
    try:
        score_url = body.lineitem_url.rstrip("/") + "/scores"
        payload = {
            "userId": body.user_id,
            "scoreGiven": body.score,
            "scoreMaximum": 100,
            "activityProgress": "Completed",
            "gradingProgress": "FullyGraded",
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                score_url,
                json=payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/vnd.ims.lis.v1.score+json",
                },
            )
        print(f"[grade] user={body.user_id} score={body.score} → {resp.status_code}", flush=True)
        return {"ok": resp.status_code < 300, "status": resp.status_code}
    except Exception as e:
        print(f"[grade] submit error: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))


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


@router.post("/session/setup")
async def setup_session(body: SetupSessionRequest):
    container_name = f"lti-shell-{body.session_id}"
    dirs = " ".join(f"/workspace/q{i}" for i in range(1, body.question_count + 1))
    for _ in range(10):
        result = subprocess.run(
            ["docker", "exec", "-u", "user", container_name, "bash", "-c", f"mkdir -p {dirs}"],
            capture_output=True, timeout=5,
        )
        if result.returncode == 0:
            print(f"[setup] {container_name} dirs created", flush=True)
            break
        time.sleep(0.3)
    else:
        print(f"[setup] {container_name} failed to create dirs", flush=True)
    return {"ok": True}


@router.post("/submit")
async def submit_tests(body: SubmitRequest):
    container_name = f"lti-shell-{body.session_id}"
    results = []

    for i, tc in enumerate(body.test_cases):
        try:
            cmd = ["docker", "exec", "-u", "user"]
            if tc.stdin is not None:
                cmd.append("-i")
            workdir = f"/workspace/q{body.question_index + 1}"
            cmd += [container_name, "bash", "-c", f"mkdir -p {workdir} && cd {workdir} && {tc.input}"]
            print(f"[submit] cmd: {' '.join(cmd)}")

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
