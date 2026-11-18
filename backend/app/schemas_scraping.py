from datetime import date, datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class ScrapingCreate(BaseModel):
    nama_sumber: Optional[str] = Field(default=None, max_length=100)
    url_sumber: str


class ScrapingProgressUpdate(BaseModel):
    status_job: Optional[str] = Field(
        default=None, pattern="^(antri|berjalan|selesai|gagal)$"
    )
    tahap_saat_ini: Optional[str] = Field(default=None, max_length=50)
    log_proses: Optional[str] = None
    pesan_error: Optional[str] = None
    hasil_mentah: Optional[Dict[str, Any]] = None


class ScrapingReviewAction(BaseModel):
    status_review: str = Field(..., pattern="^(disimpan|dibuang)$")
    id_event: Optional[int] = None
    id_organizer: Optional[int] = None
    nama_event: Optional[str] = None
    deskripsi: Optional[str] = None
    tanggal_mulai: Optional[date] = None
    tanggal_selesai: Optional[date] = None
    lokasi: Optional[str] = None
    garis_lintang: Optional[float] = None
    garis_bujur: Optional[float] = None
    jenis_event: Optional[str] = None
    poster_url: Optional[str] = None


class ScrapingResponse(BaseModel):
    id_scraping: int
    id_event: Optional[int] = None
    dipicu_oleh: Optional[int] = None
    nama_sumber: Optional[str] = None
    url_sumber: str
    status_job: str
    tahap_saat_ini: Optional[str] = None
    log_proses: Optional[str] = None
    pesan_error: Optional[str] = None
    hasil_mentah: Optional[Dict[str, Any]] = None
    status_review: str
    waktu_scraping: datetime
    waktu_selesai: Optional[datetime] = None
    update_terakhir: datetime

    class Config:
        from_attributes = True