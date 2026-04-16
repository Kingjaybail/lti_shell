from pydantic import BaseModel
from typing import List, Optional


class TestCase(BaseModel):
    input: str
    expected_output: str


class Question(BaseModel):
    id: str
    prompt: str
    test_cases: List[TestCase] = []


class Assignment(BaseModel):
    moodle_resource_id: str       # resource_link.id from LTI
    moodle_course_id: str         # context.id from LTI — references courses collection
    title: str
    description: Optional[str] = ""
    questions: List[Question] = []
