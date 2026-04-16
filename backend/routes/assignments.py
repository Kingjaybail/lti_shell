from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from db import get_db
from models.assignment import Assignment
from models.course import Course

router = APIRouter(prefix="/api", tags=["assignments"])


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
