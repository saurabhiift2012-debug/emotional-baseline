"""Push device registration relay (backend-only upstream calls)."""
from fastapi import APIRouter, HTTPException

from models import RegisterPushBody
from services.push import register_device

router = APIRouter()


@router.post("/register-push", status_code=201)
async def register_push(body: RegisterPushBody):
    try:
        return await register_device(body.user_id, body.platform, body.device_token)
    except Exception as e:
        code = getattr(getattr(e, "response", None), "status_code", None)
        if code == 401:
            raise HTTPException(500, "EMERGENT_PUSH_KEY missing or invalid")
        raise HTTPException(502, "Push provider unavailable")
