from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import or_, text
from sqlalchemy.orm import Session

from app.auth import decode_token, get_current_pengelola
from app.database import get_db
from app.models import Event, LogAktivitas, Pengelola
from app.schemas_event import EventCreate, EventResponse, EventUpdate

router = APIRouter(prefix="/api/events", tags=["Events"])
optional_bearer = HTTPBearer(auto_error=False)


def get_optional_pengelola(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_bearer),
    db: Session = Depends(get_db),
) -> Optional[Pengelola]:
    if not credentials:
        return None
    payload = decode_token(credentials.credentials)
    if payload.get("user_type") == "pengelola" and payload.get("sub"):
        user = db.query(Pengelola).filter(Pengelola.id_pengelola == int(payload["sub"])).first()
        if user and user.aktif:
            return user
    return None


def _is_event_locked(db: Session, id_event: int) -> bool:
    row = db.execute(
        text(
            """
            SELECT 1 FROM v_item_terkunci
            WHERE id_event = :id_event AND jenis_item = 'event'
            LIMIT 1
            """
        ),
        {"id_event": id_event},
    ).first()
    return row is not None


def _validasi_siap_publish(
    status_event: str,
    tanggal_mulai,
    garis_lintang,
    garis_bujur,
    jenis_event,
):
    if status_event != "draft":
        kurang = []
        if tanggal_mulai is None:
            kurang.append("tanggal_mulai")
        if garis_lintang is None or garis_bujur is None:
            kurang.append("koordinat (garis_lintang & garis_bujur)")
        if not jenis_event:
            kurang.append("jenis_event")
        if kurang:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Event tidak bisa diterbitkan sebelum melengkapi: {', '.join(kurang)}",
            )


def _validasi_organizer(db: Session, id_organizer: Optional[int]):
    if id_organizer is None:
        return
    eo = db.query(Pengelola).filter(Pengelola.id_pengelola == id_organizer).first()
    if not eo or eo.peran not in ["event_organizer", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="id_organizer harus merujuk ke akun pengelola dengan peran 'event_organizer' atau 'admin'",
        )


def _serialize_event(db: Session, ev: Event) -> EventResponse:
    return EventResponse(
        id_event=ev.id_event,
        id_organizer=ev.id_organizer,
        nama_organizer=ev.organizer.nama_organisasi or ev.organizer.nama if ev.organizer else None,
        nama_event=ev.nama_event,
        deskripsi=ev.deskripsi,
        tanggal_mulai=ev.tanggal_mulai,
        tanggal_selesai=ev.tanggal_selesai,
        lokasi=ev.lokasi,
        garis_lintang=ev.garis_lintang,
        garis_bujur=ev.garis_bujur,
        jenis_event=ev.jenis_event,
        tipe_lokasi=ev.tipe_lokasi,
        mode_event=ev.mode_event,
        sumber=ev.sumber,
        status_event=ev.status_event,
        poster_url=ev.poster_url,
        poster_public_id=ev.poster_public_id,
        is_locked=_is_event_locked(db, ev.id_event),
        dibuat_pada=ev.dibuat_pada,
        diubah_pada=ev.diubah_pada,
        dipublish_pada=ev.dipublish_pada,
    )


@router.get("", response_model=list[EventResponse])
def list_events(
    search: Optional[str] = Query(None, description="Cari nama event atau lokasi"),
    jenis_event: Optional[str] = None,
    tipe_lokasi: Optional[str] = None,
    status_event: Optional[str] = None,
    mine_only: bool = Query(False, description="Khusus EO: tampilkan event milik sendiri saja"),
    db: Session = Depends(get_db),
    pengelola: Optional[Pengelola] = Depends(get_optional_pengelola),
):
    query = db.query(Event)

    if pengelola is None:
        # Pengunjung umum / mobile hanya melihat event terbit
        query = query.filter(Event.status_event.in_(["published", "selesai"]))
    elif pengelola.peran == "event_organizer":
        if mine_only:
            query = query.filter(Event.id_organizer == pengelola.id_pengelola)
        else:
            query = query.filter(
                or_(
                    Event.status_event.in_(["published", "selesai"]),
                    Event.id_organizer == pengelola.id_pengelola,
                )
            )
        if status_event:
            query = query.filter(Event.status_event == status_event)
    else:
        # Admin dapat memfilter semua status
        if status_event:
            query = query.filter(Event.status_event == status_event)

    if search:
        pola = f"%{search}%"
        query = query.filter(or_(Event.nama_event.ilike(pola), Event.lokasi.ilike(pola)))
    if jenis_event:
        query = query.filter(Event.jenis_event.ilike(jenis_event))
    if tipe_lokasi:
        query = query.filter(Event.tipe_lokasi == tipe_lokasi)

    events = query.order_by(Event.dibuat_pada.desc()).all()
    return [_serialize_event(db, ev) for ev in events]


