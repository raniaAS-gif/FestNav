"""Alur utama scraper. Satu URL = satu job = satu event.

    jalankan_scraping(url, on_progress=callback) -> dict

Status hasil: 'berhasil' | 'gagal' | 'dibatalkan'. Fungsi ini tidak pernah
melempar exception; semua kegagalan dikembalikan sebagai status.
Callback on_progress(tahap, log) boleh melempar JobDibatalkan untuk membatalkan.
"""
import json
import os
import shutil

import config
from errors import JobDibatalkan
from utils import sekarang, slug_dari_url

TAHAP = ["Membuka halaman", "Mengambil teks", "Mengunduh denah",
         "Upload gambar", "Geocoding", "Selesai"]


class _Job:
    """Mencatat tahap dan log; meneruskan ke callback (untuk Monitor Scraping)."""

    def __init__(self, on_progress):
        self.log = []
        self.tahap = None
        self.on_progress = on_progress

    def _tulis(self, pesan):
        self.log.append(f"{sekarang():%Y-%m-%d %H:%M:%S} WIB | {pesan}")

    def _kirim(self):
        if self.on_progress:
            self.on_progress(self.tahap, list(self.log))

    def tahap_baru(self, nama, pesan=None):
        self.tahap = nama
        self._tulis(nama + (f": {pesan}" if pesan else ""))
        self._kirim()

    def info(self, pesan):
        """Sub-langkah di dalam tahap yang sama (supaya status tidak terlihat macet)."""
        self._tulis(pesan)
        self._kirim()

    def catat(self, pesan):
        """Catatan log tanpa memanggil callback."""
        self._tulis(pesan)


def _hasil_kosong(url):
    return {
        "url_sumber": url, "nama_event": None, "deskripsi": None,
        "tanggal_mulai": None, "tanggal_selesai": None, "lokasi_teks": None,
        "garis_lintang": None, "garis_bujur": None, "keyakinan_geocoding": None,
        "gambar_kandidat": [],   # semua URL yang ditemukan di halaman
        "gambar": [],            # [{url_asli, file, ukuran_byte, secure_url, public_id}]
        "adapter": None, "status": "gagal", "pesan_error": None,
        "peringatan": [], "tahap_log": [],
        "waktu_scrape": sekarang().isoformat(timespec="seconds"),   # berzona +07:00
    }


