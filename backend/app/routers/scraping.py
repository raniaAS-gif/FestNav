import os
import sys
from datetime import date, datetime, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import get_current_pengelola
from app.database import get_db
from app.models import Event, GambarEvent, LogAktivitas, Pengelola, SumberScraping
from app.schemas_scraping import (
    ScrapingCreate,
    ScrapingProgressUpdate,
    ScrapingResponse,
    ScrapingReviewAction,
)

# Tambahkan folder backend/scraper ke sys.path agar modul bot bisa di-import
SCRAPER_DIR = Path(__file__).resolve().parents[2] / "scraper"
if str(SCRAPER_DIR) not in sys.path:
    sys.path.insert(0, str(SCRAPER_DIR))

from errors import JobDibatalkan  # noqa: E402
from pipeline import jalankan_scraping  # noqa: E402

router = APIRouter(prefix="/api/scraping", tags=["Bot Scraping"])


def _parse_date_aman(val) -> Optional[date]:
    if not val:
        return None
    if isinstance(val, date):
        return val
    try:
        return date.fromisoformat(str(val)[:10])
    except ValueError:
        return None


def _jalankan_bot_background(id_scraping: int, url: str, bind_engine):
    """Menjalankan pipeline scraper di background thread FastAPI."""
    db = Session(bind=bind_engine)
    try:
        job = (
            db.query(SumberScraping)
            .filter(SumberScraping.id_scraping == id_scraping)
            .first()
        )
        if not job or job.status_job == "dibatalkan":
            return

        job.status_job = "berjalan"
        db.commit()

        def lapor_progres(tahap: str, log_list: list):
            db.refresh(job)
            if job.status_job == "dibatalkan":
                raise JobDibatalkan("Job dibatalkan oleh pengelola")
            job.tahap_saat_ini = tahap
            job.log_proses = "\n".join(log_list)
            db.commit()

        pakai_cloudinary = bool(os.getenv("CLOUDINARY_URL", "").strip())
        hasil = jalankan_scraping(
            url,
            on_progress=lapor_progres,
            unduh=True,
            cloudinary=pakai_cloudinary,
            simpan_json=False,
            bersihkan=True,
        )

        db.refresh(job)
        status_akhir = hasil.get("status", "gagal")
        if status_akhir == "berhasil":
            job.status_job = "selesai"
        elif status_akhir == "dibatalkan":
            job.status_job = "dibatalkan"
        else:
            job.status_job = "gagal"

        job.pesan_error = hasil.get("pesan_error")
        job.log_proses = "\n".join(hasil.get("tahap_log", []))
        job.hasil_mentah = hasil
        job.waktu_selesai = datetime.now(timezone.utc)
        db.commit()

    except Exception as exc:
        db.rollback()
        job = (
            db.query(SumberScraping)
            .filter(SumberScraping.id_scraping == id_scraping)
            .first()
        )
        if job:
            job.status_job = "gagal"
            job.pesan_error = f"{type(exc).__name__}: {exc}"
            job.waktu_selesai = datetime.now(timezone.utc)
            db.commit()
    finally:
        db.close()


