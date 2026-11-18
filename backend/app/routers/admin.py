from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

import app.auth as auth_module
from app.auth import get_current_pengelola
from app.database import get_db
from app.models import LogAktivitas, Pengelola
from app.schemas_admin import (
    LogAktivitasResponse,
    PengelolaCreate,
    PengelolaResponse,
    PengelolaUpdate,
    ProfileResponse,
    ProfileUpdate,
)

router = APIRouter(tags=["Profil, Pengelola & Log Aktivitas"])


def _hash_password(plain: str) -> str:
    for fn_name in ("get_password_hash", "hash_password", "create_password_hash"):
        if hasattr(auth_module, fn_name):
            return getattr(auth_module, fn_name)(plain)
    import bcrypt

    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _wajib_admin(pengelola: Pengelola):
    if pengelola.peran != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hanya admin yang dapat mengakses endpoint ini",
        )


# --- ENDPOINT PROFIL SAYA (ADMIN & EO) ---
@router.get("/api/profile", response_model=ProfileResponse)
def get_my_profile(pengelola: Pengelola = Depends(get_current_pengelola)):
    return pengelola


@router.patch("/api/profile", response_model=ProfileResponse)
def update_my_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    if payload.username and payload.username != pengelola.username:
        cek = db.query(Pengelola).filter(Pengelola.username == payload.username).first()
        if cek:
            raise HTTPException(status_code=400, detail="Username sudah digunakan")
        pengelola.username = payload.username

    if payload.nama is not None:
        pengelola.nama = payload.nama

    if payload.nama_organisasi is not None and pengelola.peran == "event_organizer":
        pengelola.nama_organisasi = payload.nama_organisasi

    if payload.password:
        pengelola.password_hash = _hash_password(payload.password)

    db.commit()
    db.refresh(pengelola)
    return pengelola


# --- ENDPOINT KELOLA AKUN (KHUSUS ADMIN) ---
@router.get("/api/pengelola", response_model=List[PengelolaResponse])
def get_list_pengelola(
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    _wajib_admin(pengelola)
    return db.query(Pengelola).order_by(Pengelola.id_pengelola.asc()).all()


@router.post(
    "/api/pengelola",
    response_model=PengelolaResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_pengelola(
    payload: PengelolaCreate,
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    _wajib_admin(pengelola)

    if db.query(Pengelola).filter(Pengelola.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username sudah digunakan")

    # Fallback email otomatis jika form UI tidak menyediakan input email
    email_final = (
        str(payload.email)
        if payload.email
        else f"{payload.username.lower()}@festnav.local"
    )
    if db.query(Pengelola).filter(Pengelola.email == email_final).first():
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")

    akun_baru = Pengelola(
        peran=payload.peran,
        nama=payload.nama,
        nama_organisasi=payload.nama_organisasi if payload.peran == "event_organizer" else None,
        deskripsi=payload.deskripsi,
        username=payload.username,
        email=email_final,
        password_hash=_hash_password(payload.password),
        nomor_telepon=payload.nomor_telepon,
        aktif=True,
    )
    db.add(akun_baru)
    db.flush()

    db.add(
        LogAktivitas(
            id_pengelola=pengelola.id_pengelola,
            aksi="buat_pengelola",
            objek_tipe="pengelola",
            objek_id=akun_baru.id_pengelola,
            deskripsi=f"Menambahkan akun {payload.peran}: {payload.username}",
        )
    )
    db.commit()
    db.refresh(akun_baru)
    return akun_baru


@router.patch("/api/pengelola/{id_pengelola}", response_model=PengelolaResponse)
def update_pengelola(
    id_pengelola: int,
    payload: PengelolaUpdate,
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    _wajib_admin(pengelola)

    target = db.query(Pengelola).filter(Pengelola.id_pengelola == id_pengelola).first()
    if not target:
        raise HTTPException(status_code=404, detail="Pengelola tidak ditemukan")

    if payload.username and payload.username != target.username:
        cek = db.query(Pengelola).filter(Pengelola.username == payload.username).first()
        if cek:
            raise HTTPException(status_code=400, detail="Username sudah digunakan")

    data_ubah = payload.model_dump(exclude_unset=True)
    if "password" in data_ubah:
        target.password_hash = _hash_password(data_ubah.pop("password"))

    for k, v in data_ubah.items():
        setattr(target, k, v)

    db.add(
        LogAktivitas(
            id_pengelola=pengelola.id_pengelola,
            aksi="ubah_pengelola",
            objek_tipe="pengelola",
            objek_id=target.id_pengelola,
            deskripsi=f"Memperbarui akun '{target.username}'",
        )
    )
    db.commit()
    db.refresh(target)
    return target


@router.get("/api/log-aktivitas", response_model=List[LogAktivitasResponse])
def get_log_aktivitas(
    limit: int = Query(default=50, ge=1, le=200),
    aksi: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    _wajib_admin(pengelola)

    query = db.query(LogAktivitas)
    if aksi:
        query = query.filter(LogAktivitas.aksi == aksi)
    return query.order_by(LogAktivitas.id_log.desc()).limit(limit).all()