def jalankan_scraping(url, on_progress=None, unduh=True, cloudinary=False,
                      headless=None, simpan_json=True, bersihkan=None):
    """bersihkan: hapus gambar sementara di output/ setelah unggah.
    Default aktif jika cloudinary=True dan simpan_json=False; di CLI pakai --bersihkan."""
    hasil = _hasil_kosong(url)
    job = _Job(on_progress)
    folder, page = None, None
    if bersihkan is None:
        bersihkan = cloudinary and not simpan_json

    try:
        # impor Playwright dan pembuatan folder di dalam try (A3)
        from playwright.sync_api import sync_playwright, TimeoutError as PwTimeout
        from adapters import pilih_adapter
        from geocoding import geocode
        from images import unduh_gambar, upload_cloudinary
        from robots import boleh_diambil

        folder = os.path.join(config.OUTPUT_DIR, slug_dari_url(url))
        os.makedirs(folder, exist_ok=True)

        if not url.startswith(("http://", "https://")):
            raise ValueError("URL harus diawali http:// atau https://")

        ok, alasan = boleh_diambil(url)
        if not ok:
            raise PermissionError(alasan)

        # ---- 1. buka halaman ----
        job.tahap_baru(TAHAP[0], url)
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=config.HEADLESS if headless is None else headless)
            ctx = browser.new_context(user_agent=config.USER_AGENT, locale="id-ID")
            page = ctx.new_page()
            page.set_default_timeout(config.TIMEOUT_MS)
            try:
                job.info("Menunggu halaman termuat")
                page.goto(url, wait_until="domcontentloaded")
                job.info("Halaman terbuka, menunggu isi dinamis")
                try:
                    page.wait_for_load_state("networkidle", timeout=8000)
                except PwTimeout:
                    job.catat("Halaman belum idle, lanjut dengan isi yang sudah termuat")

                # ---- 2. ambil teks ----
                adapter = pilih_adapter(url)
                hasil["adapter"] = adapter.nama
                job.tahap_baru(TAHAP[1], f"adapter {adapter.nama}")
                data = adapter.ekstrak(page)
            except JobDibatalkan:
                raise
            except Exception:
                _simpan_debug(page, folder)
                raise
            finally:
                browser.close()

        for k in ("nama_event", "deskripsi", "tanggal_mulai", "tanggal_selesai", "lokasi_teks"):
            hasil[k] = data.get(k)
        hasil["gambar_kandidat"] = data.get("gambar", [])

        if not hasil["nama_event"]:
            raise ValueError("Nama event tidak ditemukan (periksa selektor adapter)")
        if not hasil["tanggal_mulai"]:
            hasil["peringatan"].append("Tanggal tidak terbaca, isi manual saat review")
        else:
            # validasi tanggal (A6): constraint database menolak selesai < mulai
            if not hasil["tanggal_selesai"]:
                hasil["tanggal_selesai"] = hasil["tanggal_mulai"]
            elif hasil["tanggal_selesai"] < hasil["tanggal_mulai"]:
                hasil["peringatan"].append(
                    f"Tanggal selesai ({hasil['tanggal_selesai']}) lebih awal dari mulai; "
                    "disamakan dengan tanggal mulai, periksa saat review")
                hasil["tanggal_selesai"] = hasil["tanggal_mulai"]
        if not hasil["lokasi_teks"]:
            hasil["peringatan"].append("Alamat tidak ditemukan, geocoding dilewati")

        # ---- 3. unduh gambar kandidat ----
        if unduh and hasil["gambar_kandidat"]:
            job.tahap_baru(TAHAP[2], f"{len(hasil['gambar_kandidat'])} kandidat")
            hasil["gambar"] = unduh_gambar(
                hasil["gambar_kandidat"], os.path.join(folder, "gambar"),
                on_gambar=lambda i, n, u: job.info(f"Mengunduh gambar {i}/{n}"))
            if not hasil["gambar"]:
                hasil["peringatan"].append("Tidak ada gambar yang lolos filter, upload denah manual")
        else:
            job.tahap_baru(TAHAP[2], "dilewati")
            if not hasil["gambar_kandidat"]:
                hasil["peringatan"].append("Denah tidak ditemukan di sumber, upload manual")

        # ---- 4. upload Cloudinary (opsional) ----
        if cloudinary and hasil["gambar"]:
            job.tahap_baru(TAHAP[3], f"{len(hasil['gambar'])} gambar")
            for n, g in enumerate(hasil["gambar"], 1):
                job.info(f"Mengunggah gambar {n}/{len(hasil['gambar'])}")
                try:
                    g.update(upload_cloudinary(g["file"]))   # secure_url + public_id
                except Exception as e:
                    hasil["peringatan"].append(f"Upload gagal untuk {g['url_asli']}: {e}")
            if bersihkan:
                _bersihkan(folder, hasil)   # (A8) disk tidak menumpuk
        else:
            job.tahap_baru(TAHAP[3], "dilewati")

        # ---- 5. geocoding ----
        if hasil["lokasi_teks"]:
            job.tahap_baru(TAHAP[4], hasil["lokasi_teks"])
            try:
                g = geocode(hasil["lokasi_teks"])
            except Exception as e:
                g = None
                hasil["peringatan"].append(f"Geocoding error: {e}")
            if g:
                hasil["garis_lintang"], hasil["garis_bujur"] = g["lintang"], g["bujur"]
                hasil["keyakinan_geocoding"] = g["keyakinan"]
                if g["keyakinan"] == "perlu_cek":
                    hasil["peringatan"].append("Lokasi hanya cocok sebagian, geser pin saat review")
            else:
                hasil["peringatan"].append("Koordinat tidak ditemukan, tentukan pin manual")
        else:
            job.tahap_baru(TAHAP[4], "dilewati")

        job.tahap_baru(TAHAP[5])
        hasil["status"] = "berhasil"

    except JobDibatalkan:
        hasil["status"] = "dibatalkan"
        hasil["pesan_error"] = "Dibatalkan"
        job.catat("DIBATALKAN")
    except Exception as e:
        hasil["status"] = "gagal"
        hasil["pesan_error"] = f"{type(e).__name__}: {e}"
        job.catat(f"GAGAL: {hasil['pesan_error']}")
        try:
            if on_progress:
                on_progress("Gagal", list(job.log))
        except Exception:
            pass   # callback tidak boleh menggagalkan pelaporan

    # sisa file sementara (mis. saat gagal/dibatalkan di tengah) ikut dibersihkan
    if folder and bersihkan:
        _bersihkan(folder, hasil)

    hasil["tahap_log"] = job.log
    if simpan_json and folder:
        os.makedirs(folder, exist_ok=True)
        with open(os.path.join(folder, "hasil.json"), "w", encoding="utf-8") as f:
            json.dump(hasil, f, ensure_ascii=False, indent=2)
    return hasil


def _bersihkan(folder, hasil):
    """Hapus gambar sementara. gagal.png/gagal.html sengaja dipertahankan untuk debug."""
    shutil.rmtree(os.path.join(folder, "gambar"), ignore_errors=True)
    for g in hasil["gambar"]:
        g["file"] = None
    try:
        os.rmdir(folder)   # hanya berhasil jika folder sudah kosong
    except OSError:
        pass


def _simpan_debug(page, folder):
    """Simpan screenshot dan HTML saat gagal agar selektor mudah diperbaiki."""
    if page is None or folder is None:
        return
    try:
        page.screenshot(path=os.path.join(folder, "gagal.png"), full_page=True)
        with open(os.path.join(folder, "gagal.html"), "w", encoding="utf-8") as f:
            f.write(page.content())
    except Exception:
        pass
