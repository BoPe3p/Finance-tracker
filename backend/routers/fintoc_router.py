from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models import Account, Transaction, Category
from auth import get_current_user
from services.fintoc_service import get_accounts_from_link, get_movements
from services.categorizer import categorize

router = APIRouter(prefix="/fintoc", tags=["fintoc"])


class LinkRequest(BaseModel):
    link_token: str


class SyncRequest(BaseModel):
    link_token: str
    account_fintoc_id: str
    days_back: int = 30


@router.post("/connect")
def connect_bank(data: LinkRequest, db: Session = Depends(get_db), _=Depends(get_current_user)):
    """
    Recibe el link_token del Fintoc Widget y crea las cuentas en la BD.
    Llama esto después de que el usuario completa el flujo del Widget.
    """
    try:
        fintoc_accounts = get_accounts_from_link(data.link_token)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error conectando con Fintoc: {e}")

    created = []
    for fa in fintoc_accounts:
        existing = db.query(Account).filter(Account.fintoc_link_id == fa["fintoc_id"]).first()
        if existing:
            existing.balance = fa["balance"]
            db.commit()
            created.append({"id": existing.id, "name": existing.name, "status": "updated"})
        else:
            account = Account(
                name=fa["name"],
                type=fa["type"],
                bank=fa["bank"],
                balance=fa["balance"],
                fintoc_link_id=fa["fintoc_id"],
                color="#3b82f6",
            )
            db.add(account)
            db.commit()
            db.refresh(account)
            created.append({"id": account.id, "name": account.name, "status": "created"})

    return {"accounts": created, "link_token": data.link_token}


@router.post("/sync")
def sync_transactions(data: SyncRequest, db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Sincroniza las transacciones de una cuenta desde Fintoc."""
    account = db.query(Account).filter(Account.fintoc_link_id == data.account_fintoc_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada. Conecta primero el banco.")

    try:
        movements = get_movements(data.link_token, data.account_fintoc_id, data.days_back)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sincronizando: {e}")

    imported = 0
    skipped = 0
    for mov in movements:
        from datetime import datetime
        date = datetime.fromisoformat(mov["date"])

        # Evitar duplicados: misma fecha + descripción + monto en la misma cuenta
        duplicate = db.query(Transaction).filter(
            Transaction.account_id == account.id,
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

        transaction = Transaction(
            date=date,
            description=mov["description"],
            amount=mov["amount"],
            account_id=account.id,
            category_id=category.id if category else None,
        )
        db.add(transaction)
        imported += 1

    db.commit()
    return {"imported": imported, "skipped": skipped, "bank": account.bank}
