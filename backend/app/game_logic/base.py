from abc import ABC, abstractmethod
from typing import Any

class GameEngine(ABC):
    @abstractmethod
    def initialize(self, player_ids: list[str]) -> list[tuple[str, Any]]:
        """Set up initial state. Returns list of (target, event) tuples."""
        ...

    @abstractmethod
    def handle_action(self, player_id: str, action: str, data: dict) -> list[tuple[str, Any]]:
        """Process a player action. Returns resulting (target, event) tuples."""
        ...

    @abstractmethod
    def get_state_for_player(self, player_id: str) -> dict:
        """Return the game state visible to a specific player."""
        ...

    @abstractmethod
    def get_current_player_id(self) -> str | None:
        ...

    @abstractmethod
    def is_game_over(self) -> bool:
        ...
