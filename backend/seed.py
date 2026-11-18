from passlib.context import CryptContext

from app.database import SessionLocal
from app.models import Pengelola

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def seed():
    db = SessionLocal()
    try:
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
                "peran": "event_organizer",
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
                print(f"[SKIP] Akun '{data['username']}' sudah ada.")
                continue

            db.add(Pengelola(**data))
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