from pydantic import BaseModel, Field
from uuid import uuid4

class Player(BaseModel):
    session_id: str = Field(default_factory=lambda: uuid4().hex)
    nickname: str
    avatar: str = "fox"
    is_connected: bool = True
