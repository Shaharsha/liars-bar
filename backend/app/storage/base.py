from abc import ABC, abstractmethod

class StorageBackend(ABC):
    @abstractmethod
    async def save_game_result(self, table_id: str, result: dict) -> None: ...

    @abstractmethod
    async def get_game_results(self, limit: int = 50) -> list[dict]: ...
