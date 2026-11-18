from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token,
    get_current_user,
    get_password_hash,
    verify_password,
)
from app.database import get_db
from app.models import EventGoers, Pengelola
from app.schemas import (
    EventGoersResponse,
    LoginRequest,
    PengelolaResponse,
    RegisterEventGoersRequest,
    TokenResponse,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/pengelola/login", response_model=TokenResponse)
def login_pengelola(payload: LoginRequest, db: Session = Depends(get_db)):
    user = (
        db.query(Pengelola)
        .filter(
            or_(
                Pengelola.username == payload.identifier,
                Pengelola.email == payload.identifier,
            )
        )
        .first()
    )

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username/email atau password salah",
        )

    if not user.aktif:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun pengelola dinonaktifkan oleh Admin",
        )

    token = create_access_token(
        data={
            "sub": str(user.id_pengelola),
            "user_type": "pengelola",
            "peran": user.peran,
        }
    )

    return TokenResponse(
        access_token=token,
        user_type="pengelola",
        peran=user.peran,
        user=PengelolaResponse.model_validate(user).model_dump(),
    )


@router.post("/event-goers/register", response_model=EventGoersResponse, status_code=201)
def register_event_goers(payload: RegisterEventGoersRequest, db: Session = Depends(get_db)):
    existing = (
        db.query(EventGoers)
        .filter(
            or_(
                EventGoers.username == payload.username,
                EventGoers.email == payload.email,
            )
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username atau email sudah terdaftar",
        )

    new_user = EventGoers(
        nama=payload.nama,
        username=payload.username,
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        nomor_telepon=payload.nomor_telepon,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/event-goers/login", response_model=TokenResponse)
def login_event_goers(payload: LoginRequest, db: Session = Depends(get_db)):
    user = (
        db.query(EventGoers)
        .filter(
            or_(
                EventGoers.username == payload.identifier,
                EventGoers.email == payload.identifier,
            )
        )
        .first()
    )

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username/email atau password salah",
        )

    token = create_access_token(
        data={
            "sub": str(user.id_event_goers),
            "user_type": "event_goers",
            "peran": "visitor",
        }
    )

    return TokenResponse(
        access_token=token,
        user_type="event_goers",
        peran="visitor",
        user=EventGoersResponse.model_validate(user).model_dump(mode="json"),
    )


@router.get("/me")
def get_me(current: dict = Depends(get_current_user)):
    if current["user_type"] == "pengelola":
        data = PengelolaResponse.model_validate(current["instance"]).model_dump()
    else:
        data = EventGoersResponse.model_validate(current["instance"]).model_dump(mode="json")

    return {
        "user_type": current["user_type"],
        "peran": current["peran"],
        "user": data,
    }