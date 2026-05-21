from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./finanzas.db")

# check_same_thread=False es necesario para SQLite con FastAPI (múltiples threads)
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """Dependency de FastAPI: abre y cierra la sesión de BD por cada request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


DEFAULT_CATEGORIES = [
    ("Supermercado", "🛒"),
    ("Transporte", "🚗"),
    ("Entretenimiento", "🎬"),
    ("Salud", "💊"),
    ("Restaurant", "🍔"),
    ("Servicios", "💡"),
    ("Hogar", "🏠"),
    ("Educación", "📚"),
    ("Sueldo", "💰"),
    ("Transferencia", "↔️"),
    ("Otro", "📌"),
]


def seed_categories(db):
    from models import Category
    for name, emoji in DEFAULT_CATEGORIES:
        exists = db.query(Category).filter(Category.name == name).first()
        if not exists:
            db.add(Category(name=name, emoji=emoji))
    db.commit()
