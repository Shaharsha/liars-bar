from app.storage.base import StorageBackend

class R2Storage(StorageBackend):
    """Cloudflare R2 storage - to be implemented for production."""

    async def save_game_result(self, table_id: str, result: dict) -> None:
        pass  # TODO: implement R2 storage

    async def get_game_results(self, limit: int = 50) -> list[dict]:
        return []  # TODO: implement R2 storage
