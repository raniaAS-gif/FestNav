"""Konfigurasi scraper. Nilai dibaca dari file .env."""
import os
from dotenv import load_dotenv

load_dotenv()

USER_AGENT = os.getenv(
    "SCRAPER_USER_AGENT", "FestNavBot/1.0 (capstone; kontak: ganti-email@contoh.com)"
)
DELAY_DETIK = float(os.getenv("SCRAPER_DELAY_DETIK", "3"))
OUTPUT_DIR = os.getenv("SCRAPER_OUTPUT_DIR", "output")
TIMEOUT_MS = int(os.getenv("SCRAPER_TIMEOUT_MS", "30000"))
HEADLESS = os.getenv("SCRAPER_HEADLESS", "true").lower() != "false"
GEOCODING_COUNTRY = os.getenv("GEOCODING_COUNTRY", "id")
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
MIN_GAMBAR_BYTE = 15_000   # gambar lebih kecil dianggap ikon/logo
MAKS_GAMBAR = 10           # jumlah maksimum gambar kandidat per event