@router.get("/{id_event}", response_model=EventResponse)
def get_event_detail(
    id_event: int,
    db: Session = Depends(get_db),
    pengelola: Optional[Pengelola] = Depends(get_optional_pengelola),
):
    ev = db.query(Event).filter(Event.id_event == id_event).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Event tidak ditemukan")

    if ev.status_event == "draft":
        if not pengelola:
            raise HTTPException(status_code=404, detail="Event tidak ditemukan")
        if pengelola.peran == "event_organizer" and ev.id_organizer != pengelola.id_pengelola:
            raise HTTPException(status_code=403, detail="Anda tidak memiliki akses ke draft event ini")

    return _serialize_event(db, ev)


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: EventCreate,
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    data = payload.model_dump()

    if pengelola.peran == "event_organizer":
        data["id_organizer"] = pengelola.id_pengelola
        data["status_event"] = "draft"  # EO wajib lewat request_publish untuk menerbitkan
    else:
        _validasi_organizer(db, data.get("id_organizer"))

    _validasi_siap_publish(
        data["status_event"],
        data.get("tanggal_mulai"),
        data.get("garis_lintang"),
        data.get("garis_bujur"),
        data.get("jenis_event"),
    )

    if data["status_event"] == "published":
        data["dipublish_pada"] = datetime.now(timezone.utc)

    ev = Event(**data, sumber="manual")
    db.add(ev)
    db.flush()

    db.add(
        LogAktivitas(
            id_pengelola=pengelola.id_pengelola,
            aksi="buat_event",
            objek_tipe="event",
            objek_id=ev.id_event,
            deskripsi=f"Membuat event '{ev.nama_event}'",
        )
    )
    db.commit()
    db.refresh(ev)
    return _serialize_event(db, ev)


@router.patch("/{id_event}", response_model=EventResponse)
def update_event(
    id_event: int,
    payload: EventUpdate,
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    ev = db.query(Event).filter(Event.id_event == id_event).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Event tidak ditemukan")

    if pengelola.peran == "event_organizer" and ev.id_organizer != pengelola.id_pengelola:
        raise HTTPException(status_code=403, detail="Anda hanya dapat mengubah event milik sendiri")

    if _is_event_locked(db, ev.id_event):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Event sedang terkunci karena ada pengajuan publish yang menunggu keputusan Admin",
        )

    updates = payload.model_dump(exclude_unset=True)

    if pengelola.peran == "event_organizer":
        updates.pop("id_organizer", None)
        if "status_event" in updates and updates["status_event"] != "draft":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Event Organizer tidak dapat menerbitkan event langsung; gunakan pengajuan publish",
            )
    else:
        if "id_organizer" in updates:
            _validasi_organizer(db, updates["id_organizer"])

    tgl_mulai = updates.get("tanggal_mulai", ev.tanggal_mulai)
    tgl_selesai = updates.get("tanggal_selesai", ev.tanggal_selesai)
    if tgl_mulai and tgl_selesai and tgl_selesai < tgl_mulai:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="tanggal_selesai tidak boleh lebih awal dari tanggal_mulai",
        )

    target_status = updates.get("status_event", ev.status_event)
    _validasi_siap_publish(
        target_status,
        tgl_mulai,
        updates.get("garis_lintang", ev.garis_lintang),
        updates.get("garis_bujur", ev.garis_bujur),
        updates.get("jenis_event", ev.jenis_event),
    )

    if target_status == "published" and ev.status_event != "published":
        ev.dipublish_pada = datetime.now(timezone.utc)

    for field, value in updates.items():
        setattr(ev, field, value)

    db.add(
        LogAktivitas(
            id_pengelola=pengelola.id_pengelola,
            aksi="ubah_event",
            objek_tipe="event",
            objek_id=ev.id_event,
            deskripsi=f"Memperbarui event '{ev.nama_event}'",
        )
    )
    db.commit()
    db.refresh(ev)
    return _serialize_event(db, ev)


@router.delete("/{id_event}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    id_event: int,
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    ev = db.query(Event).filter(Event.id_event == id_event).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Event tidak ditemukan")

    if pengelola.peran == "event_organizer":
        if ev.id_organizer != pengelola.id_pengelola:
            raise HTTPException(status_code=403, detail="Anda hanya dapat menghapus event milik sendiri")
        if ev.status_event != "draft":
            raise HTTPException(
                status_code=403,
                detail="Event yang sudah dipublish hanya dapat dihapus oleh Admin",
            )

    if _is_event_locked(db, ev.id_event):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Event sedang dalam pengajuan publish dan tidak dapat dihapus",
        )

    nama_event = ev.nama_event
    db.delete(ev)
    db.add(
        LogAktivitas(
            id_pengelola=pengelola.id_pengelola,
            aksi="hapus_event",
            objek_tipe="event",
            objek_id=id_event,
            deskripsi=f"Menghapus event '{nama_event}'",
        )
    )
    db.commit()