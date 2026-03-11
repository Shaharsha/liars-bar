from pydantic import BaseModel
from enum import StrEnum

class GamePhase(StrEnum):
    DEALING = "dealing"
    PLAYING = "playing"
    LIAR_CALLED = "liar_called"
    ROULETTE = "roulette"
    ROUND_OVER = "round_over"
    GAME_OVER = "game_over"

class LastPlay(BaseModel):
    player_id: str
    cards: list[str]
    claimed_count: int

class Bid(BaseModel):
    player_id: str
    quantity: int
    face_value: int
