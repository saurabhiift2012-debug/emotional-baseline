"""In-process WebSocket connection manager for realtime updates.
Keyed by user_id so we can push booking/notification events to a specific
user (or psychologist) instantly."""
from typing import Dict, Set

from fastapi import WebSocket

from config import logger


class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, Set[WebSocket]] = {}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.active.setdefault(user_id, set()).add(ws)

    def disconnect(self, user_id: str, ws: WebSocket):
        conns = self.active.get(user_id)
        if conns:
            conns.discard(ws)
            if not conns:
                self.active.pop(user_id, None)

    async def send(self, user_id: str, message: dict):
        for ws in list(self.active.get(user_id, [])):
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.warning(f"WS send failed for {user_id}: {e}")
                self.disconnect(user_id, ws)


manager = ConnectionManager()
