from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import get_current_event_goers
from app.database import get_db
from app.models import Event, EventGoers, Favorit
from app.routers.events import _serialize_event
from app.schemas_favorit import (
    FavoritIdsResponse,
    FavoritItemResponse,
    FavoritStatusResponse,
)

router = APIRouter(prefix="/api/favorit", tags=["Favorit"])

# Hanya event yang sudah terbit yang boleh difavoritkan / tampil di halaman favorit
STATUS_EVENT_PUBLIK = ("published", "selesai")


def _get_event_publik(db: Session, id_event: int) -> Event:
    ev = (
        db.query(Event)
        .filter(Event.id_event == id_event, Event.status_event.in_(STATUS_EVENT_PUBLIK))
        .first()
    )
    if not ev:
        raise HTTPException(status_code=404, detail="Event tidak ditemukan")
    return ev


def _get_favorit(db: Session, id_event_goers: int, id_event: int) -> Favorit | None:
    return (
        db.query(Favorit)
        .filter(Favorit.id_event_goers == id_event_goers, Favorit.id_event == id_event)
        .first()
    )


# 1. Halaman favorit: daftar event yang ditandai favorit (terbaru di atas)
@router.get("", response_model=list[FavoritItemResponse])
def list_favorit(
    db: Session = Depends(get_db),
    user: EventGoers = Depends(get_current_event_goers),
):
    rows = (
        db.query(Favorit, Event)
        .join(Event, Event.id_event == Favorit.id_event)
        .filter(
            Favorit.id_event_goers == user.id_event_goers,
            Event.status_event.in_(STATUS_EVENT_PUBLIK),
        )
        .order_by(Favorit.dibuat_pada.desc())
        .all()
    )
    return [
        FavoritItemResponse(difavoritkan_pada=fav.dibuat_pada, event=_serialize_event(db, ev))
        for fav, ev in rows
    ]


# 2. Daftar id event favorit (ringan) - untuk menandai ikon hati di daftar/detail event
@router.get("/ids", response_model=FavoritIdsResponse)
def list_id_favorit(
    db: Session = Depends(get_db),
    user: EventGoers = Depends(get_current_event_goers),
):
    ids = [
        row[0]
        for row in db.query(Favorit.id_event)
        .join(Event, Event.id_event == Favorit.id_event)
        .filter(
            Favorit.id_event_goers == user.id_event_goers,
            Event.status_event.in_(STATUS_EVENT_PUBLIK),
        )
        .order_by(Favorit.dibuat_pada.desc())
        .all()
    ]
    return FavoritIdsResponse(id_event=ids, total=len(ids))


# 3. Cek apakah 1 event sudah difavoritkan
@router.get("/{id_event}/status", response_model=FavoritStatusResponse)
def cek_status_favorit(
    id_event: int,
    db: Session = Depends(get_db),
    user: EventGoers = Depends(get_current_event_goers),
):
    fav = _get_favorit(db, user.id_event_goers, id_event)
    return FavoritStatusResponse(
        id_event=id_event,
        is_favorit=fav is not None,
        difavoritkan_pada=fav.dibuat_pada if fav else None,
    )


# 4. Tandai event sebagai favorit (idempotent: aman dipanggil berulang)
@router.post("/{id_event}", response_model=FavoritStatusResponse)
def tambah_favorit(
    id_event: int,
    response: Response,
    db: Session = Depends(get_db),
    user: EventGoers = Depends(get_current_event_goers),
):
    _get_event_publik(db, id_event)

    fav = _get_favorit(db, user.id_event_goers, id_event)
    if fav:
        response.status_code = status.HTTP_200_OK
    else:
        fav = Favorit(id_event_goers=user.id_event_goers, id_event=id_event)
        db.add(fav)
        try:
            db.commit()
            response.status_code = status.HTTP_201_CREATED
        except IntegrityError:
            # Request ganda yang masuk bersamaan: anggap sudah favorit
            db.rollback()
            fav = _get_favorit(db, user.id_event_goers, id_event)
            response.status_code = status.HTTP_200_OK
        else:
            db.refresh(fav)

    return FavoritStatusResponse(
        id_event=id_event,
        is_favorit=True,
        difavoritkan_pada=fav.dibuat_pada if fav else None,
    )


# 5. Hapus event dari favorit (idempotent: tetap 204 walau memang belum difavoritkan)
@router.delete("/{id_event}", status_code=status.HTTP_204_NO_CONTENT)
def hapus_favorit(
    id_event: int,
    db: Session = Depends(get_db),
    user: EventGoers = Depends(get_current_event_goers),
):
    fav = _get_favorit(db, user.id_event_goers, id_event)
    if fav:
        db.delete(fav)
        db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
