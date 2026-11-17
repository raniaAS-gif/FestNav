from geoalchemy2 import Geometry
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Computed,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.database import Base


class Pengelola(Base):
    __tablename__ = "pengelola"

    id_pengelola = Column(Integer, primary_key=True, index=True)
    peran = Column(String(20), nullable=False)
    nama = Column(String(100), nullable=False)
    nama_organisasi = Column(String(150), nullable=True)
    deskripsi = Column(Text, nullable=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=False)
    nomor_telepon = Column(String(30), nullable=True)
    aktif = Column(Boolean, nullable=False, default=True)
    dibuat_pada = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    diubah_pada = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    events = relationship("Event", back_populates="organizer")
    log_aktivitas = relationship("LogAktivitas", back_populates="pengelola")


class EventGoers(Base):
    __tablename__ = "event_goers"

    id_event_goers = Column(Integer, primary_key=True, index=True)
    nama = Column(String(100), nullable=False)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=False)
    nomor_telepon = Column(String(30), nullable=True)
    dibuat_pada = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    favorit = relationship("Favorit", back_populates="event_goers", cascade="all, delete-orphan")


class Event(Base):
    __tablename__ = "event"

    id_event = Column(Integer, primary_key=True, index=True)
    id_organizer = Column(Integer, ForeignKey("pengelola.id_pengelola", ondelete="SET NULL"), nullable=True)
    nama_event = Column(String(150), nullable=False)
    deskripsi = Column(Text, nullable=True)
    tanggal_mulai = Column(Date, nullable=True)
    tanggal_selesai = Column(Date, nullable=True)
    lokasi = Column(String(250), nullable=True)
    garis_lintang = Column(Float, nullable=True)
    garis_bujur = Column(Float, nullable=True)
    jenis_event = Column(String(50), nullable=True)
    tipe_lokasi = Column(String(20), nullable=False, default="outdoor")
    mode_event = Column(String(20), nullable=False, default="interaktif")
    sumber = Column(String(20), nullable=False, default="manual")
    status_event = Column(String(20), nullable=False, default="draft")
    poster_url = Column(Text, nullable=True)
    poster_public_id = Column(Text, nullable=True)
    dibuat_pada = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    diubah_pada = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    dipublish_pada = Column(DateTime(timezone=True), nullable=True)

    organizer = relationship("Pengelola", back_populates="events")
    gambar_event = relationship("GambarEvent", back_populates="event", cascade="all, delete-orphan")
    maps = relationship("Map", back_populates="event", cascade="all, delete-orphan")
    favorit = relationship("Favorit", back_populates="event", cascade="all, delete-orphan")
    request_publish = relationship("RequestPublish", back_populates="event", cascade="all, delete-orphan")
    sumber_scraping = relationship("SumberScraping", back_populates="event")


class Favorit(Base):
    __tablename__ = "favorit"

    id_event_goers = Column(Integer, ForeignKey("event_goers.id_event_goers", ondelete="CASCADE"), primary_key=True)
    id_event = Column(Integer, ForeignKey("event.id_event", ondelete="CASCADE"), primary_key=True)
    dibuat_pada = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    event_goers = relationship("EventGoers", back_populates="favorit")
    event = relationship("Event", back_populates="favorit")


class Map(Base):
    __tablename__ = "map"

    id_map = Column(Integer, primary_key=True, index=True)
    id_event = Column(Integer, ForeignKey("event.id_event", ondelete="CASCADE"), nullable=False)
    nama_map = Column(String(100), nullable=False)
    tipe_map = Column(String(20), nullable=False, default="outdoor")
    level_lantai = Column(Integer, nullable=True)
    urutan = Column(Integer, nullable=False, default=0)
    is_utama = Column(Boolean, nullable=False, default=False)
    status_map = Column(String(20), nullable=False, default="draft")
    garis_lintang_pusat = Column(Float, nullable=True)
    garis_bujur_pusat = Column(Float, nullable=True)
    gambar_layout = Column(Text, nullable=True)
    gambar_public_id = Column(Text, nullable=True)
    tampilkan_denah = Column(Boolean, nullable=False, default=False)
    barat_daya_lat = Column(Float, nullable=True)
    barat_daya_lng = Column(Float, nullable=True)
    timur_laut_lat = Column(Float, nullable=True)
    timur_laut_lng = Column(Float, nullable=True)
    rotasi = Column(Float, nullable=False, default=0.0)
    opasitas = Column(Float, nullable=False, default=0.7)
    dibuat_pada = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    diubah_pada = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    dipublish_pada = Column(DateTime(timezone=True), nullable=True)

    event = relationship("Event", back_populates="maps")
    fasilitas = relationship("Fasilitas", back_populates="map", cascade="all, delete-orphan")
    rute = relationship("Rute", back_populates="map", cascade="all, delete-orphan")


class JenisFasilitas(Base):
    __tablename__ = "jenis_fasilitas"

    kode = Column(String(30), primary_key=True, index=True)
    nama_jenis = Column(String(60), nullable=False)
    deskripsi_default = Column(Text, nullable=True)
    warna = Column(String(9), nullable=False, default="#3B82F6")
    urutan = Column(Integer, nullable=False, default=0)
    aktif = Column(Boolean, nullable=False, default=True)

    fasilitas = relationship("Fasilitas", back_populates="jenis")


