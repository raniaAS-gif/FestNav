from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers import auth, events, jenis_fasilitas
from app.routers import maps
from app.routers import fasilitas
from app.routers import rute

app = FastAPI(title="FestNav API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
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