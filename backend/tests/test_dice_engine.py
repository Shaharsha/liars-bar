from app.game_logic.dice_engine import DiceEngine

def test_dice_engine_initialize():
    engine = DiceEngine()
    events = engine.initialize(["p1", "p2", "p3"], {"p1": "Alice", "p2": "Bob", "p3": "Charlie"})
    assert len(events) > 0
    assert all(len(engine.dice[pid]) == 5 for pid in ["p1", "p2", "p3"])

def test_dice_engine_place_bid():
    engine = DiceEngine()
    engine.initialize(["p1", "p2"], {"p1": "Alice", "p2": "Bob"})
    current = engine.get_current_player_id()
    events = engine.handle_action(current, "place_bid", {"quantity": 3, "face_value": 4})
    assert any(e.event == "bid_placed" for _, e in events)

def test_dice_engine_challenge():
    engine = DiceEngine()
    engine.initialize(["p1", "p2"], {"p1": "Alice", "p2": "Bob"})

    # First player bids
    p1 = engine.get_current_player_id()
    engine.handle_action(p1, "place_bid", {"quantity": 3, "face_value": 4})

    # Second player challenges
    p2 = engine.get_current_player_id()
    events = engine.handle_action(p2, "challenge_bid", {})

    event_names = [e.event for _, e in events]
    assert "bid_challenged" in event_names
    assert "dice_revealed" in event_names
    assert "roulette_result" in event_names
