from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    identifier: str = Field(..., description="Username atau email akun")
    password: str = Field(..., min_length=4)


class RegisterEventGoersRequest(BaseModel):
    nama: str = Field(..., min_length=2, max_length=100)
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., max_length=150)
    password: str = Field(..., min_length=6)
    nomor_telepon: Optional[str] = Field(None, max_length=30)


class PengelolaResponse(BaseModel):
    id_pengelola: int
    peran: str
    nama: str
    nama_organisasi: Optional[str] = None
    username: str
    email: str
    nomor_telepon: Optional[str] = None
    aktif: bool

    class Config:
        from_attributes = True


class EventGoersResponse(BaseModel):
    id_event_goers: int
    nama: str
    username: str
    email: str
    nomor_telepon: Optional[str] = None
    dibuat_pada: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_type: str
    peran: Optional[str] = None
    user: dict