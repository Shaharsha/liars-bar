from fastapi import APIRouter, Response, Cookie
from pydantic import BaseModel
from uuid import uuid4
from typing import Optional

from app.managers.table import table_manager
from app.managers.connection import connection_manager
from app.models.table import GameMode
from app.models.events import ServerEvent
from app.config import settings

router = APIRouter()

# In-memory session store
sessions: dict[str, dict] = {}

class CreateSessionRequest(BaseModel):
    nickname: str
    avatar: str = "fox"

class CreateTableRequest(BaseModel):
    name: str
    game_mode: GameMode

@router.post("/session")
async def create_session(req: CreateSessionRequest, response: Response):
    session_id = uuid4().hex
    sessions[session_id] = {"nickname": req.nickname, "avatar": req.avatar, "session_id": session_id}
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        samesite="lax",
        secure=settings.env == "prod",
        max_age=86400,
    )
    return {"session_id": session_id, "nickname": req.nickname, "avatar": req.avatar}

@router.get("/session")
async def get_session(session_id: Optional[str] = Cookie(None)):
    if not session_id or session_id not in sessions:
        return {"session_id": None, "nickname": None}
    return sessions[session_id]

@router.get("/tables")
async def list_tables():
    return {"tables": table_manager.list_tables()}

@router.post("/tables")
async def create_table(req: CreateTableRequest, session_id: Optional[str] = Cookie(None)):
    if not session_id or session_id not in sessions:
        return {"error": "No session"}, 401
    session_data = sessions[session_id]
    table = await table_manager.create_table(
        name=req.name,
        game_mode=req.game_mode,
        host_session_id=session_id,
        host_nickname=session_data["nickname"],
        host_avatar=session_data.get("avatar", "fox"),
    )
    return {"table": table.model_dump()}

@router.post("/tables/{table_id}/join")
async def join_table(table_id: str, session_id: Optional[str] = Cookie(None)):
    if not session_id or session_id not in sessions:
        return {"error": "No session"}, 401
    session_data = sessions[session_id]
    nickname = session_data["nickname"]
    avatar = session_data.get("avatar", "fox")
    table = await table_manager.join_table(table_id, session_id, nickname, avatar)
    if table is None:
        return {"error": "Table full or not found"}, 400
    # Notify existing WebSocket connections about the new player
    await connection_manager.broadcast_to_table(table_id, ServerEvent(
        event="player_joined",
        data={"session_id": session_id, "nickname": nickname, "avatar": avatar}
    ))
    return {"table": table.model_dump()}
