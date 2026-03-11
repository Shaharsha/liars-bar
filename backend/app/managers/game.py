from app.game_logic.base import GameEngine
from app.game_logic.deck_engine import DeckEngine
from app.game_logic.dice_engine import DiceEngine
from app.models.table import Table, TableStatus, GameMode
from app.models.events import ServerEvent

class GameManager:
    def __init__(self):
        self.active_games: dict[str, GameEngine] = {}

    def start_game(self, table: Table) -> list[tuple[str, ServerEvent]]:
        table.status = TableStatus.IN_GAME

        player_ids = [p.session_id for p in table.players]
        nicknames = {p.session_id: p.nickname for p in table.players}

        if table.game_mode == GameMode.DECK:
            engine = DeckEngine()
        else:
            engine = DiceEngine()

        self.active_games[table.table_id] = engine
        return engine.initialize(player_ids, nicknames)

    def handle_action(self, table_id: str, player_id: str, action: str, data: dict) -> list[tuple[str, ServerEvent]]:
        engine = self.active_games.get(table_id)
        if not engine:
            return [(player_id, ServerEvent(event="error", data={"message": "No active game"}))]

        return engine.handle_action(player_id, action, data)

    def get_state_for_player(self, table_id: str, player_id: str) -> dict | None:
        engine = self.active_games.get(table_id)
        if not engine:
            return None
        return engine.get_state_for_player(player_id)

    def end_game(self, table_id: str):
        self.active_games.pop(table_id, None)

game_manager = GameManager()
