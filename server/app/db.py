import os
import secrets
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()


BASE_DIR = Path(__file__).resolve().parent.parent
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dev.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
    future=True,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

Base = declarative_base()


def generate_id() -> str:
    """Return a short, URL-safe identifier similar to cuid/nanoid."""
    return secrets.token_urlsafe(12)


def now() -> datetime:
    return datetime.utcnow()


def create_db_and_tables() -> None:
    from . import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    ensure_trash_photo_columns()


def ensure_trash_photo_columns() -> None:
    """SQLite helper to add newly introduced columns when existing DB already exists."""
    with engine.connect() as conn:
        existing_cols = {
            row[1] for row in conn.execute(text("PRAGMA table_info('trash_photos')"))
        }
        migrations = []
        if "has_trash" not in existing_cols:
            migrations.append("ALTER TABLE trash_photos ADD COLUMN has_trash BOOLEAN")
        if "trash_count" not in existing_cols:
            migrations.append("ALTER TABLE trash_photos ADD COLUMN trash_count INTEGER")
        if "max_trash_confidence" not in existing_cols:
            migrations.append("ALTER TABLE trash_photos ADD COLUMN max_trash_confidence FLOAT")
        if "yolo_raw" not in existing_cols:
            migrations.append("ALTER TABLE trash_photos ADD COLUMN yolo_raw JSON")
        if migrations:
            for sql in migrations:
                conn.execute(text(sql))
            conn.commit()


@contextmanager
def get_db():
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
