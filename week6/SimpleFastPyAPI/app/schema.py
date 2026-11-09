from pydantic import BaseModel


class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class UserResponse(BaseModel):
    """Public-facing user shape. Never includes the password."""

    id: int
    name: str
    email: str

class UserUpdate(BaseModel):
    name: str
    email: str
