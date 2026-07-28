"""Realtime WebSocket endpoint. Auth via `?token=<JWT>` query param (headers are
awkward for WS clients). Streams booking + notification events for the user."""
import jwt
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from bson import ObjectId

from config import SECRET_KEY, ALGORITHM
from services.realtime import manager

router = APIRouter()


@router.websocket("/ws")
async def ws_endpoint(websocket: WebSocket, token: str = ""):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        uid = payload.get("sub")
        ObjectId(uid)
    except Exception:
        await websocket.close(code=1008)
        return
    await manager.connect(uid, websocket)
    try:
        while True:
            # keepalive; client may ping. We ignore inbound content.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(uid, websocket)
    except Exception:
        manager.disconnect(uid, websocket)
