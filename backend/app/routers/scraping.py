import os
import sys
from datetime import date, datetime, timezone
from pathlib import Path
from typing import List, Optional
from urllib.parse import urljoin

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import get_current_pengelola
from app.database import get_db
from app.models import Event, GambarEvent, LogAktivitas, Map, Pengelola, SumberScraping
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


def _parse_float_aman(val, min_val: float, max_val: float) -> Optional[float]:
    if val is None or val == "":
        return None
    try:
        num = float(val)
        return num if min_val <= num <= max_val else None
    except (TypeError, ValueError):
        return None


def _normalisasi_url_gambar(url_raw: Optional[str], base_url: Optional[str]) -> Optional[str]:
    if not url_raw or not str(url_raw).strip():
        return None
    clean = str(url_raw).strip()
    if clean.startswith("data:image/"):
        return clean
    if base_url and not clean.startswith(("http://", "https://")):
        return urljoin(base_url, clean)
    return clean


def _ekstrak_daftar_gambar(raw: dict, base_url: Optional[str] = None) -> list[dict]:
    """Menormalisasi list gambar dari hasil_mentah bot scraping."""
    sumber_list = raw.get("gambar") or raw.get("images") or []
    hasil = []
    seen = set()

    for idx, g in enumerate(sumber_list, start=1):
        url_img = None
        public_id = None
        keterangan = f"Gambar Scraping #{idx}"

        if isinstance(g, str):
            url_img = _normalisasi_url_gambar(g, base_url)
        elif isinstance(g, dict):
            raw_u = (
                g.get("secure_url")
                or g.get("url_asli")
                or g.get("url")
                or g.get("src")
            )
            url_img = _normalisasi_url_gambar(raw_u, base_url)
            public_id = g.get("public_id")
            keterangan = (
                g.get("keterangan")
                or g.get("alt")
                or f"Gambar Scraping #{idx}"
            )

        if url_img and url_img not in seen:
            seen.add(url_img)
            hasil.append(
                {
                    "url": url_img,
                    "public_id": public_id,
                    "keterangan": str(keterangan)[:200],
                }
            )

    # Cadangan jika daftar gambar kosong tetapi poster_url tersedia di hasil_mentah
    if not hasil:
        fallback_poster = _normalisasi_url_gambar(
            raw.get("poster_url") or raw.get("gambar_poster"), base_url
        )
        if fallback_poster:
            hasil.append(
                {
                    "url": fallback_poster,
                    "public_id": None,
                    "keterangan": "Poster Hasil Scraping",
                }
            )

    return hasil


def _simpan_kandidat_gambar(
    db: Session, id_event: int, raw: dict, base_url: Optional[str] = None
) -> int:
    """Memasukkan kandidat gambar hasil scraping ke gambar_event tanpa duplikat."""
    daftar = _ekstrak_daftar_gambar(raw, base_url)
    if not daftar:
        return 0

    # Kumpulkan URL yang sudah ada di galeri, poster utama, maupun denah map
    existing_urls = {
        row[0]
        for row in db.query(GambarEvent.url_gambar)
        .filter(GambarEvent.id_event == id_event)
        .all()
        if row[0]
    }

    ev = db.query(Event).filter(Event.id_event == id_event).first()
    if ev and ev.poster_url:
        existing_urls.add(ev.poster_url)

    map_urls = {
        row[0]
        for row in db.query(Map.gambar_layout)
        .filter(Map.id_event == id_event)
        .all()
        if row[0]
    }
    existing_urls.update(map_urls)

    ditambahkan = 0
    for item_img in daftar:
        if item_img["url"] not in existing_urls:
            db.add(
                GambarEvent(
                    id_event=id_event,
                    url_gambar=item_img["url"],
                    public_id=item_img["public_id"],
                    jenis_gambar="lainnya",
                    keterangan=item_img["keterangan"],
                )
            )
            existing_urls.add(item_img["url"])
            ditambahkan += 1
    return ditambahkan


