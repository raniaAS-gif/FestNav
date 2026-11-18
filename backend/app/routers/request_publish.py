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


def _target_signature(req: RequestPublish) -> tuple:
    has_event = any(it.jenis_item == "event" for it in req.items)
    map_ids = tuple(sorted(it.id_map for it in req.items if it.jenis_item == "map" and it.id_map))
    return (req.id_event, has_event, map_ids)


def _evaluasi_ubah_keputusan(db: Session, req: RequestPublish) -> tuple[bool, bool, str]:
    """
    Mengembalikan (event_diubah_setelah_ditolak, bisa_ubah_keputusan, alasan_blokir).
    """
    if req.status_request == "menunggu":
        return False, True, ""

    if req.status_request != "ditolak":
        return (
            False,
            False,
            f"Request sudah berstatus '{req.status_request}' dan tidak bisa diubah lagi.",
        )

    has_event_item = any(it.jenis_item == "event" for it in req.items)
    map_item_ids = {it.id_map for it in req.items if it.jenis_item == "map" and it.id_map}

    # Cek apakah sudah ada request yang lebih baru untuk target yang sama
    kandidat_baru = (
        db.query(RequestPublish)
        .filter(
            RequestPublish.id_event == req.id_event,
            RequestPublish.id_request > req.id_request,
        )
        .all()
    )
    for rb in kandidat_baru:
        rb_event = any(it.jenis_item == "event" for it in rb.items)
        rb_maps = {it.id_map for it in rb.items if it.jenis_item == "map" and it.id_map}
        if (has_event_item and rb_event) or (map_item_ids & rb_maps):
            return (
                True,
                False,
                "Sudah terdapat pengajuan validasi baru untuk item ini. Gunakan pengajuan terbaru.",
            )

    patokan = _to_utc(req.waktu_diputuskan) or _to_utc(req.waktu_dikirim)
    ev = db.query(Event).filter(Event.id_event == req.id_event).first()

    if ev and patokan:
        if has_event_item:
            waktu_ubah_ev = _to_utc(getattr(ev, "diubah_pada", None))
            if waktu_ubah_ev and waktu_ubah_ev > patokan:
                return (
                    True,
                    False,
                    "Event telah diubah oleh Event Organizer setelah penolakan. "
                    "Admin tidak dapat mengubah keputusan dan harus menunggu EO mengirim request validasi ulang.",
                )

        if map_item_ids:
            daftar_map = (
                db.query(Map)
                .filter(Map.id_event == req.id_event, Map.id_map.in_(map_item_ids))
                .all()
            )
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
    latest_per_event: bool = Query(
        default=False,
        description="Jika True, hanya mengembalikan 1 request terbaru per target (event / denah).",
    ),
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    query = db.query(RequestPublish)
    if pengelola.peran != "admin":
        query = query.filter(RequestPublish.id_pengirim == pengelola.id_pengelola)

    if status_request:
        query = query.filter(RequestPublish.status_request == status_request)

    rows = query.order_by(
        RequestPublish.waktu_dikirim.desc(), RequestPublish.id_request.desc()
    ).all()

    if latest_per_event:
        seen_targets = set()
        unique_rows = []
        for r in rows:
            sig = _target_signature(r)
            if sig not in seen_targets:
                seen_targets.add(sig)
                unique_rows.append(r)
        rows = unique_rows

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


# 3. Organizer mengajukan request publish event ATAU denah (map) secara terpisah
@router.post("", response_model=RequestPublishResponse, status_code=status.HTTP_201_CREATED)
def create_request_publish(
    payload: RequestPublishCreate,
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    ev = (
        db.query(Event)
        .filter(Event.id_event == payload.id_event)
        .with_for_update()
        .first()
    )
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

    requested_map_ids = list(dict.fromkeys(payload.map_ids or []))
    include_event = (
        payload.include_event
        if payload.include_event is not None
        else len(requested_map_ids) == 0
    )

    if not include_event and not requested_map_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pilih event atau minimal satu denah (map) yang akan diajukan publish.",
        )

    # Aturan wajib: Event harus dipublish terlebih dahulu sebelum denah/map dapat diajukan publish
    if requested_map_ids and not include_event and ev.status_event != "published":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Event wajib dipublish terlebih dahulu sebelum denah (map) dapat diajukan untuk publish.",
        )

    if include_event and not requested_map_ids and ev.status_event == "published":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Event ini sudah berstatus published.",
        )

    daftar_map = []
    if requested_map_ids:
        daftar_map = (
            db.query(Map)
            .filter(Map.id_event == payload.id_event, Map.id_map.in_(requested_map_ids))
            .all()
        )
        if len(daftar_map) != len(requested_map_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sebagian id_map tidak valid atau bukan milik event tersebut.",
            )

    # Cek pengajuan yang masih berstatus 'menunggu' untuk target yang sama
    pending_list = (
        db.query(RequestPublish)
        .filter(
            RequestPublish.id_event == payload.id_event,
            RequestPublish.status_request == "menunggu",
        )
        .all()
    )
    for pend in pending_list:
        pend_has_event = any(it.jenis_item == "event" for it in pend.items)
        pend_map_ids = {it.id_map for it in pend.items if it.jenis_item == "map" and it.id_map}
        if include_event and pend_has_event:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Masih ada pengajuan publish event yang berstatus 'menunggu' untuk event ini.",
            )
        if set(requested_map_ids) & pend_map_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Denah yang dipilih masih memiliki pengajuan publish berstatus 'menunggu'.",
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

        if include_event and ev.status_event != "published":
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

        target_label = (
            f"event '{ev.nama_event}'"
            if include_event and not daftar_map
            else f"denah pada event '{ev.nama_event}'"
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
                deskripsi=f"Mengajukan publish {target_label}",
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

    req = (
        db.query(RequestPublish)
        .filter(RequestPublish.id_request == id_request)
        .with_for_update()
        .first()
    )
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
        ev = db.query(Event).filter(Event.id_event == req.id_event).first()
        has_event_item = any(it.jenis_item == "event" for it in req.items)
        map_item_ids = [it.id_map for it in req.items if it.jenis_item == "map" and it.id_map]

        if payload.status_request == "disetujui":
            # Pastikan event sudah published jika yang divalidasi adalah denah (map)
            if map_item_ids and not has_event_item:
                if not ev or ev.status_event != "published":
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Event wajib dipublish terlebih dahulu sebelum denah (map) dapat dipublish.",
                    )

            if has_event_item and ev and ev.status_event != "published":
                ev.status_event = "published"
                ev.dipublish_pada = sekarang

            for map_id in map_item_ids:
                peta = db.query(Map).filter(Map.id_map == map_id).first()
                if peta:
                    peta.status_map = "published"
                    peta.dipublish_pada = sekarang
        else:
            if has_event_item and ev and ev.status_event not in ("published", "draft"):
                ev.status_event = "draft"

        req.status_request = payload.status_request
        req.catatan_admin = payload.catatan_admin
        req.id_pemutus = pengelola.id_pengelola
        req.waktu_diputuskan = sekarang

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
    except HTTPException:
        db.rollback()
        raise
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
    if ev and ev.status_event not in ("published", "draft"):
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