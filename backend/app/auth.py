import os
from datetime import datetime, timedelta, timezone
from typing import Union

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import EventGoers, Pengelola

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "festnav_default_secret_key_ubah_di_env")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 jam

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak valid atau sudah kedaluwarsa",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> dict:
    payload = decode_token(credentials.credentials)
    user_type = payload.get("user_type")
    user_id = payload.get("sub")

    if not user_type or not user_id:
        raise HTTPException(status_code=401, detail="Payload token tidak lengkap")

    if user_type == "pengelola":
        user = db.query(Pengelola).filter(Pengelola.id_pengelola == int(user_id)).first()
        if not user or not user.aktif:
            raise HTTPException(status_code=401, detail="Akun pengelola tidak ditemukan atau nonaktif")
        return {"user_type": "pengelola", "peran": user.peran, "instance": user}

    if user_type == "event_goers":
        user = db.query(EventGoers).filter(EventGoers.id_event_goers == int(user_id)).first()
        if not user:
            raise HTTPException(status_code=401, detail="Akun pengunjung tidak ditemukan")
        return {"user_type": "event_goers", "peran": "visitor", "instance": user}

    raise HTTPException(status_code=401, detail="Tipe pengguna tidak dikenali")


def get_current_pengelola(current: dict = Depends(get_current_user)) -> Pengelola:
    if current["user_type"] != "pengelola":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses khusus Admin atau Event Organizer",
        )
    return current["instance"]


def require_admin(pengelola: Pengelola = Depends(get_current_pengelola)) -> Pengelola:
    if pengelola.peran != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak: hanya Admin yang diizinkan",
        )
    return pengelola


def get_current_event_goers(current: dict = Depends(get_current_user)) -> EventGoers:
    if current["user_type"] != "event_goers":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses khusus akun pengunjung (Event Goers)",
        )
    return current["instance"]