class Fasilitas(Base):
    __tablename__ = "fasilitas"

    id_fasilitas = Column(Integer, primary_key=True, index=True)
    id_map = Column(Integer, ForeignKey("map.id_map", ondelete="CASCADE"), nullable=False)
    kode_jenis = Column(String(30), ForeignKey("jenis_fasilitas.kode", onupdate="CASCADE"), nullable=False)
    nama_fasilitas = Column(String(100), nullable=False)
    deskripsi = Column(Text, nullable=True)
    bentuk = Column(Geometry("POLYGON", srid=4326), nullable=True)
    titik_pin = Column(
        Geometry("POINT", srid=4326),
        Computed("ST_PointOnSurface(bentuk)", persisted=True),
    )
    label_penanda = Column(
        String(4),
        Computed("inisial_label(nama_fasilitas)", persisted=True),
    )

    map = relationship("Map", back_populates="fasilitas")
    jenis = relationship("JenisFasilitas", back_populates="fasilitas")


class Rute(Base):
    __tablename__ = "rute"

    id_rute = Column(Integer, primary_key=True, index=True)
    id_map = Column(Integer, ForeignKey("map.id_map", ondelete="CASCADE"), nullable=False)
    nama_rute = Column(String(100), nullable=True)
    titik_awal = Column(String(100), nullable=True)
    titik_akhir = Column(String(100), nullable=True)
    bentuk_jalur_rute = Column(Geometry("LINESTRING", srid=4326), nullable=False)
    jarak = Column(Float, nullable=True)
    akses_penggunaan = Column(String(20), nullable=False, default="umum")

    map = relationship("Map", back_populates="rute")


class GambarEvent(Base):
    __tablename__ = "gambar_event"

    id_gambar = Column(Integer, primary_key=True, index=True)
    id_event = Column(Integer, ForeignKey("event.id_event", ondelete="CASCADE"), nullable=False)
    url_gambar = Column(Text, nullable=False)
    public_id = Column(Text, nullable=True)
    jenis_gambar = Column(String(30), nullable=False, default="lainnya")
    keterangan = Column(Text, nullable=True)
    waktu_diunggah = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    event = relationship("Event", back_populates="gambar_event")


class SumberScraping(Base):
    __tablename__ = "sumber_scraping"

    id_scraping = Column(Integer, primary_key=True, index=True)
    id_event = Column(Integer, ForeignKey("event.id_event", ondelete="SET NULL"), nullable=True)
    dipicu_oleh = Column(Integer, ForeignKey("pengelola.id_pengelola", ondelete="SET NULL"), nullable=True)
    nama_sumber = Column(String(100), nullable=True)
    url_sumber = Column(Text, nullable=False)
    status_job = Column(String(20), nullable=False, default="antri")
    tahap_saat_ini = Column(String(50), nullable=True)
    log_proses = Column(Text, nullable=True)
    pesan_error = Column(Text, nullable=True)
    hasil_mentah = Column(JSONB, nullable=True)
    status_review = Column(String(30), nullable=False, default="menunggu_review")
    waktu_scraping = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    waktu_selesai = Column(DateTime(timezone=True), nullable=True)
    update_terakhir = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    event = relationship("Event", back_populates="sumber_scraping")
    pemicu = relationship("Pengelola")


class RequestPublish(Base):
    __tablename__ = "request_publish"

    id_request = Column(Integer, primary_key=True, index=True)
    id_event = Column(Integer, ForeignKey("event.id_event", ondelete="CASCADE"), nullable=False)
    id_pengirim = Column(Integer, ForeignKey("pengelola.id_pengelola", ondelete="SET NULL"), nullable=True)
    catatan_pengirim = Column(Text, nullable=True)
    status_request = Column(String(20), nullable=False, default="menunggu")
    catatan_admin = Column(Text, nullable=True)
    id_pemutus = Column(Integer, ForeignKey("pengelola.id_pengelola", ondelete="SET NULL"), nullable=True)
    waktu_dikirim = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    waktu_diputuskan = Column(DateTime(timezone=True), nullable=True)

    event = relationship("Event", back_populates="request_publish")
    pengirim = relationship("Pengelola", foreign_keys=[id_pengirim])
    pemutus = relationship("Pengelola", foreign_keys=[id_pemutus])
    items = relationship("RequestItem", back_populates="request", cascade="all, delete-orphan")
    riwayat = relationship("RiwayatRequest", back_populates="request", cascade="all, delete-orphan")


class RequestItem(Base):
    __tablename__ = "request_item"

    id_item = Column(Integer, primary_key=True, index=True)
    id_request = Column(Integer, ForeignKey("request_publish.id_request", ondelete="CASCADE"), nullable=False)
    jenis_item = Column(String(10), nullable=False)
    id_map = Column(Integer, ForeignKey("map.id_map", ondelete="CASCADE"), nullable=True)

    request = relationship("RequestPublish", back_populates="items")
    map = relationship("Map")


class RiwayatRequest(Base):
    __tablename__ = "riwayat_request"

    id_riwayat = Column(Integer, primary_key=True, index=True)
    id_request = Column(Integer, ForeignKey("request_publish.id_request", ondelete="CASCADE"), nullable=False)
    aksi = Column(String(30), nullable=False)
    catatan = Column(Text, nullable=True)
    id_pelaku = Column(Integer, ForeignKey("pengelola.id_pengelola", ondelete="SET NULL"), nullable=True)
    waktu = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    request = relationship("RequestPublish", back_populates="riwayat")
    pelaku = relationship("Pengelola")


class LogAktivitas(Base):
    __tablename__ = "log_aktivitas"

    id_log = Column(BigInteger, primary_key=True, index=True)
    id_pengelola = Column(Integer, ForeignKey("pengelola.id_pengelola", ondelete="SET NULL"), nullable=True)
    aksi = Column(String(50), nullable=False)
    objek_tipe = Column(String(30), nullable=True)
    objek_id = Column(Integer, nullable=True)
    deskripsi = Column(Text, nullable=True)
    waktu = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    pengelola = relationship("Pengelola", back_populates="log_aktivitas")