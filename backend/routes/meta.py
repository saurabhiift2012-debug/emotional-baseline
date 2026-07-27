"""Meta routes: health check, public config catalogue, doc download."""
import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from catalog import MOODS, CONTEXT_TAGS, SMALL_STEPS, CONSENT_KEYS, RESOURCE_CATALOG

router = APIRouter()


@router.get("/")
async def root():
    return {"app": "TherapiShots", "status": "ok"}


@router.get("/config")
async def config():
    return {"moods": MOODS, "context_tags": CONTEXT_TAGS,
            "small_steps": SMALL_STEPS, "consent_keys": CONSENT_KEYS,
            "resources": RESOURCE_CATALOG}


@router.get("/downloads/mood-clinical-review")
async def download_mood_clinical_review():
    """Public download of the per-mood clinical-review Word document."""
    path = "/app/TherapiShots_Mood_Clinical_Review.docx"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Document not found")
    return FileResponse(
        path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename="TherapiShots_Mood_Clinical_Review.docx",
    )
