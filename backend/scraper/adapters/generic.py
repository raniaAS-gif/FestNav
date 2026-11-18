"""Adapter umum: bekerja di banyak situs lewat JSON-LD (schema.org Event),
OpenGraph, dan heuristik teks. Dipakai sebagai dasar adapter khusus situs."""
import json
import re
from urllib.parse import urljoin

import config
from utils import bersihkan, parse_rentang

JS_AMBIL = """() => {
  const meta = {};
  document.querySelectorAll('meta').forEach(m => {
    const k = m.getAttribute('property') || m.getAttribute('name');
    if (k) meta[k] = m.getAttribute('content');
  });
  const jsonld = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map(s => s.textContent);
  const imgs = [...document.images].map(i => ({
    src: i.currentSrc || i.getAttribute('data-src') || i.src,
    alt: i.alt || '', w: i.naturalWidth || 0, h: i.naturalHeight || 0
  }));
  const h1 = document.querySelector('h1');
  return {meta, jsonld, imgs, title: document.title,
          h1: h1 ? h1.innerText : null,
          teks: document.body ? document.body.innerText.slice(0, 30000) : ''};
}"""

KATA_DENAH = ("denah", "map", "layout", "floor", "venue", "site-plan", "siteplan", "lokasi", "plan")
KATA_BUANG = ("logo", "icon", "avatar", "sprite", "pixel", "favicon", "sponsor", "payment", "badge")


class GenericAdapter:
    nama = "generic"

    @classmethod
    def cocok(cls, url):
        return True

    # ---------- bagian utama ----------
    def ekstrak(self, page):
        d = page.evaluate(JS_AMBIL)
        event = self._cari_event_jsonld(d["jsonld"])
        meta = d["meta"]

        nama = (event.get("name") or meta.get("og:title") or d["h1"] or d["title"])
        deskripsi = event.get("description") or meta.get("og:description") or meta.get("description")

        mulai, selesai = None, None
        if event.get("startDate"):
            mulai, _ = parse_rentang(str(event["startDate"]))
            selesai, _ = parse_rentang(str(event.get("endDate") or event["startDate"]))
        tanggal_teks = None
        if not mulai:
            tanggal_teks = self._cari_baris(d["teks"], ("tanggal", "date", "waktu", "jadwal"))
            mulai, selesai = parse_rentang(tanggal_teks or d["teks"][:3000])

        lokasi = self._lokasi_jsonld(event) or self._cari_baris(
            d["teks"], ("lokasi", "venue", "tempat", "location", "alamat"))

        return {
            "nama_event": bersihkan(nama),
            "deskripsi": bersihkan(deskripsi),
            "tanggal_teks": bersihkan(tanggal_teks),
            "tanggal_mulai": mulai,
            "tanggal_selesai": selesai or mulai,
            "lokasi_teks": bersihkan(lokasi),
            "gambar": self._gambar(page.url, d, event),
        }

    # ---------- JSON-LD ----------
    def _cari_event_jsonld(self, daftar):
        for mentah in daftar:
            try:
                data = json.loads(mentah)
            except (json.JSONDecodeError, TypeError):
                continue
            for node in self._ratakan(data):
                tipe = node.get("@type")
                tipe = " ".join(tipe) if isinstance(tipe, list) else str(tipe or "")
                if "Event" in tipe:
                    return node
        return {}

    def _ratakan(self, data):
        if isinstance(data, list):
            for x in data:
                yield from self._ratakan(x)
        elif isinstance(data, dict):
            if "@graph" in data:
                yield from self._ratakan(data["@graph"])
            yield data

    def _lokasi_jsonld(self, event):
        lok = event.get("location")
        if isinstance(lok, list) and lok:
            lok = lok[0]
        if isinstance(lok, str):
            return lok
        if not isinstance(lok, dict):
            return None
        bagian = [lok.get("name")]
        alamat = lok.get("address")
        if isinstance(alamat, str):
            bagian.append(alamat)
        elif isinstance(alamat, dict):
            bagian += [alamat.get(k) for k in
                       ("streetAddress", "addressLocality", "addressRegion", "addressCountry")]
        return ", ".join(str(b) for b in bagian if b) or None

    # ---------- teks ----------
    def _cari_baris(self, teks, kata_kunci):
        """Cari 'Label: isi' atau 'Label' diikuti baris isi."""
        baris = [b.strip() for b in teks.splitlines() if b.strip()]
        pola = "|".join(kata_kunci)
        for i, b in enumerate(baris):
            m = re.match(rf"(?i)^(?:{pola})\s*[:\-]\s*(.+)$", b)
            if m:
                return m.group(1)
            if re.fullmatch(rf"(?i)(?:{pola})\s*:?", b) and i + 1 < len(baris):
                return baris[i + 1]
        return None

    # ---------- gambar ----------
    def _gambar(self, base_url, d, event):
        kandidat = []
        og = d["meta"].get("og:image")
        if og:
            kandidat.append((og, ""))
        img_ld = event.get("image")
        for x in (img_ld if isinstance(img_ld, list) else [img_ld]):
            if isinstance(x, dict):
                x = x.get("url")
            if x:
                kandidat.append((x, ""))
        for im in d["imgs"]:
            if im["w"] and im["h"] and (im["w"] < 200 or im["h"] < 200):
                continue
            kandidat.append((im["src"], im["alt"]))

        unik, terlihat = [], set()
        for src, alt in kandidat:
            if not src or src.startswith("data:"):
                continue
            url = urljoin(base_url, src)
            low = (url + " " + alt).lower()
            if url in terlihat or url.lower().split("?")[0].endswith((".svg", ".ico")):
                continue
            if any(k in low for k in KATA_BUANG):
                continue
            terlihat.add(url)
            unik.append((url, any(k in low for k in KATA_DENAH)))
        # kandidat bernuansa denah diurutkan paling depan
        unik.sort(key=lambda x: not x[1])
        return [u for u, _ in unik][: config.MAKS_GAMBAR]