# 1. Daftar seluruh job & hasil scraping
@router.get("", response_model=List[ScrapingResponse])
def get_list_scraping(
    status_job: Optional[str] = Query(default=None),
    status_review: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    query = db.query(SumberScraping)
    if status_job:
        query = query.filter(SumberScraping.status_job == status_job)
    if status_review:
        query = query.filter(SumberScraping.status_review == status_review)
    return query.order_by(SumberScraping.id_scraping.desc()).all()


# 2. Detail 1 job scraping (dipakai frontend untuk memantau progres & log)
@router.get("/{id_scraping}", response_model=ScrapingResponse)
def get_detail_scraping(
    id_scraping: int,
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    item = (
        db.query(SumberScraping)
        .filter(SumberScraping.id_scraping == id_scraping)
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data scraping tidak ditemukan",
        )
    return item


# 3. Picu job scraping baru & jalankan bot di background
@router.post("", response_model=ScrapingResponse, status_code=status.HTTP_201_CREATED)
def create_scraping_job(
    payload: ScrapingCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    job = SumberScraping(
        dipicu_oleh=pengelola.id_pengelola,
        nama_sumber=payload.nama_sumber,
        url_sumber=payload.url_sumber,
        status_job="antri",
        status_review="menunggu_review",
    )
    db.add(job)
    db.flush()

    db.add(
        LogAktivitas(
            id_pengelola=pengelola.id_pengelola,
            aksi="buat_job_scraping",
            objek_tipe="sumber_scraping",
            objek_id=job.id_scraping,
            deskripsi=f"Menjalankan scraping: {payload.url_sumber}",
        )
    )
    db.commit()
    db.refresh(job)

    background_tasks.add_task(
        _jalankan_bot_background,
        job.id_scraping,
        job.url_sumber,
        db.get_bind(),
    )
    return job


# 4. Batalkan job scraping yang sedang antri / berjalan
@router.patch("/{id_scraping}/batal", response_model=ScrapingResponse)
def batalkan_scraping_job(
    id_scraping: int,
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    item = (
        db.query(SumberScraping)
        .filter(SumberScraping.id_scraping == id_scraping)
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data scraping tidak ditemukan",
        )
    if item.status_job not in ("antri", "berjalan"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Job sudah berstatus '{item.status_job}' dan tidak dapat dibatalkan",
        )

    item.status_job = "dibatalkan"
    db.commit()
    db.refresh(item)
    return item


# 5. Update progres manual (opsional jika bot dijalankan terpisah via CLI)
@router.patch("/{id_scraping}/progress", response_model=ScrapingResponse)
def update_scraping_progress(
    id_scraping: int,
    payload: ScrapingProgressUpdate,
    db: Session = Depends(get_db),
):
    item = (
        db.query(SumberScraping)
        .filter(SumberScraping.id_scraping == id_scraping)
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data scraping tidak ditemukan",
        )

    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(item, key, value)

    if payload.status_job in ("selesai", "gagal"):
        item.waktu_selesai = datetime.now(timezone.utc)

    db.commit()
    db.refresh(item)
    return item


# 6. Admin review hasil scraping -> otomatis jadi Draft Event + simpan kandidat gambar
@router.post("/{id_scraping}/review", response_model=ScrapingResponse)
def review_hasil_scraping(
    id_scraping: int,
    payload: ScrapingReviewAction,
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    if pengelola.peran != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hanya admin yang dapat mereview hasil scraping",
        )

    item = (
        db.query(SumberScraping)
        .filter(SumberScraping.id_scraping == id_scraping)
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data scraping tidak ditemukan",
        )

    item.status_review = payload.status_review

    if payload.id_event and item.id_event is None:
        item.id_event = payload.id_event
        
    if payload.status_review == "disimpan" and item.id_event is None:
        raw = item.hasil_mentah or {}
        daftar_gambar = raw.get("gambar") or []
        gambar_pertama = daftar_gambar[0] if daftar_gambar else {}

        poster_terpilih = (
            payload.poster_url
            or gambar_pertama.get("secure_url")
            or gambar_pertama.get("url_asli")
        )
        poster_pid = (
            gambar_pertama.get("public_id")
            if not payload.poster_url
            else None
        )

        nama_ev = (
            payload.nama_event
            or raw.get("nama_event")
            or item.nama_sumber
            or "Event Hasil Scraping"
        )

        event_baru = Event(
            id_organizer=payload.id_organizer or pengelola.id_pengelola,
            nama_event=nama_ev[:150],
            deskripsi=payload.deskripsi or raw.get("deskripsi"),
            tanggal_mulai=payload.tanggal_mulai
            or _parse_date_aman(raw.get("tanggal_mulai")),
            tanggal_selesai=payload.tanggal_selesai
            or _parse_date_aman(raw.get("tanggal_selesai")),
            lokasi=payload.lokasi or raw.get("lokasi_teks") or raw.get("lokasi"),
            garis_lintang=(
                payload.garis_lintang
                if payload.garis_lintang is not None
                else raw.get("garis_lintang")
            ),
            garis_bujur=(
                payload.garis_bujur
                if payload.garis_bujur is not None
                else raw.get("garis_bujur")
            ),
            jenis_event=payload.jenis_event or raw.get("jenis_event"),
            sumber="scraping",
            status_event="draft",
            poster_url=poster_terpilih,
            poster_public_id=poster_pid,
        )
        db.add(event_baru)
        db.flush()
        item.id_event = event_baru.id_event

        for g in daftar_gambar:
            url_img = g.get("secure_url") or g.get("url_asli")
            if url_img:
                db.add(
                 GambarEvent(
                     id_event=event_baru.id_event,
                     url_gambar=url_img,
                     public_id=g.get("public_id"),
                     jenis_gambar="lainnya",
                     keterangan="Hasil ekstraksi otomatis bot scraping",
                 )
                )

    db.add(
        LogAktivitas(
            id_pengelola=pengelola.id_pengelola,
            aksi=f"review_scraping_{payload.status_review}",
            objek_tipe="sumber_scraping",
            objek_id=item.id_scraping,
        )
    )
    db.commit()
    db.refresh(item)
    return item