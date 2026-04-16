from pydantic import BaseModel


class Course(BaseModel):
    moodle_course_id: str
    name: str
