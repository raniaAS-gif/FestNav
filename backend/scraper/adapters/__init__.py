"""Daftar adapter. Tambahkan adapter situs baru ke ADAPTERS."""
from .generic import GenericAdapter
from .situs_a import SitusA

ADAPTERS = [SitusA]   # adapter khusus situs, dicek berurutan


def pilih_adapter(url):
    for kelas in ADAPTERS:
        if kelas.cocok(url):
            return kelas()
    return GenericAdapter()   # cadangan: ekstraksi umum (JSON-LD, OpenGraph, heuristik)
