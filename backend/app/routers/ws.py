import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.managers.connection import connection_manager
from app.managers.table import table_manager
from app.managers.game import game_manager
from app.models.events import ClientEvent, ServerEvent

router = APIRouter()

# Track pending removals so we can cancel them on reconnect
_pending_removals: dict[str, asyncio.Task] = {}


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
        elif table.status == "waiting" and len(table.players) < table.max_players:
            # Auto-join: player arrived via invite link without HTTP join
            from app.routers.lobby import sessions
            session_data = sessions.get(session_id)
            if session_data:
                nickname = session_data["nickname"]
                avatar = session_data.get("avatar", "fox")
                from app.models.player import Player
                table.players.append(Player(session_id=session_id, nickname=nickname, avatar=avatar))
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
    """Send a list of (target, event) tuples, then clean up if game is over."""
    for target, evt in events:
        if target == "broadcast":
            await connection_manager.broadcast_to_table(table_id, evt)
        else:
            await connection_manager.send_to_player(target, evt)

    # Check if game just ended — clean up table and engine
    engine = game_manager.active_games.get(table_id)
    if engine and engine.is_game_over():
        game_manager.end_game(table_id)
        table_manager.delete_table(table_id)


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
