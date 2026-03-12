import asyncio
import random
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.managers.connection import connection_manager
from app.managers.table import table_manager
from app.managers.game import game_manager
from app.models.events import ClientEvent, ServerEvent

router = APIRouter()

# Track pending removals so we can cancel them on reconnect
_pending_removals: dict[str, asyncio.Task] = {}

# Track turn timeout tasks per table
_turn_timers: dict[str, asyncio.Task] = {}

TURN_TIMEOUT_SECONDS = 30


async def _delayed_remove(table_id: str, session_id: str):
    """Remove player from waiting table after a grace period."""
    try:
        await asyncio.sleep(15)
        table = table_manager.get_table(table_id)
        if table and table.status == "waiting":
            player = next((p for p in table.players if p.session_id == session_id), None)
            if player and not player.is_connected:
                is_host = table.host_session_id == session_id
                if is_host:
                    # Host left — close the table, send everyone back to lobby
                    await connection_manager.broadcast_to_table(table_id, ServerEvent(
                        event="table_closed",
                        data={"reason": "Host left the table"}
                    ))
                    table_manager.delete_table(table_id)
                else:
                    table_manager.leave_table(table_id, session_id)
                    await connection_manager.broadcast_to_table(table_id, ServerEvent(
                        event="player_left",
                        data={"session_id": session_id}
                    ))
    except asyncio.CancelledError:
        pass
    finally:
        _pending_removals.pop(session_id, None)


async def _turn_timeout(table_id: str):
    """Auto-play for a player who times out."""
    try:
        await asyncio.sleep(TURN_TIMEOUT_SECONDS)

        engine = game_manager.active_games.get(table_id)
        if not engine or engine.is_game_over():
            return

        current_player = engine.get_current_player_id()
        if not current_player:
            return

        from app.game_logic.deck_engine import DeckEngine
        from app.game_logic.dice_engine import DiceEngine

        if isinstance(engine, DeckEngine):
            hand = engine.hands.get(current_player, [])
            if hand:
                # Auto-play a random card
                count = min(len(hand), random.randint(1, min(3, len(hand))))
                indices = random.sample(range(len(hand)), count)
                events = engine.handle_action(current_player, "play_cards", {"cards": indices})
            elif engine.last_play is not None:
                # No cards, must call liar
                events = engine.handle_action(current_player, "call_liar", {})
            else:
                return
        elif isinstance(engine, DiceEngine):
            if engine.current_bid is not None:
                # Auto-challenge
                events = engine.handle_action(current_player, "challenge_bid", {})
            else:
                # First bid — auto-bid 1x of a random face
                events = engine.handle_action(current_player, "place_bid", {
                    "quantity": 1, "face_value": random.randint(2, 6)
                })
        else:
            return

        await _send_events(events, table_id)
    except asyncio.CancelledError:
        pass
    finally:
        _turn_timers.pop(table_id, None)


def _cancel_turn_timer(table_id: str):
    task = _turn_timers.pop(table_id, None)
    if task:
        task.cancel()


def _start_turn_timer(table_id: str):
    _cancel_turn_timer(table_id)
    _turn_timers[table_id] = asyncio.create_task(_turn_timeout(table_id))


def _build_table_state(table) -> dict:
    return {
        "table_id": table.table_id,
        "name": table.name,
        "game_mode": table.game_mode,
        "status": table.status,
        "host_session_id": table.host_session_id,
        "players": [{"session_id": p.session_id, "nickname": p.nickname, "avatar": p.avatar} for p in table.players],
        "max_players": table.max_players,
    }


