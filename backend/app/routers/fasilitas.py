import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from geoalchemy2.elements import WKTElement
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_pengelola
from app.database import get_db
from app.models import Event, Fasilitas, JenisFasilitas, LogAktivitas, Map, Pengelola
from app.schemas_fasilitas import (
    FasilitasCreate,
    FasilitasResponse,
    FasilitasUpdate,
    GeoJSONPolygon,
)

router = APIRouter(prefix="/api/fasilitas", tags=["Fasilitas"])


def _cek_akses_map(db: Session, id_map: int, pengelola: Pengelola) -> Map:
    peta = db.query(Map).filter(Map.id_map == id_map).first()
    if not peta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Map tidak ditemukan",
        )

    ev = db.query(Event).filter(Event.id_event == peta.id_event).first()
    if not ev:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event tidak ditemukan",
        )

    if pengelola.peran != "admin" and ev.id_organizer != pengelola.id_pengelola:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Anda tidak memiliki akses untuk mengelola fasilitas pada map ini",
        )
    return peta


def _cek_kode_jenis(db: Session, kode_jenis: str) -> JenisFasilitas:
    jenis = (
        db.query(JenisFasilitas)
        .filter(JenisFasilitas.kode == kode_jenis)
        .first()
    )
    if not jenis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Kode jenis fasilitas '{kode_jenis}' tidak ditemukan",
        )
    return jenis


def _polygon_to_wkt(polygon: Optional[GeoJSONPolygon]) -> Optional[WKTElement]:
    if polygon is None:
        return None

    coords = polygon.coordinates
    if not coords or not coords[0] or len(coords[0]) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Koordinat Polygon minimal harus memiliki 3 titik",
        )

    rings_wkt = []
    for ring in coords:
        ring_pts = [list(pt) for pt in ring]
        # Otomatis tutup poligon jika titik pertama != titik terakhir
        if ring_pts[0] != ring_pts[-1]:
            ring_pts.append(ring_pts[0])
        pts_str = ", ".join(f"{pt[0]} {pt[1]}" for pt in ring_pts)
        rings_wkt.append(f"({pts_str})")

    wkt = f"POLYGON({', '.join(rings_wkt)})"
    return WKTElement(wkt, srid=4326)


def _serialize_fasilitas(db: Session, item: Fasilitas) -> dict:
    geom_row = (
        db.query(
            func.ST_AsGeoJSON(Fasilitas.bentuk).label("bentuk_json"),
            func.ST_AsGeoJSON(Fasilitas.titik_pin).label("titik_pin_json"),
        )
        .filter(Fasilitas.id_fasilitas == item.id_fasilitas)
        .first()
    )

    bentuk_dict = (
        json.loads(geom_row.bentuk_json)
        if geom_row and geom_row.bentuk_json
        else None
    )
    titik_pin_dict = (
        json.loads(geom_row.titik_pin_json)
        if geom_row and geom_row.titik_pin_json
        else None
    )

    return {
        "id_fasilitas": item.id_fasilitas,
        "id_map": item.id_map,
        "kode_jenis": item.kode_jenis,
        "nama_fasilitas": item.nama_fasilitas,
        "deskripsi": item.deskripsi,
        "bentuk": bentuk_dict,
        "titik_pin": titik_pin_dict,
        "label_penanda": item.label_penanda,
        "jenis": item.jenis,
    }


# 1. Ambil semua fasilitas pada 1 map (Publik - untuk Android & Web)
@router.get("/map/{id_map}", response_model=List[FasilitasResponse])
def get_fasilitas_by_map(id_map: int, db: Session = Depends(get_db)):
    items = (
        db.query(Fasilitas)
        .filter(Fasilitas.id_map == id_map)
        .order_by(Fasilitas.id_fasilitas.asc())
        .all()
    )
    return [_serialize_fasilitas(db, item) for item in items]


# 2. Ambil detail 1 fasilitas
@router.get("/{id_fasilitas}", response_model=FasilitasResponse)
def get_fasilitas_detail(id_fasilitas: int, db: Session = Depends(get_db)):
    item = (
        db.query(Fasilitas)
        .filter(Fasilitas.id_fasilitas == id_fasilitas)
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fasilitas tidak ditemukan",
        )
    return _serialize_fasilitas(db, item)


# 3. Tambah fasilitas baru ke map
@router.post("", response_model=FasilitasResponse, status_code=status.HTTP_201_CREATED)
def create_fasilitas(
    payload: FasilitasCreate,
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    _cek_akses_map(db, payload.id_map, pengelola)
    _cek_kode_jenis(db, payload.kode_jenis)

    fasilitas_baru = Fasilitas(
        id_map=payload.id_map,
        kode_jenis=payload.kode_jenis,
        nama_fasilitas=payload.nama_fasilitas,
        deskripsi=payload.deskripsi,
        bentuk=_polygon_to_wkt(payload.bentuk),
    )
    db.add(fasilitas_baru)
    db.flush()

    db.add(
        LogAktivitas(
            id_pengelola=pengelola.id_pengelola,
            aksi="tambah_fasilitas",
            objek_tipe="fasilitas",
            objek_id=fasilitas_baru.id_fasilitas,
        )
    )
    db.commit()
    db.refresh(fasilitas_baru)
    return _serialize_fasilitas(db, fasilitas_baru)


# 4. Update fasilitas (Partial update)
@router.patch("/{id_fasilitas}", response_model=FasilitasResponse)
def update_fasilitas(
    id_fasilitas: int,
    payload: FasilitasUpdate,
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    item = (
        db.query(Fasilitas)
        .filter(Fasilitas.id_fasilitas == id_fasilitas)
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fasilitas tidak ditemukan",
        )

    _cek_akses_map(db, item.id_map, pengelola)

    updates = payload.model_dump(exclude_unset=True)
    if "kode_jenis" in updates and updates["kode_jenis"] is not None:
        _cek_kode_jenis(db, updates["kode_jenis"])

    if "bentuk" in updates:
        item.bentuk = _polygon_to_wkt(payload.bentuk)
        del updates["bentuk"]

    for key, value in updates.items():
        setattr(item, key, value)

    db.add(
        LogAktivitas(
            id_pengelola=pengelola.id_pengelola,
            aksi="ubah_fasilitas",
            objek_tipe="fasilitas",
            objek_id=item.id_fasilitas,
        )
    )
    db.commit()
    db.refresh(item)
    return _serialize_fasilitas(db, item)


# 5. Hapus fasilitas
@router.delete("/{id_fasilitas}", status_code=status.HTTP_204_NO_CONTENT)
def delete_fasilitas(
    id_fasilitas: int,
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    item = (
        db.query(Fasilitas)
        .filter(Fasilitas.id_fasilitas == id_fasilitas)
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fasilitas tidak ditemukan",
        )

    _cek_akses_map(db, item.id_map, pengelola)

    db.delete(item)
    db.add(
        LogAktivitas(
            id_pengelola=pengelola.id_pengelola,
            aksi="hapus_fasilitas",
            objek_tipe="fasilitas",
            objek_id=id_fasilitas,
        )
    )
    db.commit()