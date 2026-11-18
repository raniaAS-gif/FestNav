from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class GeoJSONPolygon(BaseModel):
    type: str = Field(default="Polygon", pattern="^Polygon$")
    coordinates: List[List[List[float]]]


class GeoJSONPoint(BaseModel):
    type: str = Field(default="Point", pattern="^Point$")
    coordinates: List[float]


class JenisFasilitasRingkas(BaseModel):
    kode: str
    nama_jenis: str
    warna: str

    class Config:
        from_attributes = True


class FasilitasBase(BaseModel):
    kode_jenis: str = Field(..., max_length=30)
    nama_fasilitas: str = Field(..., max_length=100)
    deskripsi: Optional[str] = None
    bentuk: Optional[GeoJSONPolygon] = None


class FasilitasCreate(FasilitasBase):
    id_map: int


class FasilitasUpdate(BaseModel):
    kode_jenis: Optional[str] = Field(default=None, max_length=30)
    nama_fasilitas: Optional[str] = Field(default=None, max_length=100)
    deskripsi: Optional[str] = None
    bentuk: Optional[GeoJSONPolygon] = None


class FasilitasResponse(BaseModel):
    id_fasilitas: int
    id_map: int
    kode_jenis: str
    nama_fasilitas: str
    deskripsi: Optional[str] = None
    bentuk: Optional[Dict[str, Any]] = None
    titik_pin: Optional[Dict[str, Any]] = None
    label_penanda: Optional[str] = None
    jenis: Optional[JenisFasilitasRingkas] = None

    class Config:
        from_attributes = True