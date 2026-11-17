from datetime import date, datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field, model_validator


# =========================
# JENIS FASILITAS
# =========================
class JenisFasilitasCreate(BaseModel):
    kode: str = Field(..., min_length=2, max_length=30, pattern=r"^[a-z0-9_]+$")
    nama_jenis: str = Field(..., min_length=2, max_length=60)
    deskripsi_default: Optional[str] = None
    warna: str = Field("#3B82F6", max_length=9)
    urutan: int = 0
    aktif: bool = True


class JenisFasilitasUpdate(BaseModel):
    nama_jenis: Optional[str] = Field(None, min_length=2, max_length=60)
    deskripsi_default: Optional[str] = None
    warna: Optional[str] = Field(None, max_length=9)
    urutan: Optional[int] = None
    aktif: Optional[bool] = None


class JenisFasilitasResponse(BaseModel):
    kode: str
    nama_jenis: str
    deskripsi_default: Optional[str] = None
    warna: str
    urutan: int
    aktif: bool

    class Config:
        from_attributes = True


# =========================
# EVENT
# =========================
class EventCreate(BaseModel):
    nama_event: str = Field(..., min_length=3, max_length=150)
    deskripsi: Optional[str] = None
    tanggal_mulai: Optional[date] = None
    tanggal_selesai: Optional[date] = None
    lokasi: Optional[str] = Field(None, max_length=250)
    garis_lintang: Optional[float] = Field(None, ge=-90, le=90)
    garis_bujur: Optional[float] = Field(None, ge=-180, le=180)
    jenis_event: Optional[str] = Field(None, max_length=50)
    tipe_lokasi: Literal["outdoor", "indoor", "campuran"] = "outdoor"
    mode_event: Literal["interaktif", "direktori"] = "interaktif"
    poster_url: Optional[str] = None
    poster_public_id: Optional[str] = None
    id_organizer: Optional[int] = Field(
        None, description="Opsional, khusus Admin jika ingin menetapkan EO pemilik event"
    )
    status_event: Literal["draft", "published", "selesai"] = "draft"

    @model_validator(mode="after")
    def cek_rentang_tanggal(self):
        if self.tanggal_mulai and self.tanggal_selesai and self.tanggal_selesai < self.tanggal_mulai:
            raise ValueError("tanggal_selesai tidak boleh lebih awal dari tanggal_mulai")
        return self


class EventUpdate(BaseModel):
    nama_event: Optional[str] = Field(None, min_length=3, max_length=150)
    deskripsi: Optional[str] = None
    tanggal_mulai: Optional[date] = None
    tanggal_selesai: Optional[date] = None
    lokasi: Optional[str] = Field(None, max_length=250)
    garis_lintang: Optional[float] = Field(None, ge=-90, le=90)
    garis_bujur: Optional[float] = Field(None, ge=-180, le=180)
    jenis_event: Optional[str] = Field(None, max_length=50)
    tipe_lokasi: Optional[Literal["outdoor", "indoor", "campuran"]] = None
    mode_event: Optional[Literal["interaktif", "direktori"]] = None
    poster_url: Optional[str] = None
    poster_public_id: Optional[str] = None
    id_organizer: Optional[int] = None
    status_event: Optional[Literal["draft", "published", "selesai"]] = None


class EventResponse(BaseModel):
    id_event: int
    id_organizer: Optional[int] = None
    nama_organizer: Optional[str] = None
    nama_event: str
    deskripsi: Optional[str] = None
    tanggal_mulai: Optional[date] = None
    tanggal_selesai: Optional[date] = None
    lokasi: Optional[str] = None
    garis_lintang: Optional[float] = None
    garis_bujur: Optional[float] = None
    jenis_event: Optional[str] = None
    tipe_lokasi: str
    mode_event: str
    sumber: str
    status_event: str
    poster_url: Optional[str] = None
    poster_public_id: Optional[str] = None
    is_locked: bool = False
    dibuat_pada: datetime
    diubah_pada: datetime
    dipublish_pada: Optional[datetime] = None

    class Config:
        from_attributes = True