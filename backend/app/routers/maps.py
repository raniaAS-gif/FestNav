from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_pengelola
from app.database import get_db
from app.models import Event, LogAktivitas, Map, Pengelola
from app.schemas_map import MapCreate, MapResponse, MapUpdate

router = APIRouter(prefix="/api/maps", tags=["Maps"])


def _cek_akses_event(db: Session, id_event: int, pengelola: Pengelola) -> Event:
    ev = db.query(Event).filter(Event.id_event == id_event).first()
    if not ev:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event tidak ditemukan",
        )
    if pengelola.peran != "admin" and ev.id_organizer != pengelola.id_pengelola:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Anda tidak memiliki akses untuk mengelola map pada event ini",
        )
    return ev


def _reset_map_utama(db: Session, id_event: int, exclude_id_map: int | None = None):
    query = db.query(Map).filter(Map.id_event == id_event, Map.is_utama.is_(True))
    if exclude_id_map is not None:
        query = query.filter(Map.id_map != exclude_id_map)
    query.update({"is_utama": False}, synchronize_session=False)


# 1. Ambil semua map milik suatu event (Publik - untuk Web & Android)
@router.get("/event/{id_event}", response_model=List[MapResponse])
def get_maps_by_event(id_event: int, db: Session = Depends(get_db)):
    return (
        db.query(Map)
        .filter(Map.id_event == id_event)
        .order_by(Map.urutan.asc(), Map.id_map.asc())
        .all()
    )


# 2. Ambil detail 1 map
@router.get("/{id_map}", response_model=MapResponse)
def get_map_detail(id_map: int, db: Session = Depends(get_db)):
    peta = db.query(Map).filter(Map.id_map == id_map).first()
    if not peta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Map tidak ditemukan",
        )
    return peta


# 3. Buat map baru
@router.post("", response_model=MapResponse, status_code=status.HTTP_201_CREATED)
def create_map(
    payload: MapCreate,
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    _cek_akses_event(db, payload.id_event, pengelola)

    if payload.is_utama:
        _reset_map_utama(db, payload.id_event)

    data = payload.model_dump()
    if data.get("status_map") == "published":
        data["dipublish_pada"] = datetime.now(timezone.utc)

    peta_baru = Map(**data)
    db.add(peta_baru)
    db.flush()

    db.add(
        LogAktivitas(
            id_pengelola=pengelola.id_pengelola,
            aksi="tambah_map",
            objek_tipe="map",
            objek_id=peta_baru.id_map,
        )
    )
    db.commit()
    db.refresh(peta_baru)
    return peta_baru


# 4. Update map (Partial update)
@router.patch("/{id_map}", response_model=MapResponse)
def update_map(
    id_map: int,
    payload: MapUpdate,
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    peta = db.query(Map).filter(Map.id_map == id_map).first()
    if not peta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Map tidak ditemukan",
        )

    _cek_akses_event(db, peta.id_event, pengelola)

    updates = payload.model_dump(exclude_unset=True)
    if updates.get("is_utama") is True:
        _reset_map_utama(db, peta.id_event, exclude_id_map=id_map)

    if updates.get("status_map") == "published" and peta.dipublish_pada is None:
        peta.dipublish_pada = datetime.now(timezone.utc)

    for key, value in updates.items():
        setattr(peta, key, value)

    db.add(
        LogAktivitas(
            id_pengelola=pengelola.id_pengelola,
            aksi="ubah_map",
            objek_tipe="map",
            objek_id=peta.id_map,
        )
    )
    db.commit()
    db.refresh(peta)
    return peta


# 5. Hapus map
@router.delete("/{id_map}", status_code=status.HTTP_204_NO_CONTENT)
def delete_map(
    id_map: int,
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    peta = db.query(Map).filter(Map.id_map == id_map).first()
    if not peta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Map tidak ditemukan",
        )

    _cek_akses_event(db, peta.id_event, pengelola)

    db.delete(peta)
    db.add(
        LogAktivitas(
            id_pengelola=pengelola.id_pengelola,
            aksi="hapus_map",
            objek_tipe="map",
            objek_id=id_map,
        )
    )
    db.commit()