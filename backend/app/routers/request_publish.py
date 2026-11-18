from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import get_current_pengelola
from app.database import get_db
from app.models import (
    Event,
    LogAktivitas,
    Map,
    Pengelola,
    RequestItem,
    RequestPublish,
    RiwayatRequest,
)
from app.schemas_request import (
    RequestPublishCreate,
    RequestPublishKeputusan,
    RequestPublishResponse,
)

router = APIRouter(prefix="/api/request-publish", tags=["Request Publish"])


# 1. Lihat daftar request publish (Admin lihat semua, Organizer lihat miliknya sendiri)
@router.get("", response_model=List[RequestPublishResponse])
def get_list_request_publish(
    status_request: Optional[str] = Query(
        default=None, description="Filter: menunggu, disetujui, ditolak, dibatalkan"
    ),
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    query = db.query(RequestPublish)
    if pengelola.peran != "admin":
        query = query.filter(RequestPublish.id_pengirim == pengelola.id_pengelola)

    if status_request:
        query = query.filter(RequestPublish.status_request == status_request)

    return query.order_by(RequestPublish.waktu_dikirim.desc()).all()


# 2. Lihat detail 1 request publish beserta item & riwayatnya
@router.get("/{id_request}", response_model=RequestPublishResponse)
def get_detail_request_publish(
    id_request: int,
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    req = db.query(RequestPublish).filter(RequestPublish.id_request == id_request).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request publish tidak ditemukan",
        )

    if pengelola.peran != "admin" and req.id_pengirim != pengelola.id_pengelola:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Anda tidak memiliki akses melihat request ini",
        )
    return req


# 3. Organizer mengajukan request publish event & map
@router.post("", response_model=RequestPublishResponse, status_code=status.HTTP_201_CREATED)
def create_request_publish(
    payload: RequestPublishCreate,
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    ev = db.query(Event).filter(Event.id_event == payload.id_event).first()
    if not ev:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event tidak ditemukan",
        )

    if pengelola.peran != "admin" and ev.id_organizer != pengelola.id_pengelola:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Anda hanya bisa mengajukan publish untuk event milik sendiri",
        )

    pending = (
        db.query(RequestPublish)
        .filter(
            RequestPublish.id_event == payload.id_event,
            RequestPublish.status_request == "menunggu",
        )
        .first()
    )
    if pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Masih ada pengajuan publish yang berstatus 'menunggu' untuk event ini",
        )

    # Tentukan map yang ikut diajukan
    if payload.map_ids is None:
        daftar_map = db.query(Map).filter(Map.id_event == payload.id_event).all()
    else:
        daftar_map = (
            db.query(Map)
            .filter(Map.id_event == payload.id_event, Map.id_map.in_(payload.map_ids))
            .all()
        )
        if len(daftar_map) != len(set(payload.map_ids)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sebagian id_map tidak valid atau bukan milik event tersebut",
            )

    req_baru = RequestPublish(
        id_event=payload.id_event,
        id_pengirim=pengelola.id_pengelola,
        catatan_pengirim=payload.catatan_pengirim,
        status_request="menunggu",
    )
    db.add(req_baru)
    db.flush()

    # Simpan item event & item map
    db.add(RequestItem(id_request=req_baru.id_request, jenis_item="event", id_map=None))
    for peta in daftar_map:
        db.add(
            RequestItem(
                id_request=req_baru.id_request,
                jenis_item="map",
                id_map=peta.id_map,
            )
        )

    ev.status_event = "menunggu_review"

    db.add(
        RiwayatRequest(
            id_request=req_baru.id_request,
            aksi="dikirim",
            catatan=payload.catatan_pengirim,
            id_pelaku=pengelola.id_pengelola,
        )
    )
    db.add(
        LogAktivitas(
            id_pengelola=pengelola.id_pengelola,
            aksi="ajukan_publish",
            objek_tipe="request_publish",
            objek_id=req_baru.id_request,
            deskripsi=f"Mengajukan publish event '{ev.nama_event}'",
        )
    )

    db.commit()
    db.refresh(req_baru)
    return req_baru


# 4. Admin memutuskan request publish (disetujui / ditolak)
@router.patch("/{id_request}/keputusan", response_model=RequestPublishResponse)
def keputusan_request_publish(
    id_request: int,
    payload: RequestPublishKeputusan,
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    if pengelola.peran != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hanya admin yang dapat memutuskan pengajuan publish",
        )

    req = db.query(RequestPublish).filter(RequestPublish.id_request == id_request).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request publish tidak ditemukan",
        )

    if req.status_request not in ("menunggu", "ditolak") or (
            req.status_request == "ditolak" and payload.status_request != "disetujui"
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Request sudah berstatus '{req.status_request}' dan tidak bisa diubah lagi",
            )

    sekarang = datetime.now(timezone.utc)
    req.status_request = payload.status_request
    req.catatan_admin = payload.catatan_admin
    req.id_pemutus = pengelola.id_pengelola
    req.waktu_diputuskan = sekarang

    ev = db.query(Event).filter(Event.id_event == req.id_event).first()
    if payload.status_request == "disetujui":
        if ev:
            ev.status_event = "published"
            ev.dipublish_pada = sekarang
        for item in req.items:
            if item.jenis_item == "map" and item.id_map:
                peta = db.query(Map).filter(Map.id_map == item.id_map).first()
                if peta:
                    peta.status_map = "published"
                    peta.dipublish_pada = sekarang
    else:
        if ev:
            ev.status_event = "draft"

    db.add(
        RiwayatRequest(
            id_request=req.id_request,
            aksi=payload.status_request,
            catatan=payload.catatan_admin,
            id_pelaku=pengelola.id_pengelola,
        )
    )
    db.add(
        LogAktivitas(
            id_pengelola=pengelola.id_pengelola,
            aksi=f"request_{payload.status_request}",
            objek_tipe="request_publish",
            objek_id=req.id_request,
        )
    )

    db.commit()
    db.refresh(req)
    return req


# 5. Pengirim membatalkan request yang masih berstatus 'menunggu'
@router.patch("/{id_request}/batal", response_model=RequestPublishResponse)
def batalkan_request_publish(
    id_request: int,
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    req = db.query(RequestPublish).filter(RequestPublish.id_request == id_request).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request publish tidak ditemukan",
        )

    if pengelola.peran != "admin" and req.id_pengirim != pengelola.id_pengelola:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Anda tidak memiliki akses membatalkan request ini",
        )

    if req.status_request != "menunggu":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hanya request yang masih 'menunggu' yang dapat dibatalkan",
        )

    req.status_request = "dibatalkan"
    ev = db.query(Event).filter(Event.id_event == req.id_event).first()
    if ev and ev.status_event == "menunggu_review":
        ev.status_event = "draft"

    db.add(
        RiwayatRequest(
            id_request=req.id_request,
            aksi="dibatalkan",
            id_pelaku=pengelola.id_pengelola,
        )
    )
    db.commit()
    db.refresh(req)
    return req