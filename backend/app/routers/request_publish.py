from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import SQLAlchemyError
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


def _to_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _evaluasi_ubah_keputusan(db: Session, req: RequestPublish) -> tuple[bool, bool, str]:
    """
    Mengembalikan (event_diubah_setelah_ditolak, bisa_ubah_keputusan, alasan_blokir).
    - Jika status 'menunggu': admin bebas memutuskan (bisa_ubah_keputusan = True).
    - Jika status 'ditolak': admin hanya boleh mengubah ke 'disetujui' selama EO
      belum mengubah detail event/denah setelah waktu_diputuskan dan belum ada request baru.
    """
    if req.status_request == "menunggu":
        return False, True, ""

    if req.status_request != "ditolak":
        return (
            False,
            False,
            f"Request sudah berstatus '{req.status_request}' dan tidak bisa diubah lagi.",
        )

    # Cek apakah sudah ada request yang lebih baru untuk event yang sama
    request_lebih_baru = (
        db.query(RequestPublish.id_request)
        .filter(
            RequestPublish.id_event == req.id_event,
            RequestPublish.id_request > req.id_request,
        )
        .first()
    )
    if request_lebih_baru:
        return (
            True,
            False,
            "Sudah terdapat pengajuan validasi baru untuk event ini. Gunakan pengajuan terbaru.",
        )

    patokan = _to_utc(req.waktu_diputuskan) or _to_utc(req.waktu_dikirim)
    ev = db.query(Event).filter(Event.id_event == req.id_event).first()

    if ev and patokan:
        waktu_ubah_ev = _to_utc(getattr(ev, "diubah_pada", None))
        if waktu_ubah_ev and waktu_ubah_ev > patokan:
            return (
                True,
                False,
                "Event telah diubah oleh Event Organizer setelah penolakan. "
                "Admin tidak dapat mengubah keputusan dan harus menunggu EO mengirim request validasi ulang.",
            )

        # Cek juga jika denah/map milik event diubah setelah penolakan
        daftar_map = db.query(Map).filter(Map.id_event == req.id_event).all()
        for peta in daftar_map:
            waktu_ubah_map = _to_utc(getattr(peta, "diubah_pada", None))
            if waktu_ubah_map and waktu_ubah_map > patokan:
                return (
                    True,
                    False,
                    "Denah event telah diubah oleh Event Organizer setelah penolakan. "
                    "Admin tidak dapat mengubah keputusan dan harus menunggu EO mengirim request validasi ulang.",
                )

    return False, True, ""


def _serialize_request(db: Session, req: RequestPublish) -> RequestPublishResponse:
    diubah_setelah_ditolak, bisa_ubah, _ = _evaluasi_ubah_keputusan(db, req)
    base = RequestPublishResponse.model_validate(req)
    return base.model_copy(
        update={
            "event_diubah_setelah_ditolak": diubah_setelah_ditolak,
            "bisa_ubah_keputusan": bisa_ubah,
        }
    )


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

    rows = query.order_by(RequestPublish.waktu_dikirim.desc()).all()
    return [_serialize_request(db, r) for r in rows]


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
    return _serialize_request(db, req)


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

    try:
        req_baru = RequestPublish(
            id_event=payload.id_event,
            id_pengirim=pengelola.id_pengelola,
            catatan_pengirim=payload.catatan_pengirim,
            status_request="menunggu",
        )
        db.add(req_baru)
        db.flush()

        if ev.status_event != "published":
            db.add(
                RequestItem(
                    id_request=req_baru.id_request,
                    jenis_item="event",
                    id_map=None,
                )
            )

        for peta in daftar_map:
            db.add(
                RequestItem(
                    id_request=req_baru.id_request,
                    jenis_item="map",
                    id_map=peta.id_map,
                )
            )

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
        return _serialize_request(db, req_baru)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Gagal menyimpan pengajuan publish ke database: {exc}",
        )


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

    if req.status_request == "ditolak" and payload.status_request != "disetujui":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request yang sudah ditolak hanya dapat diubah menjadi 'disetujui'.",
        )

    _, bisa_ubah, alasan_blokir = _evaluasi_ubah_keputusan(db, req)
    if not bisa_ubah:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=alasan_blokir,
        )

    try:
        sekarang = datetime.now(timezone.utc)
        req.status_request = payload.status_request
        req.catatan_admin = payload.catatan_admin
        req.id_pemutus = pengelola.id_pengelola
        req.waktu_diputuskan = sekarang

        ev = db.query(Event).filter(Event.id_event == req.id_event).first()
        if payload.status_request == "disetujui":
            if ev and ev.status_event != "published":
                ev.status_event = "published"
                ev.dipublish_pada = sekarang
            for item in req.items:
                if item.jenis_item == "map" and item.id_map:
                    peta = db.query(Map).filter(Map.id_map == item.id_map).first()
                    if peta:
                        peta.status_map = "published"
                        peta.dipublish_pada = sekarang
        else:
            if ev and ev.status_event != "published":
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
        return _serialize_request(db, req)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Gagal memperbarui keputusan publish: {exc}",
        )


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
    if ev and ev.status_event != "published":
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
    return _serialize_request(db, req)