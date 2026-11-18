"""Alamat teks -> koordinat memakai Nominatim (OpenStreetMap).

Aturan Nominatim: maksimal 1 permintaan per detik dan wajib User-Agent jelas.
"""
import time
import httpx
import config

_terakhir = 0.0


def _tunggu():
    global _terakhir
    selisih = time.time() - _terakhir
    if selisih < 1.1:
        time.sleep(1.1 - selisih)
    _terakhir = time.time()


def _cari(query):
    _tunggu()
    r = httpx.get(
        config.NOMINATIM_URL,
        params={"q": query, "format": "jsonv2", "limit": 1,
                "countrycodes": config.GEOCODING_COUNTRY, "addressdetails": 0},
        headers={"User-Agent": config.USER_AGENT},
        timeout=20,
    )
    r.raise_for_status()
    data = r.json()
    return data[0] if data else None


def geocode(alamat):
    """Kembalikan dict {lintang, bujur, nama_ditemukan, keyakinan} atau None.

    keyakinan: 'ditemukan' (cocok dengan alamat utuh) atau 'perlu_cek'
    (hanya cocok setelah alamat disederhanakan, hasil bisa meleset).
    """
    if not alamat:
        return None
    bagian = [b.strip() for b in alamat.split(",") if b.strip()]
    # percobaan 1: alamat utuh; berikutnya: buang bagian paling depan satu per satu
    for i in range(0, max(1, len(bagian) - 1)):
        query = ", ".join(bagian[i:]) if bagian else alamat
        hasil = _cari(query)
        if hasil:
            return {
                "lintang": round(float(hasil["lat"]), 6),
                "bujur": round(float(hasil["lon"]), 6),
                "nama_ditemukan": hasil.get("display_name"),
                "keyakinan": "ditemukan" if i == 0 else "perlu_cek",
            }
    return None
