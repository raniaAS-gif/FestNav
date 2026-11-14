from passlib.context import CryptContext
from sqlalchemy import text

from app.database import SessionLocal
from app.models import Pengelola

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def detect_organizer_role(db) -> str:
    """Membaca CHECK constraint tabel pengelola agar nilai peran 100% sesuai."""
    row = db.execute(
        text(
            """
            SELECT pg_get_constraintdef(c.oid)
            FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            WHERE t.relname = 'pengelola' AND c.contype = 'c'
            """
        )
    ).scalar()
    if row and "event_organizer" in row:
        return "event_organizer"
    return "organizer"


def seed():
    db = SessionLocal()
    try:
        organizer_role = detect_organizer_role(db)

        akun_awal = [
            {
                "peran": "admin",
                "nama": "Admin FestNav",
                "nama_organisasi": "FestNav Core Team",
                "deskripsi": "Administrator utama platform FestNav.",
                "username": "admin",
                "email": "admin@festnav.id",
                "password_hash": pwd_context.hash("admin123"),
                "nomor_telepon": "081200000001",
                "aktif": True,
            },
            {
                "peran": organizer_role,
                "nama": "Organizer Bali Fest",
                "nama_organisasi": "Nusantara Event Organizer",
                "deskripsi": "Penyelenggara festival seni, musik, dan budaya.",
                "username": "organizer1",
                "email": "organizer@festnav.id",
                "password_hash": pwd_context.hash("organizer123"),
                "nomor_telepon": "081200000002",
                "aktif": True,
            },
        ]

        for data in akun_awal:
            existing = db.query(Pengelola).filter(Pengelola.username == data["username"]).first()
            if existing:
                print(f"[SKIP] Akun '{data['username']}' sudah ada di database.")
                continue

            pengelola = Pengelola(**data)
            db.add(pengelola)
            print(f"[OK] Membuat akun '{data['username']}' (peran: {data['peran']})")

        db.commit()
        print("Seeding selesai!")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Gagal melakukan seeding: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()