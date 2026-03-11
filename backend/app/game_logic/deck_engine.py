import random
from app.game_logic.base import GameEngine
from app.game_logic.roulette import Revolver
from app.models.events import ServerEvent
from app.models.game import GamePhase

CARD_TYPES = ["ace", "king", "queen"]
DECK = (["ace"] * 6 + ["king"] * 6 + ["queen"] * 6 + ["joker"] * 2)

class DeckEngine(GameEngine):
    def __init__(self):
        self.player_ids: list[str] = []
        self.hands: dict[str, list[str]] = {}
        self.table_card: str = ""
        self.last_play: dict | None = None  # {player_id, cards, count}
        self.turn_order: list[str] = []
        self.current_turn_idx: int = 0
        self.revolvers: dict[str, Revolver] = {}
        self.eliminated: set[str] = set()
        self.phase: GamePhase = GamePhase.DEALING
        self.round_number: int = 0
        self.discard_pile: list[str] = []
        self.nicknames: dict[str, str] = {}
        self.avatars: dict[str, str] = {}

    def initialize(self, player_ids: list[str], nicknames: dict[str, str] = None, avatars: dict[str, str] = None) -> list[tuple[str, ServerEvent]]:
        self.player_ids = player_ids
        self.nicknames = nicknames or {}
        self.avatars = avatars or {}
        self.revolvers = {pid: Revolver() for pid in player_ids}
        return self._start_round()

    def _start_round(self) -> list[tuple[str, ServerEvent]]:
        self.round_number += 1
        self.last_play = None
        self.discard_pile = []

        # Pick table card
        self.table_card = random.choice(CARD_TYPES)

        # Shuffle and deal
        deck = DECK.copy()
        random.shuffle(deck)

        alive = [pid for pid in self.player_ids if pid not in self.eliminated]
        self.turn_order = alive.copy()
        self.current_turn_idx = 0

        cards_per_player = min(5, len(deck) // len(alive))
        self.hands = {}
        for pid in alive:
            self.hands[pid] = deck[:cards_per_player]
            deck = deck[cards_per_player:]

        self.phase = GamePhase.PLAYING

        events: list[tuple[str, ServerEvent]] = []

        # Send round start to all
        events.append(("broadcast", ServerEvent(
            event="round_starting",
            data={"round_number": self.round_number, "table_card": self.table_card}
        )))

        # Send individual hands
        for pid in alive:
            events.append((pid, ServerEvent(
                event="game_state",
                data=self.get_state_for_player(pid)
            )))

        # Announce turn
        current = self.turn_order[self.current_turn_idx]
        events.append(("broadcast", ServerEvent(
            event="turn_start",
            data={"player_id": current, "timeout_ms": 30000, "can_call_liar": False}
        )))

        return events

    def handle_action(self, player_id: str, action: str, data: dict) -> list[tuple[str, ServerEvent]]:
        if player_id in self.eliminated:
            return [(player_id, ServerEvent(event="error", data={"message": "You are eliminated"}))]

        current = self.turn_order[self.current_turn_idx]
        if player_id != current:
            return [(player_id, ServerEvent(event="error", data={"message": "Not your turn"}))]

        if action == "play_cards":
            return self._play_cards(player_id, data.get("cards", []))
        elif action == "call_liar":
            return self._call_liar(player_id)

        return [(player_id, ServerEvent(event="error", data={"message": "Invalid action"}))]

    def _play_cards(self, player_id: str, card_indices: list[int]) -> list[tuple[str, ServerEvent]]:
        hand = self.hands.get(player_id, [])

        if not card_indices or len(card_indices) > 3 or len(card_indices) > len(hand):
            return [(player_id, ServerEvent(event="error", data={"message": "Play 1-3 cards"}))]

        # Validate indices
        if any(i < 0 or i >= len(hand) for i in card_indices):
            return [(player_id, ServerEvent(event="error", data={"message": "Invalid card index"}))]

        # Remove cards from hand (reverse sort to remove from end first)
        played_cards = [hand[i] for i in sorted(card_indices)]
        for i in sorted(card_indices, reverse=True):
            hand.pop(i)

        self.last_play = {
            "player_id": player_id,
            "cards": played_cards,
            "count": len(played_cards),
        }
        self.discard_pile.extend(played_cards)

        events: list[tuple[str, ServerEvent]] = []

        # Broadcast that cards were played (face-down, no card info)
        events.append(("broadcast", ServerEvent(
            event="cards_played",
            data={"player_id": player_id, "count": len(played_cards)}
        )))

        # Send updated hand to the player
        events.append((player_id, ServerEvent(
            event="game_state",
            data=self.get_state_for_player(player_id)
        )))

        # Advance turn
        self._advance_turn()

        # Check if round is over (everyone out of cards and no one can call liar)
        if self._check_round_over():
            events.extend(self._start_round())
        else:
            current = self.turn_order[self.current_turn_idx]
            events.append(("broadcast", ServerEvent(
                event="turn_start",
                data={
                    "player_id": current,
                    "timeout_ms": 30000,
                    "can_call_liar": self.last_play is not None,
                }
            )))

        return events

    def _call_liar(self, caller_id: str) -> list[tuple[str, ServerEvent]]:
        if self.last_play is None:
            return [(caller_id, ServerEvent(event="error", data={"message": "No cards to challenge"}))]

        target_id = self.last_play["player_id"]
        played_cards = self.last_play["cards"]

        # Check if the accused was lying
        was_lying = any(
            card != self.table_card and card != "joker"
            for card in played_cards
        )

        events: list[tuple[str, ServerEvent]] = []

        # Broadcast liar called
        events.append(("broadcast", ServerEvent(
            event="liar_called",
            data={"caller_id": caller_id, "target_id": target_id}
        )))

        # Reveal cards
        events.append(("broadcast", ServerEvent(
            event="cards_revealed",
            data={"cards": played_cards, "was_lying": was_lying}
        )))

        # Determine who plays roulette
        loser_id = target_id if was_lying else caller_id

        # Play roulette
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
                    "winner_avatar": self.avatars.get(winner, "fox") if winner else None,
                }
            )))
        else:
            # Start new round
            events.extend(self._start_round())

        return events

    def _advance_turn(self):
        if not self.turn_order:
            return

        alive = [pid for pid in self.turn_order if pid not in self.eliminated]
        if not alive:
            return

        # Find next alive player with cards
        max_iters = len(self.turn_order)
        attempts = 0
        while attempts < max_iters:
            self.current_turn_idx = (self.current_turn_idx + 1) % len(self.turn_order)
            current = self.turn_order[self.current_turn_idx]
            if current not in self.eliminated and len(self.hands.get(current, [])) > 0:
                return
            attempts += 1

        # If no one has cards, find any alive player (they can only call liar)
        for i, pid in enumerate(self.turn_order):
            if pid not in self.eliminated:
                self.current_turn_idx = i
                return

    def _check_round_over(self) -> bool:
        alive = [pid for pid in self.turn_order if pid not in self.eliminated]
        # Round is over if no alive player has cards AND there's no last play to challenge
        has_cards = any(len(self.hands.get(pid, [])) > 0 for pid in alive)
        if not has_cards and self.last_play is None:
            return True
        # Also over if only one player has cards and the last play is None
        return False

    def get_state_for_player(self, player_id: str) -> dict:
        alive = [pid for pid in self.player_ids if pid not in self.eliminated]
        return {
            "game_mode": "deck",
            "phase": self.phase,
            "round_number": self.round_number,
            "table_card": self.table_card,
            "your_hand": self.hands.get(player_id, []),
            "hand_sizes": {pid: len(self.hands.get(pid, [])) for pid in alive},
            "current_turn": self.turn_order[self.current_turn_idx] if self.turn_order else None,
            "last_play": {
                "player_id": self.last_play["player_id"],
                "count": self.last_play["count"],
            } if self.last_play else None,
            "players": [
                {
                    "session_id": pid,
                    "nickname": self.nicknames.get(pid, "Unknown"),
                    "avatar": self.avatars.get(pid, "fox"),
                    "is_alive": pid not in self.eliminated,
                    "revolver": self.revolvers[pid].get_state() if pid in self.revolvers else None,
                }
                for pid in self.player_ids
            ],
            "eliminated": list(self.eliminated),
        }

    def get_current_player_id(self) -> str | None:
        if not self.turn_order or self.current_turn_idx >= len(self.turn_order):
            return None
        return self.turn_order[self.current_turn_idx]

    def is_game_over(self) -> bool:
        return self.phase == GamePhase.GAME_OVER
