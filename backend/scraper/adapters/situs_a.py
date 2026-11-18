"""CONTOH adapter khusus satu situs.

Salin file ini untuk tiap situs sasaran (situs_b.py, dst.), lalu:
1. Ubah DOMAIN.
2. Isi SELECTOR berdasarkan hasil inspeksi DevTools (F12).
3. Daftarkan kelasnya di adapters/__init__.py (list ADAPTERS).

Bagian yang selektornya dikosongkan (None) otomatis memakai ekstraksi umum.
"""
from urllib.parse import urlparse, urljoin

from utils import bersihkan, parse_rentang
from .generic import GenericAdapter


class SitusA(GenericAdapter):
    nama = "situs_a"
    DOMAIN = "contoh-portal-tiket.com"     # <- GANTI dengan domain situs sasaran

    SELECTOR = {
        "nama_event": "h1.event-title",    # <- GANTI sesuai situs, atau None
        "deskripsi": "div.event-description",
        "tanggal": "span.event-date",
        "lokasi": "div.event-venue",
        "gambar": "img.event-map, img.event-poster",
    }

    @classmethod
    def cocok(cls, url):
        return urlparse(url).netloc.replace("www.", "").endswith(cls.DOMAIN)

    def _teks(self, page, selector):
        if not selector:
            return None
        el = page.query_selector(selector)
        return bersihkan(el.inner_text()) if el else None

    def ekstrak(self, page):
        data = super().ekstrak(page)      # dasar: ekstraksi umum
        s = self.SELECTOR

        data["nama_event"] = self._teks(page, s["nama_event"]) or data["nama_event"]
        data["deskripsi"] = self._teks(page, s["deskripsi"]) or data["deskripsi"]
        data["lokasi_teks"] = self._teks(page, s["lokasi"]) or data["lokasi_teks"]

        tanggal = self._teks(page, s["tanggal"])
        if tanggal:
            data["tanggal_teks"] = tanggal
            mulai, selesai = parse_rentang(tanggal)
            data["tanggal_mulai"] = mulai or data["tanggal_mulai"]
            data["tanggal_selesai"] = selesai or mulai or data["tanggal_selesai"]

        if s["gambar"]:
            khusus = []
            for el in page.query_selector_all(s["gambar"]):
                src = el.get_attribute("src") or el.get_attribute("data-src")
                if src:
                    khusus.append(urljoin(page.url, src))
            # gambar khusus situs didahulukan, sisanya dari ekstraksi umum
            data["gambar"] = list(dict.fromkeys(khusus + data["gambar"]))
        return data
