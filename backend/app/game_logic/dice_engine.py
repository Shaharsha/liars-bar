import random
from app.game_logic.base import GameEngine
from app.game_logic.roulette import Revolver
from app.models.events import ServerEvent
from app.models.game import GamePhase

class DiceEngine(GameEngine):
    def __init__(self):
        self.player_ids: list[str] = []
        self.dice: dict[str, list[int]] = {}
        self.current_bid: dict | None = None  # {player_id, quantity, face_value}
        self.bid_history: list[dict] = []
        self.turn_order: list[str] = []
        self.current_turn_idx: int = 0
        self.revolvers: dict[str, Revolver] = {}
        self.eliminated: set[str] = set()
        self.phase: GamePhase = GamePhase.DEALING
        self.round_number: int = 0
        self.nicknames: dict[str, str] = {}

    def initialize(self, player_ids: list[str], nicknames: dict[str, str] = None) -> list[tuple[str, ServerEvent]]:
        self.player_ids = player_ids
        self.nicknames = nicknames or {}
        self.revolvers = {pid: Revolver() for pid in player_ids}
        return self._start_round()

    def _start_round(self) -> list[tuple[str, ServerEvent]]:
        self.round_number += 1
        self.current_bid = None
        self.bid_history = []

        alive = [pid for pid in self.player_ids if pid not in self.eliminated]
        self.turn_order = alive.copy()
        self.current_turn_idx = 0

        # Roll dice for each player
        self.dice = {pid: [random.randint(1, 6) for _ in range(5)] for pid in alive}

        self.phase = GamePhase.PLAYING

        events: list[tuple[str, ServerEvent]] = []

        events.append(("broadcast", ServerEvent(
            event="round_starting",
            data={"round_number": self.round_number}
        )))

        # Send individual dice
        for pid in alive:
            events.append((pid, ServerEvent(
                event="game_state",
                data=self.get_state_for_player(pid)
            )))

        current = self.turn_order[self.current_turn_idx]
        events.append(("broadcast", ServerEvent(
            event="turn_start",
            data={
                "player_id": current,
                "timeout_ms": 30000,
                "can_challenge": False,
            }
        )))

        return events

    def handle_action(self, player_id: str, action: str, data: dict) -> list[tuple[str, ServerEvent]]:
        if player_id in self.eliminated:
            return [(player_id, ServerEvent(event="error", data={"message": "You are eliminated"}))]

        current = self.turn_order[self.current_turn_idx]
        if player_id != current:
            return [(player_id, ServerEvent(event="error", data={"message": "Not your turn"}))]

        if action == "place_bid":
            return self._place_bid(player_id, data.get("quantity", 0), data.get("face_value", 0))
        elif action == "challenge_bid":
            return self._challenge_bid(player_id)

        return [(player_id, ServerEvent(event="error", data={"message": "Invalid action"}))]

    def _place_bid(self, player_id: str, quantity: int, face_value: int) -> list[tuple[str, ServerEvent]]:
        if face_value < 2 or face_value > 6:
            return [(player_id, ServerEvent(event="error", data={"message": "Face value must be 2-6"}))]

        if quantity < 1:
            return [(player_id, ServerEvent(event="error", data={"message": "Quantity must be at least 1"}))]

        # Validate bid is higher than current
        if self.current_bid:
            prev_qty = self.current_bid["quantity"]
            prev_face = self.current_bid["face_value"]
            if quantity < prev_qty or (quantity == prev_qty and face_value <= prev_face):
                return [(player_id, ServerEvent(event="error", data={
                    "message": "Bid must be higher: raise quantity or same quantity with higher face"
                }))]

        self.current_bid = {
            "player_id": player_id,
            "quantity": quantity,
            "face_value": face_value,
        }
        self.bid_history.append(self.current_bid.copy())

        events: list[tuple[str, ServerEvent]] = []

        events.append(("broadcast", ServerEvent(
            event="bid_placed",
            data={"player_id": player_id, "quantity": quantity, "face_value": face_value}
        )))

        # Advance turn
        self._advance_turn()
        current = self.turn_order[self.current_turn_idx]
        events.append(("broadcast", ServerEvent(
            event="turn_start",
            data={
                "player_id": current,
                "timeout_ms": 30000,
                "can_challenge": True,
            }
        )))

        return events

    def _challenge_bid(self, challenger_id: str) -> list[tuple[str, ServerEvent]]:
        if self.current_bid is None:
            return [(challenger_id, ServerEvent(event="error", data={"message": "No bid to challenge"}))]

        bidder_id = self.current_bid["player_id"]
        bid_quantity = self.current_bid["quantity"]
        bid_face = self.current_bid["face_value"]

        # Count all dice of bid_face across all alive players
        # 1s are wild (count as any face)
        actual_count = 0
        for pid in self.turn_order:
            if pid not in self.eliminated:
                for die in self.dice.get(pid, []):
                    if die == bid_face or die == 1:
                        actual_count += 1

        bid_correct = actual_count >= bid_quantity
        loser_id = challenger_id if bid_correct else bidder_id

        events: list[tuple[str, ServerEvent]] = []

        events.append(("broadcast", ServerEvent(
            event="bid_challenged",
            data={"challenger_id": challenger_id, "bidder_id": bidder_id}
        )))

        # Reveal all dice
        events.append(("broadcast", ServerEvent(
            event="dice_revealed",
            data={
                "all_dice": {pid: self.dice[pid] for pid in self.dice if pid not in self.eliminated},
                "actual_count": actual_count,
                "bid_quantity": bid_quantity,
                "bid_face_value": bid_face,
                "bid_was_correct": bid_correct,
            }
        )))

        # Roulette
        revolver = self.revolvers[loser_id]
        is_dead = revolver.pull_trigger()

        events.append(("broadcast", ServerEvent(
            event="roulette_result",
            data={
                "player_id": loser_id,
                "survived": not is_dead,
                "shots_fired": revolver.shots_fired,
                "chambers": revolver.chambers,
            }
        )))

        if is_dead:
            self.eliminated.add(loser_id)
            events.append(("broadcast", ServerEvent(
                event="player_eliminated",
                data={"player_id": loser_id}
            )))

        # Check game over
        alive = [pid for pid in self.player_ids if pid not in self.eliminated]
        if len(alive) <= 1:
            self.phase = GamePhase.GAME_OVER
            winner = alive[0] if alive else None
            events.append(("broadcast", ServerEvent(
                event="game_over",
                data={
                    "winner_id": winner,
                    "winner_nickname": self.nicknames.get(winner, "Unknown") if winner else None,
                }
            )))
        else:
            events.extend(self._start_round())

        return events

    def _advance_turn(self):
        if not self.turn_order:
            return

        alive = [pid for pid in self.turn_order if pid not in self.eliminated]
        if not alive:
            return

        max_iters = len(self.turn_order)
        attempts = 0
        while attempts < max_iters:
            self.current_turn_idx = (self.current_turn_idx + 1) % len(self.turn_order)
            if self.turn_order[self.current_turn_idx] not in self.eliminated:
                break
            attempts += 1

    def get_state_for_player(self, player_id: str) -> dict:
        return {
            "game_mode": "dice",
            "phase": self.phase,
            "round_number": self.round_number,
            "your_dice": self.dice.get(player_id, []),
            "dice_counts": {pid: len(self.dice.get(pid, [])) for pid in self.turn_order if pid not in self.eliminated},
            "current_turn": self.turn_order[self.current_turn_idx] if self.turn_order else None,
            "current_bid": self.current_bid,
            "bid_history": self.bid_history,
            "players": [
                {
                    "session_id": pid,
                    "nickname": self.nicknames.get(pid, "Unknown"),
                    "is_alive": pid not in self.eliminated,
                    "revolver": self.revolvers[pid].get_state() if pid in self.revolvers else None,
                }
                for pid in self.player_ids
            ],
            "eliminated": list(self.eliminated),
        }

    def get_current_player_id(self) -> str | None:
        if not self.turn_order:
            return None
        return self.turn_order[self.current_turn_idx]

    def is_game_over(self) -> bool:
        return self.phase == GamePhase.GAME_OVER
