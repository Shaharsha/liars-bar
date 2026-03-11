from fastapi import WebSocket
from app.models.events import ServerEvent

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}
        self.table_members: dict[str, set[str]] = {}
        self.player_table: dict[str, str] = {}

    def connect(self, session_id: str, websocket: WebSocket, table_id: str):
        self.active_connections[session_id] = websocket
        if table_id not in self.table_members:
            self.table_members[table_id] = set()
        self.table_members[table_id].add(session_id)
        self.player_table[session_id] = table_id

    def disconnect(self, session_id: str):
        self.active_connections.pop(session_id, None)
        table_id = self.player_table.pop(session_id, None)
        if table_id and table_id in self.table_members:
            self.table_members[table_id].discard(session_id)
            if not self.table_members[table_id]:
                del self.table_members[table_id]

    async def send_to_player(self, session_id: str, event: ServerEvent):
        ws = self.active_connections.get(session_id)
        if ws:
            try:
                await ws.send_json(event.model_dump())
            except Exception:
                pass

    async def broadcast_to_table(self, table_id: str, event: ServerEvent, exclude: set[str] | None = None):
        members = self.table_members.get(table_id, set())
        exclude = exclude or set()
        for session_id in members:
            if session_id not in exclude:
                await self.send_to_player(session_id, event)

connection_manager = ConnectionManager()
