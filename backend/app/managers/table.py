import asyncio
from app.models.table import Table, TableSummary, GameMode, TableStatus
from app.models.player import Player

class TableManager:
    def __init__(self):
        self.tables: dict[str, Table] = {}
        self._lock = asyncio.Lock()

    async def create_table(self, name: str, game_mode: GameMode, host_session_id: str, host_nickname: str) -> Table:
        async with self._lock:
            table = Table(
                name=name,
                game_mode=game_mode,
                host_session_id=host_session_id,
                players=[Player(session_id=host_session_id, nickname=host_nickname)],
            )
            self.tables[table.table_id] = table
            return table

    async def join_table(self, table_id: str, session_id: str, nickname: str) -> Table | None:
        async with self._lock:
            table = self.tables.get(table_id)
            if not table:
                return None
            if table.status != TableStatus.WAITING:
                return None
            if len(table.players) >= table.max_players:
                return None
            if any(p.session_id == session_id for p in table.players):
                return table  # Already in table

            table.players.append(Player(session_id=session_id, nickname=nickname))
            return table

    def leave_table(self, table_id: str, session_id: str) -> Table | None:
        table = self.tables.get(table_id)
        if not table:
            return None

        table.players = [p for p in table.players if p.session_id != session_id]

        if not table.players:
            del self.tables[table_id]
            return None

        # Transfer host if needed
        if table.host_session_id == session_id:
            table.host_session_id = table.players[0].session_id

        return table

    def delete_table(self, table_id: str):
        self.tables.pop(table_id, None)

    def get_table(self, table_id: str) -> Table | None:
        return self.tables.get(table_id)

    def list_tables(self) -> list[dict]:
        result = []
        for table in self.tables.values():
            result.append(TableSummary(
                table_id=table.table_id,
                name=table.name,
                game_mode=table.game_mode,
                status=table.status,
                player_count=len(table.players),
                max_players=table.max_players,
                player_nicknames=[p.nickname for p in table.players],
            ).model_dump())
        return result

table_manager = TableManager()
