"""Fungsi bantu: parsing tanggal Indonesia, slug, pembersih teks."""
import hashlib
import re
from datetime import date, datetime, timedelta, timezone
from urllib.parse import urlparse

BULAN = {
    "januari": 1, "jan": 1, "februari": 2, "feb": 2, "maret": 3, "mar": 3,
    "april": 4, "apr": 4, "mei": 5, "may": 5, "juni": 6, "jun": 6,
    "juli": 7, "jul": 7, "agustus": 8, "agu": 8, "agt": 8, "aug": 8,
    "september": 9, "sep": 9, "sept": 9, "oktober": 10, "okt": 10, "oct": 10,
    "november": 11, "nov": 11, "desember": 12, "des": 12, "dec": 12,
}
WIB = timezone(timedelta(hours=7), "WIB")   # zona waktu eksplisit, tanpa tzdata


def sekarang():
    """Waktu sekarang berzona WIB (+07:00)."""
    return datetime.now(WIB)


_SEP = r"(?:-|–|—|s/d|s\.d\.|sd|sampai|hingga|to)"


def bersihkan(teks):
    if not teks:
        return None
    teks = re.sub(r"\s+", " ", str(teks)).strip()
    return teks or None


def slug_dari_url(url):
    host = urlparse(url).netloc.replace("www.", "").replace(".", "-")
    return f"{host}-{hashlib.md5(url.encode()).hexdigest()[:8]}"


def _buat(th, bln, tgl):
    try:
        return date(int(th), int(bln), int(tgl)).isoformat()
    except (ValueError, TypeError):
        return None


def _bulan(nama):
    return BULAN.get(nama.lower().strip("."))


def parse_iso(teks):
    """'2026-11-12' atau '2026-11-12T10:00:00+08:00' -> '2026-11-12'."""
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})", teks or "")
    return _buat(*m.groups()) if m else None


def parse_rentang(teks):
    """Kembalikan (mulai, selesai) berformat ISO dari teks tanggal bebas.

    Contoh: '12-14 November 2026', '12 Nov - 14 Nov 2026', '5 Desember 2026'.
    """
    if not teks:
        return None, None
    iso = re.findall(r"\d{4}-\d{2}-\d{2}", teks)
    if iso:
        mulai = parse_iso(iso[0])
        return mulai, parse_iso(iso[-1]) if len(iso) > 1 else mulai

    # 12 - 14 November 2026
    m = re.search(rf"(\d{{1,2}})\s*{_SEP}\s*(\d{{1,2}})\s+([A-Za-z]+)\.?,?\s+(\d{{4}})", teks)
    if m and _bulan(m.group(3)):
        d1, d2, b, th = m.groups()
        return _buat(th, _bulan(b), d1), _buat(th, _bulan(b), d2)

    # 12 Nov - 14 Des 2026
    m = re.search(
        rf"(\d{{1,2}})\s+([A-Za-z]+)\.?\s*{_SEP}\s*(\d{{1,2}})\s+([A-Za-z]+)\.?,?\s+(\d{{4}})", teks)
    if m and _bulan(m.group(2)) and _bulan(m.group(4)):
        d1, b1, d2, b2, th = m.groups()
        return _buat(th, _bulan(b1), d1), _buat(th, _bulan(b2), d2)

    # tanggal tunggal atau beberapa tanggal terpisah
    semua = []
    for d, b, th in re.findall(r"(\d{1,2})\s+([A-Za-z]+)\.?,?\s+(\d{4})", teks):
        if _bulan(b):
            hasil = _buat(th, _bulan(b), d)
            if hasil:
                semua.append(hasil)
    if semua:
        return semua[0], semua[-1]
    return None, None
