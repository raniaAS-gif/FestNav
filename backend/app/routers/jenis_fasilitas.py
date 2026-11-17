from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import require_admin
from app.database import get_db
from app.models import JenisFasilitas, Pengelola
from app.schemas_event import (
    JenisFasilitasCreate,
    JenisFasilitasResponse,
    JenisFasilitasUpdate,
)

router = APIRouter(prefix="/api/jenis-fasilitas", tags=["Jenis Fasilitas"])


@router.get("", response_model=list[JenisFasilitasResponse])
def list_jenis_fasilitas(
    include_inactive: bool = Query(False, description="Sertakan jenis fasilitas yang nonaktif"),
    db: Session = Depends(get_db),
):
    query = db.query(JenisFasilitas)
    if not include_inactive:
        query = query.filter(JenisFasilitas.aktif.is_(True))
    return query.order_by(JenisFasilitas.urutan.asc(), JenisFasilitas.kode.asc()).all()


@router.post("", response_model=JenisFasilitasResponse, status_code=status.HTTP_201_CREATED)
def create_jenis_fasilitas(
    payload: JenisFasilitasCreate,
    db: Session = Depends(get_db),
    _: Pengelola = Depends(require_admin),
):
    existing = db.query(JenisFasilitas).filter(JenisFasilitas.kode == payload.kode).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Kode jenis fasilitas '{payload.kode}' sudah terdaftar",
        )

    item = JenisFasilitas(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{kode}", response_model=JenisFasilitasResponse)
def update_jenis_fasilitas(
    kode: str,
    payload: JenisFasilitasUpdate,
    db: Session = Depends(get_db),
    _: Pengelola = Depends(require_admin),
):
    item = db.query(JenisFasilitas).filter(JenisFasilitas.kode == kode).first()
    if not item:
        raise HTTPException(status_code=404, detail="Jenis fasilitas tidak ditemukan")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{kode}", status_code=status.HTTP_204_NO_CONTENT)
def delete_jenis_fasilitas(
    kode: str,
    db: Session = Depends(get_db),
    _: Pengelola = Depends(require_admin),
):
    item = db.query(JenisFasilitas).filter(JenisFasilitas.kode == kode).first()
    if not item:
        raise HTTPException(status_code=404, detail="Jenis fasilitas tidak ditemukan")

    try:
        db.delete(item)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Jenis fasilitas sedang dipakai pada peta. Nonaktifkan saja (aktif=false).",
        )