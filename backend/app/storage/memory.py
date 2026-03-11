from app.storage.base import StorageBackend

class InMemoryStorage(StorageBackend):
    def __init__(self):
        self._results: list[dict] = []

    async def save_game_result(self, table_id: str, result: dict) -> None:
        self._results.append({"table_id": table_id, **result})

    async def get_game_results(self, limit: int = 50) -> list[dict]:
        return self._results[-limit:]