@router.websocket("/ws/{table_id}")
async def websocket_endpoint(websocket: WebSocket, table_id: str, session_id: str = ""):
    if not session_id:
        await websocket.close(code=4001, reason="Missing session_id")
        return

    await websocket.accept()

    # Check table exists
    table = table_manager.get_table(table_id)
    if not table:
        await websocket.send_json(ServerEvent(
            event="table_closed",
            data={"reason": "Table not found"}
        ).model_dump())
        await websocket.close(code=4004, reason="Table not found")
        return

    await connection_manager.connect(session_id, websocket, table_id)

    # Cancel any pending removal from a previous disconnect (e.g. page refresh)
    task = _pending_removals.pop(session_id, None)
    if task:
        task.cancel()

    # Mark player as connected, or auto-join if not in table (e.g. invite link)
    table = table_manager.get_table(table_id)
    if table:
        player = next((p for p in table.players if p.session_id == session_id), None)
        if player:
            player.is_connected = True
        elif table.status == "waiting":
            # Auto-join: player arrived via invite link without HTTP join
            from app.routers.lobby import sessions
            session_data = sessions.get(session_id)
            if session_data:
                nickname = session_data["nickname"]
                avatar = session_data.get("avatar", "fox")
                joined_table = await table_manager.join_table(table_id, session_id, nickname, avatar)
                if joined_table:
                    await connection_manager.broadcast_to_table(table_id, ServerEvent(
                        event="player_joined",
                        data={"session_id": session_id, "nickname": nickname, "avatar": avatar}
                    ), exclude={session_id})

    try:
        # Send initial table state
        table = table_manager.get_table(table_id)
        if table:
            await connection_manager.send_to_player(session_id, ServerEvent(
                event="table_state",
                data=_build_table_state(table),
            ))
            # If game is in progress, also send current game state
            if table.status == "in_game":
                game_state = game_manager.get_state_for_player(table_id, session_id)
                if game_state:
                    await connection_manager.send_to_player(session_id, ServerEvent(
                        event="game_state",
                        data=game_state,
                    ))

        while True:
            raw = await websocket.receive_json()
            event = ClientEvent(**raw)
            await handle_client_event(event, session_id, table_id)

    except WebSocketDisconnect:
        await connection_manager.disconnect(session_id)
        # Mark player as disconnected
        table = table_manager.get_table(table_id)
        if table:
            for p in table.players:
                if p.session_id == session_id:
                    p.is_connected = False
                    break
            # In waiting state, schedule delayed removal instead of immediate
            if table.status == "waiting":
                task = asyncio.create_task(_delayed_remove(table_id, session_id))
                _pending_removals[session_id] = task

async def _send_events(events: list[tuple[str, ServerEvent]], table_id: str):
    """Send a list of (target, event) tuples, then manage turn timer and cleanup."""
    for target, evt in events:
        if target == "broadcast":
            await connection_manager.broadcast_to_table(table_id, evt)
        else:
            await connection_manager.send_to_player(target, evt)

    # Check if game just ended — delay cleanup so clients can see the game over screen
    engine = game_manager.active_games.get(table_id)
    if engine and engine.is_game_over():
        _cancel_turn_timer(table_id)
        async def _delayed_game_cleanup():
            await asyncio.sleep(15)
            game_manager.end_game(table_id)
            table_manager.delete_table(table_id)
            # Notify any still-connected clients
            await connection_manager.broadcast_to_table(
                table_id, ServerEvent(event="table_closed", data={})
            )
        asyncio.create_task(_delayed_game_cleanup())
    elif engine:
        # Game still active — restart turn timer for the new current player
        _start_turn_timer(table_id)


async def handle_client_event(event: ClientEvent, session_id: str, table_id: str):
    match event.event:
        case "start_game":
            table = table_manager.get_table(table_id)
            if not table or table.host_session_id != session_id:
                await connection_manager.send_to_player(session_id, ServerEvent(
                    event="error", data={"message": "Only host can start the game"}
                ))
                return
            if len([p for p in table.players if p.is_connected]) < 2:
                await connection_manager.send_to_player(session_id, ServerEvent(
                    event="error", data={"message": "Need at least 2 players"}
                ))
                return

            events = game_manager.start_game(table)
            await _send_events(events, table_id)

        case "play_cards" | "call_liar" | "place_bid" | "challenge_bid":
            events = game_manager.handle_action(table_id, session_id, event.event, event.data)
            await _send_events(events, table_id)

        case "ping":
            await connection_manager.send_to_player(session_id, ServerEvent(event="pong", data={}))
