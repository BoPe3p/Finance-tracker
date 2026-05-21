"""
App de Finanzas Personales — Backend Python (FastAPI)

Para correr:
    uvicorn main:app --reload --port 8000

La documentación interactiva de la API estará en:
    http://localhost:8000/docs
"""

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import models
from database import engine, SessionLocal, seed_categories
from routers import auth_router, accounts, transactions, categories, investments, bank_router, transfers

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Finanzas Personales API",
    description="Backend para la app de finanzas personales con open-banking-chile, Yahoo Finance y Fintual.",
    version="1.0.0",
)

# CORS: solo permite requests desde el frontend local (localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(accounts.router)
app.include_router(transactions.router)
app.include_router(categories.router)
app.include_router(investments.router)
app.include_router(bank_router.router)
app.include_router(transfers.router)


@app.on_event("startup")
def on_startup():
    """Al iniciar: crear tablas y agregar categorías por defecto si no existen."""
    db = SessionLocal()
    try:
        seed_categories(db)
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok", "message": "Backend de finanzas corriendo correctamente."}
