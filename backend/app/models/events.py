from pydantic import BaseModel
from typing import Any

class ClientEvent(BaseModel):
    event: str
    data: dict = {}

class ServerEvent(BaseModel):
    event: str
    data: dict[str, Any] = {}
