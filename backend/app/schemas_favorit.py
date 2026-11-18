from datetime import datetime

from pydantic import BaseModel

from app.schemas_event import EventResponse


class FavoritItemResponse(BaseModel):
    """Satu item di halaman favorit: data event lengkap + kapan ditandai favorit."""

    difavoritkan_pada: datetime
    event: EventResponse


class FavoritStatusResponse(BaseModel):
    id_event: int
    is_favorit: bool
    difavoritkan_pada: datetime | None = None


class FavoritIdsResponse(BaseModel):
    id_event: list[int]
    total: int
