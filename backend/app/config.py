from pydantic_settings import BaseSettings
from typing import Literal
class Settings(BaseSettings):
    env: Literal["dev", "prod"] = "dev"
    allowed_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:8000",
        "https://liars-bar-kadf.onrender.com",
        "https://liar.shahar.sh",
    ]

    # Game
    turn_timeout_seconds: int = 30
    max_players_per_table: int = 4
    min_players_to_start: int = 2

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

settings = Settings()
