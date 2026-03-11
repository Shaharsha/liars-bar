from app.game_logic.deck_engine import DeckEngine

def test_deck_engine_initialize():
    engine = DeckEngine()
    events = engine.initialize(["p1", "p2", "p3"], {"p1": "Alice", "p2": "Bob", "p3": "Charlie"})
    assert len(events) > 0
    assert engine.table_card in ["ace", "king", "queen"]
    assert all(len(engine.hands[pid]) == 5 for pid in ["p1", "p2", "p3"])

def test_deck_engine_play_cards():
    engine = DeckEngine()
    engine.initialize(["p1", "p2"], {"p1": "Alice", "p2": "Bob"})
    current = engine.get_current_player_id()
    events = engine.handle_action(current, "play_cards", {"cards": [0]})
    assert any(e.event == "cards_played" for _, e in events)

def test_deck_engine_call_liar():
    engine = DeckEngine()
    engine.initialize(["p1", "p2"], {"p1": "Alice", "p2": "Bob"})

    # First player plays cards
    p1 = engine.get_current_player_id()
    engine.handle_action(p1, "play_cards", {"cards": [0]})

    # Second player calls liar
    p2 = engine.get_current_player_id()
    events = engine.handle_action(p2, "call_liar", {})

    event_names = [e.event for _, e in events]
    assert "liar_called" in event_names
    assert "cards_revealed" in event_names
    assert "roulette_result" in event_names
