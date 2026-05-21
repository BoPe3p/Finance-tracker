from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from models import Account, Transaction, Category
from auth import get_current_user
from services.bank_service import (
    sync_via_openbanking,
    extract_accounts_and_movements,
    parse_banco_security_csv,
    SUPPORTED_BANKS,
)
from services.categorizer import categorize

router = APIRouter(prefix="/bank", tags=["bank"])


class SyncRequest(BaseModel):
    rut: str
    password: str
    bank_id: str
    days_back: int = 30


@router.get("/supported")
def get_supported_banks(_=Depends(get_current_user)):
    """Lista de bancos con scraping automático vía open-banking-chile."""
    return [{"id": k, "name": v} for k, v in SUPPORTED_BANKS.items()]


@router.post("/sync")
def sync_bank(
    data: SyncRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """
    Sincroniza cuentas y movimientos usando open-banking-chile.
    Las credenciales NO se guardan: se usan solo durante el scraping y se descartan.
    """
    if data.bank_id not in SUPPORTED_BANKS:
        raise HTTPException(
            status_code=400,
            detail=f"Banco '{data.bank_id}' no soportado. Bancos disponibles: {list(SUPPORTED_BANKS.keys())}",
        )

    try:
        raw = sync_via_openbanking(data.rut, data.password, data.bank_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    bank_accounts, movements = extract_accounts_and_movements(raw, data.bank_id)

    # Crear o actualizar cuentas en la BD
    acc_map: dict[str, int] = {}
    for ba in bank_accounts:
        existing = db.query(Account).filter(
            Account.bank == ba["bank"], Account.name == ba["name"]
        ).first()
        if existing:
            existing.balance = ba["balance"]
            db.commit()
            acc_map[ba["bank_account_id"]] = existing.id
        else:
            new_acc = Account(
                name=ba["name"], type=ba["type"], bank=ba["bank"],
                balance=ba["balance"], color="#3b82f6",
            )
            db.add(new_acc)
            db.commit()
            db.refresh(new_acc)
            acc_map[ba["bank_account_id"]] = new_acc.id

    imported, skipped = _import_movements(movements, acc_map, db)
    return {
        "accounts_synced": len(bank_accounts),
        "imported": imported,
        "skipped": skipped,
        "bank": SUPPORTED_BANKS[data.bank_id],
    }


@router.post("/import-csv")
async def import_csv(
    account_id: int = Query(..., description="ID de la cuenta destino en la app"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """
    Importa movimientos desde un CSV exportado de Banco Security.

    Pasos para exportar desde Banco Security:
      1. Inicia sesión en bancosecurity.cl
      2. Ve a tu cuenta → Movimientos
      3. Filtra el rango de fechas
      4. Exportar → CSV
    """
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada. Créala primero en Config → Cuentas.")

    raw_bytes = await file.read()
    # utf-8-sig maneja el BOM que agrega Excel al exportar CSV
    content = raw_bytes.decode("utf-8-sig", errors="replace")

    try:
        movements = parse_banco_security_csv(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error leyendo el CSV: {e}")

    if not movements:
        raise HTTPException(
            status_code=400,
            detail="No se encontraron movimientos en el archivo. "
                   "Verifica que sea el CSV correcto de Banco Security.",
        )

    tagged = [{"account_bank_id": "target", **m} for m in movements]
    imported, skipped = _import_movements(tagged, {"target": account_id}, db)
    return {"imported": imported, "skipped": skipped, "bank": account.bank}


def _import_movements(movements: list[dict], acc_map: dict[str, int], db: Session) -> tuple[int, int]:
    imported = skipped = 0

    for mov in movements:
        acc_id = acc_map.get(mov.get("account_bank_id", ""))
        if acc_id is None:
            skipped += 1
            continue

        try:
            date = datetime.fromisoformat(mov["date"])
        except (ValueError, KeyError):
            skipped += 1
            continue

        duplicate = db.query(Transaction).filter(
            Transaction.account_id == acc_id,
            Transaction.description == mov["description"],
            Transaction.amount == mov["amount"],
            Transaction.date == date,
        ).first()
        if duplicate:
            skipped += 1
            continue

        cat_name = categorize(mov["description"])
        category = db.query(Category).filter(Category.name == cat_name).first()
        if not category:
            category = db.query(Category).filter(Category.name == "Otro").first()

        db.add(Transaction(
            date=date,
            description=mov["description"],
            amount=mov["amount"],
            account_id=acc_id,
            category_id=category.id if category else None,
        ))
        imported += 1

    db.commit()
    return imported, skipped
