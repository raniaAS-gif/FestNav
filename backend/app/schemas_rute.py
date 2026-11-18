from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class GeoJSONLineString(BaseModel):
    type: str = Field(default="LineString", pattern="^LineString$")
    coordinates: List[List[float]]


class RuteBase(BaseModel):
    nama_rute: Optional[str] = Field(default=None, max_length=100)
    titik_awal: Optional[str] = Field(default=None, max_length=100)
    titik_akhir: Optional[str] = Field(default=None, max_length=100)
    bentuk_jalur_rute: GeoJSONLineString
    jarak: Optional[float] = None
    akses_penggunaan: str = Field(default="umum", max_length=20)


class RuteCreate(RuteBase):
    id_map: int


class RuteUpdate(BaseModel):
    nama_rute: Optional[str] = Field(default=None, max_length=100)
    titik_awal: Optional[str] = Field(default=None, max_length=100)
    titik_akhir: Optional[str] = Field(default=None, max_length=100)
    bentuk_jalur_rute: Optional[GeoJSONLineString] = None
    jarak: Optional[float] = None
    akses_penggunaan: Optional[str] = Field(default=None, max_length=20)


class RuteResponse(BaseModel):
    id_rute: int
    id_map: int
    nama_rute: Optional[str] = None
    titik_awal: Optional[str] = None
    titik_akhir: Optional[str] = None
    bentuk_jalur_rute: Dict[str, Any]
    jarak: Optional[float] = None
    akses_penggunaan: str

    class Config:
        from_attributes = True