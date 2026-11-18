"""Mengunduh gambar kandidat (poster/denah) dan upload ke Cloudinary."""
import os
import time
import httpx
import config


def unduh_gambar(daftar_url, folder, on_gambar=None):
    """Unduh tiap URL ke folder.

    Kembalikan list objek {url_asli, file, ukuran_byte, secure_url, public_id}.
    Gambar kecil (ikon/logo) disaring, jadi daftar ini bisa lebih pendek dari
    kandidat. Setiap objek membawa URL sumbernya sendiri, jangan dicocokkan
    berdasarkan urutan.

    on_gambar(i, total, url) dipanggil sebelum tiap unduhan dan boleh melempar
    JobDibatalkan.
    """
    os.makedirs(folder, exist_ok=True)
    hasil = []
    total = len(daftar_url)
    with httpx.Client(headers={"User-Agent": config.USER_AGENT},
                      timeout=30, follow_redirects=True) as klien:
        for i, url in enumerate(daftar_url, 1):
            if on_gambar:
                on_gambar(i, total, url)
            try:
                r = klien.get(url)
                tipe = r.headers.get("content-type", "")
                if r.status_code != 200 or not tipe.startswith("image/"):
                    continue
                if len(r.content) < config.MIN_GAMBAR_BYTE:
                    continue  # kemungkinan ikon/logo
                ekstensi = tipe.split("/")[-1].split(";")[0].replace("jpeg", "jpg")
                if ekstensi not in ("jpg", "png", "webp", "gif"):
                    continue
                nama = os.path.join(folder, f"gambar_{i}.{ekstensi}")
                with open(nama, "wb") as f:
                    f.write(r.content)
                hasil.append({"url_asli": url, "file": nama,
                              "ukuran_byte": len(r.content),
                              "secure_url": None, "public_id": None})
            except httpx.HTTPError:
                continue
            time.sleep(0.5)
    return hasil


def upload_cloudinary(path_file, folder="festnav"):
    """Upload satu file. Kembalikan {'secure_url', 'public_id'}.

    Butuh `pip install cloudinary` dan CLOUDINARY_URL di lingkungan.
    """
    import cloudinary.uploader  # impor di sini agar opsional
    hasil = cloudinary.uploader.upload(path_file, folder=folder)
    return {"secure_url": hasil["secure_url"], "public_id": hasil["public_id"]}


def hapus_cloudinary(daftar_public_id):
    """Hapus gambar dari Cloudinary."""
    import cloudinary.uploader
    for pid in daftar_public_id:
        try:
            cloudinary.uploader.destroy(pid)
        except Exception:
            pass
