from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_pengelola
from app.database import get_db
from app.models import Event, GambarEvent, LogAktivitas, Map, Pengelola
from app.schemas_admin import (
    GambarEventCreate,
    GambarEventResponse,
    JadikanDenahRequest,
)

router = APIRouter(tags=["Gambar Event"])


# 1. Ambil semua gambar galeri milik 1 event (Publik - untuk Mobile & Web)
@router.get("/api/events/{id_event}/gambar", response_model=List[GambarEventResponse])
def get_gambar_event(id_event: int, db: Session = Depends(get_db)):
    return (
        db.query(GambarEvent)
        .filter(GambarEvent.id_event == id_event)
        .order_by(GambarEvent.id_gambar.asc())
        .all()
    )


# 2. Tambah gambar baru ke galeri event
@router.post(
    "/api/events/{id_event}/gambar",
    response_model=GambarEventResponse,
    status_code=status.HTTP_201_CREATED,
)
def tambah_gambar_event(
    id_event: int,
    payload: GambarEventCreate,
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    event = db.query(Event).filter(Event.id_event == id_event).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event tidak ditemukan")

    if pengelola.peran != "admin" and event.id_organizer != pengelola.id_pengelola:
        raise HTTPException(status_code=403, detail="Tidak memiliki akses ke event ini")

    gambar = GambarEvent(
        id_event=id_event,
        url_gambar=payload.url_gambar,
        public_id=payload.public_id,
        jenis_gambar=payload.jenis_gambar,
        keterangan=payload.keterangan,
    )
    db.add(gambar)
    db.flush()

    db.add(
        LogAktivitas(
            id_pengelola=pengelola.id_pengelola,
            aksi="tambah_gambar_event",
            objek_tipe="gambar_event",
            objek_id=gambar.id_gambar,
            deskripsi=f"Menambahkan gambar ({payload.jenis_gambar}) pada event #{id_event}",
        )
    )
    db.commit()
    db.refresh(gambar)
    return gambar


# 3. Jadikan Denah: PINDAHKAN data dari gambar_event -> map (satu file satu pemilik)
@router.post("/api/gambar/{id_gambar}/jadikan-denah", status_code=status.HTTP_201_CREATED)
def pindahkan_gambar_ke_map(
    id_gambar: int,
    payload: JadikanDenahRequest,
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    gambar = db.query(GambarEvent).filter(GambarEvent.id_gambar == id_gambar).first()
    if not gambar:
        raise HTTPException(status_code=404, detail="Gambar tidak ditemukan")

    event = db.query(Event).filter(Event.id_event == gambar.id_event).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event tidak ditemukan")

    if pengelola.peran != "admin" and event.id_organizer != pengelola.id_pengelola:
        raise HTTPException(status_code=403, detail="Tidak memiliki akses ke event ini")

    # Pastikan hanya ada 1 map utama per event (sesuai indeks unik uq_map_utama)
    map_utama_lama = (
        db.query(Map)
        .filter(Map.id_event == event.id_event, Map.is_utama.is_(True))
        .first()
    )
    jadikan_utama = (
        payload.is_utama if payload.is_utama is not None else (map_utama_lama is None)
    )
    if jadikan_utama and map_utama_lama:
        map_utama_lama.is_utama = False
        db.flush()

    # Langkah 1: Buat map baru menggunakan gambar denah tersebut
    map_baru = Map(
        id_event=event.id_event,
        nama_map=payload.nama_map,
        tipe_map=payload.tipe_map,
        level_lantai=payload.level_lantai,
        is_utama=jadikan_utama,
        status_map="draft",
        garis_lintang_pusat=event.garis_lintang,
        garis_bujur_pusat=event.garis_bujur,
        gambar_layout=gambar.url_gambar,
        gambar_public_id=gambar.public_id,
        tampilkan_denah=True,
    )
    db.add(map_baru)
    db.flush()

    # Langkah 2: Hapus dari gambar_event (dipindah, bukan disalin)
    db.delete(gambar)

    db.add(
        LogAktivitas(
            id_pengelola=pengelola.id_pengelola,
            aksi="pindah_gambar_ke_map",
            objek_tipe="map",
            objek_id=map_baru.id_map,
            deskripsi=f"Memindahkan gambar #{id_gambar} menjadi denah map '{map_baru.nama_map}'",
        )
    )

    # Komit seluruh perubahan dalam 1 transaksi atomik
    db.commit()
    db.refresh(map_baru)

    return {
        "message": "Gambar berhasil dipindahkan menjadi denah map baru",
        "id_map": map_baru.id_map,
        "nama_map": map_baru.nama_map,
        "gambar_layout": map_baru.gambar_layout,
        "is_utama": map_baru.is_utama,
    }


# 4. Jadikan Poster Utama: PINDAHKAN dari gambar_event -> event.poster_url
@router.patch("/api/gambar/{id_gambar}/jadikan-poster")
def pindahkan_gambar_ke_poster(
    id_gambar: int,
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    gambar = db.query(GambarEvent).filter(GambarEvent.id_gambar == id_gambar).first()
    if not gambar:
        raise HTTPException(status_code=404, detail="Gambar tidak ditemukan")

    event = db.query(Event).filter(Event.id_event == gambar.id_event).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event tidak ditemukan")

    if pengelola.peran != "admin" and event.id_organizer != pengelola.id_pengelola:
        raise HTTPException(status_code=403, detail="Tidak memiliki akses ke event ini")

    event.poster_url = gambar.url_gambar
    event.poster_public_id = gambar.public_id

    # Hapus dari gambar_event agar satu file hanya punya satu pemilik
    db.delete(gambar)

    db.add(
        LogAktivitas(
            id_pengelola=pengelola.id_pengelola,
            aksi="ubah_poster_event",
            objek_tipe="event",
            objek_id=event.id_event,
            deskripsi=f"Memindahkan gambar #{id_gambar} sebagai poster utama event '{event.nama_event}'",
        )
    )
    db.commit()
    return {
        "message": "Gambar berhasil dipindahkan menjadi poster utama event",
        "poster_url": event.poster_url,
    }


# 5. Hapus gambar event
@router.delete("/api/gambar/{id_gambar}", status_code=status.HTTP_204_NO_CONTENT)
def hapus_gambar_event(
    id_gambar: int,
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    gambar = db.query(GambarEvent).filter(GambarEvent.id_gambar == id_gambar).first()
    if not gambar:
        raise HTTPException(status_code=404, detail="Gambar tidak ditemukan")

    event = db.query(Event).filter(Event.id_event == gambar.id_event).first()
    if event and pengelola.peran != "admin" and event.id_organizer != pengelola.id_pengelola:
        raise HTTPException(status_code=403, detail="Tidak memiliki akses ke event ini")

    db.add(
        LogAktivitas(
            id_pengelola=pengelola.id_pengelola,
            aksi="hapus_gambar_event",
            objek_tipe="gambar_event",
            objek_id=id_gambar,
            deskripsi=f"Menghapus gambar #{id_gambar} dari event #{gambar.id_event}",
        )
    )
    db.delete(gambar)
    db.commit()