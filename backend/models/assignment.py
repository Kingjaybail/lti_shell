from pydantic import BaseModel
from typing import List, Optional


class TestCase(BaseModel):
    input: str
    expected_output: str
    stdin: Optional[str] = None


class Question(BaseModel):
    id: str
    prompt: str
    test_cases: List[TestCase] = []


class Assignment(BaseModel):
    moodle_resource_id: str       
    moodle_course_id: str         
    student_id: Optional[str] = None
    professor_id: Optional[str] = None
    class_name: Optional[str] = None
    title: str
    description: Optional[str] = ""
    questions: List[Question] = []
