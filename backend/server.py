"""TherapiShots backend — private emotional wellbeing API.

Design priorities: user safety, privacy, security, simplicity.
The pattern engine is DETERMINISTIC (numpy statistics). The LLM only
rephrases already-validated structured patterns — never raw history.

This module wires the FastAPI app together; feature logic lives in
`routes/` (HTTP layer) and `services/` (domain logic)."""
from datetime import datetime, timezone

from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware

from database import db, client
from services.psychologists import seed_psychologists
from services.users import default_consents
from routes import (meta, auth, account, checkins, insights,
                    psychologists, bookings, admin)

app = FastAPI(title="TherapiShots API")

# Everything is served under /api to match the Kubernetes ingress.
api_router = APIRouter(prefix="/api")
for module in (meta, auth, account, checkins, insights,
               psychologists, bookings, admin):
    api_router.include_router(module.router)


@app.on_event("startup")
async def _startup_seed():
    await seed_psychologists()
    try:
        await db.users.create_index("phone", unique=True, sparse=True)
    except Exception:
        pass
    # Demo phone account for OTP testing (idempotent)
    demo_phone = "+919999900000"
    existing = await db.users.find_one({"phone": demo_phone})
    if not existing:
        doc = {
            "phone": demo_phone, "email": None, "name": "Demo",
            "date_of_birth": "1995-01-01", "language": "en",
            "consents": default_consents(), "consent_version": 1,
            "health_connected": {"sleep": True, "activity": True, "steps": True, "heart": True},
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(doc)


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