def _buat_draft_event_dari_scraping(
    db: Session,
    item: SumberScraping,
    pengelola: Pengelola,
    payload: Optional[ScrapingReviewAction] = None,
) -> Event:
    raw = item.hasil_mentah or {}
    daftar_gambar = _ekstrak_daftar_gambar(raw, item.url_sumber)
    gambar_pertama = daftar_gambar[0] if daftar_gambar else {}

    poster_terpilih = (
        _normalisasi_url_gambar(payload.poster_url, item.url_sumber)
        if (payload and payload.poster_url)
        else gambar_pertama.get("url")
    )
    poster_pid = (
        gambar_pertama.get("public_id")
        if not (payload and payload.poster_url)
        else None
    )

    nama_ev = (
        (payload.nama_event if payload else None)
        or raw.get("nama_event")
        or item.nama_sumber
        or "Event Hasil Scraping"
    )

    tgl_mulai = (payload.tanggal_mulai if payload else None) or _parse_date_aman(
        raw.get("tanggal_mulai")
    )
    tgl_selesai = (payload.tanggal_selesai if payload else None) or _parse_date_aman(
        raw.get("tanggal_selesai")
    )
    if tgl_mulai and tgl_selesai and tgl_selesai < tgl_mulai:
        tgl_selesai = tgl_mulai

    lat = (
        payload.garis_lintang
        if (payload and payload.garis_lintang is not None)
        else _parse_float_aman(raw.get("garis_lintang"), -90.0, 90.0)
    )
    lng = (
        payload.garis_bujur
        if (payload and payload.garis_bujur is not None)
        else _parse_float_aman(raw.get("garis_bujur"), -180.0, 180.0)
    )

    raw_tipe = str(raw.get("tipe_lokasi") or "").lower().strip()
    if raw_tipe == "hybrid":
        raw_tipe = "campuran"
    tipe_lokasi = raw_tipe if raw_tipe in ("indoor", "outdoor", "campuran") else "outdoor"

    raw_mode = str(raw.get("mode_event") or "").lower().strip()
    mode_event = raw_mode if raw_mode in ("interaktif", "direktori") else "interaktif"

    event_baru = Event(
        id_organizer=(payload.id_organizer if payload else None)
        or pengelola.id_pengelola,
        nama_event=nama_ev[:150],
        deskripsi=(payload.deskripsi if payload else None) or raw.get("deskripsi"),
        tanggal_mulai=tgl_mulai,
        tanggal_selesai=tgl_selesai,
        lokasi=(payload.lokasi if payload else None)
        or raw.get("lokasi_teks")
        or raw.get("lokasi"),
        garis_lintang=lat,
        garis_bujur=lng,
        jenis_event=(payload.jenis_event if payload else None)
        or raw.get("jenis_event"),
        tipe_lokasi=tipe_lokasi,
        mode_event=mode_event,
        sumber="scraping",
        status_event="draft",
        poster_url=poster_terpilih,
        poster_public_id=poster_pid,
    )
    db.add(event_baru)
    db.flush()
    item.id_event = event_baru.id_event
    return event_baru


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


# 2. Detail 1 job scraping
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


# 4. Batalkan job scraping
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


# 5. Update progres manual
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


# 6. Siapkan Draft Event + Masukkan Kandidat Gambar ke Galeri sebelum Review selesai
@router.post("/{id_scraping}/siapkan-galeri", response_model=ScrapingResponse)
def siapkan_galeri_scraping(
    id_scraping: int,
    db: Session = Depends(get_db),
    pengelola: Pengelola = Depends(get_current_pengelola),
):
    if pengelola.peran != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hanya admin yang dapat mengelola galeri hasil scraping",
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

    if item.id_event is None:
        _buat_draft_event_dari_scraping(db, item, pengelola)

    _simpan_kandidat_gambar(
        db, item.id_event, item.hasil_mentah or {}, item.url_sumber
    )
    db.commit()
    db.refresh(item)
    return item


# 7. Admin review hasil scraping -> simpan draft event + pastikan semua kandidat gambar masuk galeri
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

    if payload.status_review == "disimpan":
        if item.id_event is None:
            _buat_draft_event_dari_scraping(db, item, pengelola, payload)
        else:
            ev = db.query(Event).filter(Event.id_event == item.id_event).first()
            if ev:
                if payload.nama_event:
                    ev.nama_event = payload.nama_event[:150]
                if payload.deskripsi is not None:
                    ev.deskripsi = payload.deskripsi
                if payload.tanggal_mulai is not None:
                    ev.tanggal_mulai = payload.tanggal_mulai
                if payload.tanggal_selesai is not None:
                    ev.tanggal_selesai = payload.tanggal_selesai
                if payload.lokasi is not None:
                    ev.lokasi = payload.lokasi
                if payload.garis_lintang is not None:
                    ev.garis_lintang = payload.garis_lintang
                if payload.garis_bujur is not None:
                    ev.garis_bujur = payload.garis_bujur
                if payload.jenis_event is not None:
                    ev.jenis_event = payload.jenis_event
                if payload.poster_url is not None:
                    ev.poster_url = _normalisasi_url_gambar(
                        payload.poster_url, item.url_sumber
                    )

        _simpan_kandidat_gambar(
            db, item.id_event, item.hasil_mentah or {}, item.url_sumber
        )
    elif payload.status_review == "dibuang" and item.id_event is not None:
        # Bersihkan draft sementara jika hasil scraping dibuang oleh Admin
        ev_draft = db.query(Event).filter(Event.id_event == item.id_event).first()
        if ev_draft and ev_draft.status_event == "draft" and ev_draft.sumber == "scraping":
            item.id_event = None
            db.delete(ev_draft)

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