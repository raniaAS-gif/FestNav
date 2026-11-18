from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class MapBase(BaseModel):
    nama_map: str = Field(..., max_length=100)
    tipe_map: str = Field(default="outdoor", max_length=20)
    level_lantai: Optional[int] = None
    urutan: int = 0
    is_utama: bool = False
    status_map: str = Field(default="draft", max_length=20)
    garis_lintang_pusat: Optional[float] = None
    garis_bujur_pusat: Optional[float] = None
    gambar_layout: Optional[str] = None
    gambar_public_id: Optional[str] = None
    tampilkan_denah: bool = False
    barat_daya_lat: Optional[float] = None
    barat_daya_lng: Optional[float] = None
    timur_laut_lat: Optional[float] = None
    timur_laut_lng: Optional[float] = None
    rotasi: float = 0.0
    opasitas: float = Field(default=0.7, ge=0.0, le=1.0)


class MapCreate(MapBase):
    id_event: int


class MapUpdate(BaseModel):
    nama_map: Optional[str] = Field(default=None, max_length=100)
    tipe_map: Optional[str] = Field(default=None, max_length=20)
    level_lantai: Optional[int] = None
    urutan: Optional[int] = None
    is_utama: Optional[bool] = None
    status_map: Optional[str] = Field(default=None, max_length=20)
    garis_lintang_pusat: Optional[float] = None
    garis_bujur_pusat: Optional[float] = None
    gambar_layout: Optional[str] = None
    gambar_public_id: Optional[str] = None
    tampilkan_denah: Optional[bool] = None
    barat_daya_lat: Optional[float] = None
    barat_daya_lng: Optional[float] = None
    timur_laut_lat: Optional[float] = None
    timur_laut_lng: Optional[float] = None
    rotasi: Optional[float] = None
    opasitas: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class MapResponse(MapBase):
    id_map: int
    id_event: int
    dibuat_pada: datetime
    diubah_pada: datetime
    dipublish_pada: Optional[datetime] = None

    class Config:
        from_attributes = True