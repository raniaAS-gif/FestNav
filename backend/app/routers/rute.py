import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from geoalchemy2.elements import WKTElement
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_pengelola
from app.database import get_db
from app.models import Event, LogAktivitas, Map, Pengelola, Rute
from app.schemas_rute import GeoJSONLineString, RuteCreate, RuteResponse, RuteUpdate

router = APIRouter(prefix="/api/rute", tags=["Rute"])


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
            detail="Anda tidak memiliki akses untuk mengelola rute pada map ini",
        )
    return peta


def _linestring_to_wkt(line: GeoJSONLineString) -> WKTElement:
    coords = line.coordinates
    if not coords or len(coords) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Koordinat LineString minimal harus memiliki 2 titik",
        )

    for pt in coords:
        if len(pt) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Setiap titik koordinat harus berisi [longitude, latitude]",
            )

    pts_str = ", ".join(f"{pt[0]} {pt[1]}" for pt in coords)
    wkt = f"LINESTRING({pts_str})"
    return WKTElement(wkt, srid=4326)


def _hitung_jarak_meter(db: Session, wkt_element: WKTElement) -> float:
    panjang = db.query(
        func.ST_Length(func.ST_GeogFromText(wkt_element.data))
    ).scalar()
    return round(float(panjang), 2) if panjang is not None else 0.0


def _serialize_rute(db: Session, item: Rute) -> dict:
    geom_json = (
        db.query(func.ST_AsGeoJSON(Rute.bentuk_jalur_rute))
        .filter(Rute.id_rute == item.id_rute)
        .scalar()
    )

    return {
        "id_rute": item.id_rute,
        "id_map": item.id_map,
        "nama_rute": item.nama_rute,
        "titik_awal": item.titik_awal,
        "titik_akhir": item.titik_akhir,
        "bentuk_jalur_rute": json.loads(geom_json) if geom_json else None,
        "jarak": item.jarak,
        "akses_penggunaan": item.akses_penggunaan,
    }


# 1. Ambil semua rute pada 1 map (Publik - bisa difilter berdasarkan akses_penggunaan)
@router.get("/map/{id_map}", response_model=List[RuteResponse])
def get_rute_by_map(
    id_map: int,
    akses_penggunaan: Optional[str] = Query(
        default=None, description="Filter akses rute, misal: umum, vip, darurat"
    ),
    db: Session = Depends(get_db),
):
    query = db.query(Rute).filter(Rute.id_map == id_map)
    if akses_penggunaan:
        query = query.filter(Rute.akses_penggunaan == akses_penggunaan)

    items = query.order_by(Rute.id_rute.asc()).all()
    return [_serialize_rute(db, item) for item in items]


# 2. Ambil detail 1 rute
@router.get("/{id_rute}", response_model=RuteResponse)
def get_rute_detail(id_rute: int, db: Session = Depends(get_db)):
    item = db.query(Rute).filter(Rute.id_rute == id_rute).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rute tidak ditemukan",
        )
    return _serialize_rute(db, item)


# 3. Tambah rute baru ke map
@router.post("", response_model=RuteResponse, status_code=status.HTTP_201_CREATED)
def create_rute(
    payload: RuteCreate,
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    _cek_akses_map(db, payload.id_map, pengelola)

    wkt_jalur = _linestring_to_wkt(payload.bentuk_jalur_rute)
    jarak_meter = (
        payload.jarak
        if payload.jarak is not None
        else _hitung_jarak_meter(db, wkt_jalur)
    )

    rute_baru = Rute(
        id_map=payload.id_map,
        nama_rute=payload.nama_rute,
        titik_awal=payload.titik_awal,
        titik_akhir=payload.titik_akhir,
        bentuk_jalur_rute=wkt_jalur,
        jarak=jarak_meter,
        akses_penggunaan=payload.akses_penggunaan,
    )
    db.add(rute_baru)
    db.flush()

    db.add(
        LogAktivitas(
            id_pengelola=pengelola.id_pengelola,
            aksi="tambah_rute",
            objek_tipe="rute",
            objek_id=rute_baru.id_rute,
        )
    )
    db.commit()
    db.refresh(rute_baru)
    return _serialize_rute(db, rute_baru)


# 4. Update rute (Partial update)
@router.patch("/{id_rute}", response_model=RuteResponse)
def update_rute(
    id_rute: int,
    payload: RuteUpdate,
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    item = db.query(Rute).filter(Rute.id_rute == id_rute).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rute tidak ditemukan",
        )

    _cek_akses_map(db, item.id_map, pengelola)

    updates = payload.model_dump(exclude_unset=True)
    if "bentuk_jalur_rute" in updates and payload.bentuk_jalur_rute is not None:
        wkt_jalur = _linestring_to_wkt(payload.bentuk_jalur_rute)
        item.bentuk_jalur_rute = wkt_jalur
        # Hitung ulang jarak otomatis jika user tidak mengirim nilai jarak baru
        if "jarak" not in updates or updates["jarak"] is None:
            item.jarak = _hitung_jarak_meter(db, wkt_jalur)
        del updates["bentuk_jalur_rute"]

    for key, value in updates.items():
        setattr(item, key, value)

    db.add(
        LogAktivitas(
            id_pengelola=pengelola.id_pengelola,
            aksi="ubah_rute",
            objek_tipe="rute",
            objek_id=item.id_rute,
        )
    )
    db.commit()
    db.refresh(item)
    return _serialize_rute(db, item)


# 5. Hapus rute
@router.delete("/{id_rute}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rute(
    id_rute: int,
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    item = db.query(Rute).filter(Rute.id_rute == id_rute).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rute tidak ditemukan",
        )

    _cek_akses_map(db, item.id_map, pengelola)

    db.delete(item)
    db.add(
        LogAktivitas(
            id_pengelola=pengelola.id_pengelola,
            aksi="hapus_rute",
            objek_tipe="rute",
            objek_id=id_rute,
        )
    )
    db.commit()