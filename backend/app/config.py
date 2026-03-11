from pydantic_settings import BaseSettings
from typing import Literal

class Settings(BaseSettings):
    env: Literal["dev", "prod"] = "dev"
    allowed_origins: list[str] = ["http://localhost:5173", "http://localhost:8000"]

    # Storage
    storage_backend: Literal["memory", "r2"] = "memory"
    r2_endpoint_url: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = "lairs-bar-dev"

    # Game
    turn_timeout_seconds: int = 30
    max_players_per_table: int = 4
    min_players_to_start: int = 2

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

settings = Settings()
