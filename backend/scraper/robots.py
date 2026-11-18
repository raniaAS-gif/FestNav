"""Cek robots.txt sebelum mengambil halaman."""
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser
import httpx
import config

_cache = {}


def boleh_diambil(url):
    """Kembalikan (boleh: bool, alasan: str)."""
    p = urlparse(url)
    dasar = f"{p.scheme}://{p.netloc}"
    if dasar not in _cache:
        rp = RobotFileParser()
        try:
            r = httpx.get(f"{dasar}/robots.txt", timeout=15, follow_redirects=True,
                          headers={"User-Agent": config.USER_AGENT})
            if r.status_code in (401, 403):
                rp.disallow_all = True
            elif r.status_code == 200:
                rp.parse(r.text.splitlines())
            else:
                rp.allow_all = True   # tidak ada robots.txt
        except httpx.HTTPError:
            rp.allow_all = True
        _cache[dasar] = rp
    ok = _cache[dasar].can_fetch(config.USER_AGENT, url)
    return ok, "" if ok else "Diblokir oleh robots.txt situs"
