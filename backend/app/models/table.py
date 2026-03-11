from pydantic import BaseModel, Field
from uuid import uuid4
from enum import StrEnum
from datetime import datetime, timezone

class GameMode(StrEnum):
    DECK = "deck"
    DICE = "dice"

class TableStatus(StrEnum):
    WAITING = "waiting"
    IN_GAME = "in_game"

class Table(BaseModel):
    table_id: str = Field(default_factory=lambda: uuid4().hex[:8])
    name: str
    game_mode: GameMode
    status: TableStatus = TableStatus.WAITING
    host_session_id: str
    players: list["Player"] = []
    max_players: int = 4
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

from app.models.player import Player
Table.model_rebuild()

class TableSummary(BaseModel):
    table_id: str
    name: str
    game_mode: GameMode
    status: TableStatus
    player_count: int
    max_players: int
    player_nicknames: list[str]
