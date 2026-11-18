from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


# --- GAMBAR EVENT & PEMINDAHAN KE MAP ---
class GambarEventCreate(BaseModel):
    url_gambar: str
    public_id: Optional[str] = None
    jenis_gambar: str = Field(
        default="lainnya", pattern="^(foto_venue|jadwal|lainnya)$"
    )
    keterangan: Optional[str] = None


class GambarEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_gambar: int
    id_event: int
    url_gambar: str
    public_id: Optional[str] = None
    jenis_gambar: str
    keterangan: Optional[str] = None
    waktu_diunggah: Optional[datetime] = None


class JadikanDenahRequest(BaseModel):
    nama_map: str = Field(..., min_length=1, max_length=100)
    tipe_map: str = Field(default="outdoor", pattern="^(outdoor|indoor)$")
    level_lantai: Optional[int] = None
    is_utama: Optional[bool] = None


# --- PROFIL PENGGUNA LOGIN (ADMIN & EO) ---
class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_pengelola: int
    peran: str
    nama: str
    username: str
    nama_organisasi: Optional[str] = None
    aktif: bool


class ProfileUpdate(BaseModel):
    nama: Optional[str] = Field(default=None, min_length=2, max_length=100)
    username: Optional[str] = Field(default=None, min_length=3, max_length=50)
    nama_organisasi: Optional[str] = Field(default=None, max_length=150)
    password: Optional[str] = Field(default=None, min_length=6)


# --- MANAJEMEN AKUN PENGELOLA (OLEH ADMIN) ---
class PengelolaCreate(BaseModel):
    peran: str = Field(
        default="event_organizer", pattern="^(admin|event_organizer)$"
    )
    nama: str = Field(..., min_length=2, max_length=100)
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    nama_organisasi: Optional[str] = Field(default=None, max_length=150)
    email: Optional[EmailStr] = None
    deskripsi: Optional[str] = None
    nomor_telepon: Optional[str] = Field(default=None, max_length=30)


class PengelolaUpdate(BaseModel):
    nama: Optional[str] = Field(default=None, min_length=2, max_length=100)
    username: Optional[str] = Field(default=None, min_length=3, max_length=50)
    nama_organisasi: Optional[str] = Field(default=None, max_length=150)
    password: Optional[str] = Field(default=None, min_length=6)
    peran: Optional[str] = Field(
        default=None, pattern="^(admin|event_organizer)$"
    )
    aktif: Optional[bool] = None


class PengelolaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_pengelola: int
    peran: str
    nama: str
    username: str
    nama_organisasi: Optional[str] = None
    aktif: bool
    dibuat_pada: Optional[datetime] = None
    diubah_pada: Optional[datetime] = None


# --- LOG AKTIVITAS ---
class LogAktivitasResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_log: int
    id_pengelola: Optional[int] = None
    aksi: str
    objek_tipe: Optional[str] = None
    objek_id: Optional[int] = None
    deskripsi: Optional[str] = None
    waktu: Optional[datetime] = None