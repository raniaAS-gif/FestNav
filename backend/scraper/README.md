# Scraper FestNav

Satu URL = satu job = satu event. Hasil berupa `output/<slug>/hasil.json` + gambar kandidat.
Hasil WAJIB direview admin sebelum dipublikasikan.

## Instalasi
```bash
python -m venv venv
venv\Scripts\activate            # Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
playwright install chromium
copy .env.example .env           # Mac/Linux: cp .env.example .env  (lalu isi email di User-Agent)
```

## Menjalankan
```bash
python main.py https://situs.com/event/123
python main.py --file urls.txt
python main.py URL --headed --no-images     # lihat browser / lewati unduh gambar
```

## Alur
robots.txt -> Playwright buka halaman -> adapter ambil teks + gambar -> unduh gambar kandidat
-> (opsional) Cloudinary -> geocoding Nominatim -> hasil.json

## Menambah situs baru
1. Salin `adapters/situs_a.py` menjadi `situs_b.py`, ubah DOMAIN dan SELECTOR (cek lewat F12).
2. Daftarkan di `adapters/__init__.py` pada list `ADAPTERS`.
Tanpa adapter, situs diproses `GenericAdapter` (JSON-LD, OpenGraph, heuristik teks).

## Saat gagal
Cek `output/<slug>/gagal.png` dan `gagal.html`, lalu perbaiki selektor adapter.

## Menghubungkan ke FastAPI (nanti)
```python
from pipeline import jalankan_scraping

def kerjakan_job(id_job, url):
    def lapor(tahap, log):
        ...  # update tahap_saat_ini dan log di tabel sumber_scraping
    hasil = jalankan_scraping(url, on_progress=lapor, cloudinary=True)
    ...      # simpan ke tabel event, map, sumber_scraping (status_review = menunggu)

# router: background_tasks.add_task(kerjakan_job, id_job, url)
```
Fungsi bersifat sinkron, jadi aman dipakai di BackgroundTasks FastAPI.

## Hasil bot (ringkas)
`status`: berhasil | gagal | dibatalkan. `gambar`: list `{url_asli, file, ukuran_byte, secure_url, public_id}`.
Pembatalan: callback `on_progress` boleh melempar `errors.JobDibatalkan`, hasilnya `status: dibatalkan`.
Pembersihan: `--bersihkan` (atau `bersihkan=True`) menghapus gambar sementara di `output/` setelah terunggah ke Cloudinary.
Waktu memakai WIB (+07:00). `tanggal_selesai` otomatis disamakan dengan `tanggal_mulai` jika terbalik (ada peringatan).

## Batasan
- Scraper tidak membaca isi denah. Gambar hanya kandidat, admin memilih mana yang denah.
- Sosial media tidak dijadikan sumber bot (kebijakan platform dan keandalan data).
- Periksa syarat layanan situs sasaran dan catat untuk laporan.
