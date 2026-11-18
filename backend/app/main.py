from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers import (
    admin,
    auth,
    events,
    fasilitas,
    gambar_event,
    jenis_fasilitas,
    maps,
    request_publish,
    rute,
    scraping,
)
from app.routers import favorit

app = FastAPI(title="FestNav API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(events.router)
app.include_router(jenis_fasilitas.router)
app.include_router(maps.router)
app.include_router(fasilitas.router)
app.include_router(rute.router)
app.include_router(request_publish.router)
app.include_router(scraping.router)
app.include_router(gambar_event.router)
app.include_router(admin.router)
app.include_router(favorit.router)

@app.get("/")
def root():
    return {"message": "FestNav API aktif", "docs": "/docs", "health": "/health"}


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        result = db.execute(text("SELECT version();")).scalar()
        return {
            "status": "ok",
            "database": "connected",
            "postgres_version": result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Koneksi database gagal: {str(e)}")