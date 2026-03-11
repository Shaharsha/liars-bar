from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.managers.connection import connection_manager
from app.managers.table import table_manager
from app.managers.game import game_manager
from app.models.events import ClientEvent, ServerEvent

router = APIRouter()

@router.websocket("/ws/{table_id}")
async def websocket_endpoint(websocket: WebSocket, table_id: str, session_id: str = ""):
    if not session_id:
        await websocket.close(code=4001, reason="Missing session_id")
        return

    await websocket.accept()
    connection_manager.connect(session_id, websocket, table_id)

    try:
        # Send initial table state
        table = table_manager.get_table(table_id)
        if table:
            await connection_manager.send_to_player(session_id, ServerEvent(
                event="table_state",
                data={
                    "table_id": table.table_id,
                    "name": table.name,
                    "game_mode": table.game_mode,
                    "status": table.status,
                    "host_session_id": table.host_session_id,
                    "players": [{"session_id": p.session_id, "nickname": p.nickname} for p in table.players],
                    "max_players": table.max_players,
                }
            ))

        while True:
            raw = await websocket.receive_json()
            event = ClientEvent(**raw)
            await handle_client_event(event, session_id, table_id)

    except WebSocketDisconnect:
        connection_manager.disconnect(session_id)
        # Handle player leaving
        table = table_manager.get_table(table_id)
        if table and table.status == "waiting":
            table_manager.leave_table(table_id, session_id)
            await connection_manager.broadcast_to_table(table_id, ServerEvent(
                event="player_left",
                data={"session_id": session_id}
            ))

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
            for target, evt in events:
                if target == "broadcast":
                    await connection_manager.broadcast_to_table(table_id, evt)
                else:
                    await connection_manager.send_to_player(target, evt)

        case "play_cards":
            events = game_manager.handle_action(table_id, session_id, event.event, event.data)
            for target, evt in events:
                if target == "broadcast":
                    await connection_manager.broadcast_to_table(table_id, evt)
                else:
                    await connection_manager.send_to_player(target, evt)

        case "call_liar":
            events = game_manager.handle_action(table_id, session_id, event.event, event.data)
            for target, evt in events:
                if target == "broadcast":
                    await connection_manager.broadcast_to_table(table_id, evt)
                else:
                    await connection_manager.send_to_player(target, evt)

        case "place_bid":
            events = game_manager.handle_action(table_id, session_id, event.event, event.data)
            for target, evt in events:
                if target == "broadcast":
                    await connection_manager.broadcast_to_table(table_id, evt)
                else:
                    await connection_manager.send_to_player(target, evt)

        case "challenge_bid":
            events = game_manager.handle_action(table_id, session_id, event.event, event.data)
            for target, evt in events:
                if target == "broadcast":
                    await connection_manager.broadcast_to_table(table_id, evt)
                else:
                    await connection_manager.send_to_player(target, evt)

        case "ping":
            await connection_manager.send_to_player(session_id, ServerEvent(event="pong", data={}))
