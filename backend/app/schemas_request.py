from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class RequestItemResponse(BaseModel):
    id_item: int
    jenis_item: str
    id_map: Optional[int] = None

    class Config:
        from_attributes = True


class RiwayatRequestResponse(BaseModel):
    id_riwayat: int
    aksi: str
    catatan: Optional[str] = None
    id_pelaku: Optional[int] = None
    waktu: datetime

    class Config:
        from_attributes = True


class RequestPublishCreate(BaseModel):
    id_event: int
    catatan_pengirim: Optional[str] = None
    include_event: Optional[bool] = Field(
        default=None,
        description="True untuk mengajukan publish event. Jika None, otomatis True bila map_ids kosong.",
    )
    map_ids: Optional[List[int]] = Field(
        default=None,
        description="Daftar id_map yang diajukan publish terpisah. Kosongkan ([]) jika hanya mengajukan publish event.",
    )


class RequestPublishKeputusan(BaseModel):
    status_request: str = Field(..., pattern="^(disetujui|ditolak)$")
    catatan_admin: Optional[str] = None


class RequestPublishResponse(BaseModel):
    id_request: int
    id_event: int
    id_pengirim: Optional[int] = None
    catatan_pengirim: Optional[str] = None
    status_request: str
    catatan_admin: Optional[str] = None
    id_pemutus: Optional[int] = None
    waktu_dikirim: datetime
    waktu_diputuskan: Optional[datetime] = None
    event_diubah_setelah_ditolak: bool = False
    bisa_ubah_keputusan: bool = False
    items: List[RequestItemResponse] = []
    riwayat: List[RiwayatRequestResponse] = []

    class Config:
        from_attributes = True