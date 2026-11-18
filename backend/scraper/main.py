"""Jalankan dari terminal.

Contoh:
    python main.py https://situs.com/event/123
    python main.py --file urls.txt
    python main.py https://situs.com/event/123 --headed --no-images
"""
import argparse
import sys
import time

import config
from pipeline import jalankan_scraping


def baca_url(args):
    urls = list(args.url)
    if args.file:
        with open(args.file, encoding="utf-8") as f:
            urls += [b.strip() for b in f if b.strip() and not b.startswith("#")]
    return urls


def main():
    ap = argparse.ArgumentParser(description="Scraper event FestNav (satu URL = satu event)")
    ap.add_argument("url", nargs="*", help="URL halaman event")
    ap.add_argument("--file", help="file teks berisi satu URL per baris")
    ap.add_argument("--no-images", action="store_true", help="jangan unduh gambar")
    ap.add_argument("--cloudinary", action="store_true", help="upload gambar ke Cloudinary")
    ap.add_argument("--bersihkan", action="store_true",
                    help="hapus gambar sementara setelah diunggah ke Cloudinary")
    ap.add_argument("--headed", action="store_true", help="tampilkan jendela browser")
    args = ap.parse_args()

    urls = baca_url(args)
    if not urls:
        ap.print_help()
        sys.exit(1)

    ringkas = {"berhasil": 0, "gagal": 0, "dibatalkan": 0}
    for i, url in enumerate(urls, 1):
        print(f"\n[{i}/{len(urls)}] {url}")
        hasil = jalankan_scraping(
            url,
            on_progress=lambda tahap, log: print(f"   - {log[-1]}"),
            unduh=not args.no_images,
            cloudinary=args.cloudinary,
            bersihkan=args.bersihkan or None,
            headless=False if args.headed else None,
        )
        ringkas[hasil["status"]] += 1
        if hasil["status"] == "berhasil":
            print(f"   OK  {hasil['nama_event']} | {hasil['tanggal_mulai']} | "
                  f"({hasil['garis_lintang']}, {hasil['garis_bujur']}) | "
                  f"{len(hasil['gambar'])} gambar")
            for w in hasil["peringatan"]:
                print(f"   ! {w}")
        else:
            print(f"   GAGAL  {hasil['pesan_error']}")
        if i < len(urls):
            time.sleep(config.DELAY_DETIK)   # jeda sopan antar permintaan

    print(f"\nSelesai: {ringkas['berhasil']} berhasil, {ringkas['gagal']} gagal, {ringkas['dibatalkan']} dibatalkan. "
          f"Hasil di folder '{config.OUTPUT_DIR}/'.")


if __name__ == "__main__":
    main()
