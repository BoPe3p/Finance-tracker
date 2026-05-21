from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional

from database import get_db
from models import Account, Transaction
from auth import get_current_user

router = APIRouter(prefix="/accounts", tags=["accounts"])


class AccountCreate(BaseModel):
    name: str
    type: str
    bank: str
    balance: float = 0.0
    color: str = "#3b82f6"


class AccountOut(BaseModel):
    id: int
    name: str
    type: str
    bank: str
    balance: float
    color: str
    fintoc_link_id: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("/", response_model=list[AccountOut])
def list_accounts(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Account).all()


@router.post("/", response_model=AccountOut, status_code=201)
def create_account(data: AccountCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    account = Account(**data.model_dump())
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.delete("/{account_id}", status_code=204)
def delete_account(account_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    account = db.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada.")
    db.delete(account)
    db.commit()


@router.get("/{account_id}/summary")
def account_summary(account_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Retorna balance + gasto del mes actual + últimas 30 transacciones del día."""
    account = db.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada.")

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    monthly_expenses = (
        db.query(func.sum(Transaction.amount))
        .filter(
            Transaction.account_id == account_id,
            Transaction.amount < 0,
            Transaction.date >= month_start,
        )
        .scalar()
        or 0
    )

    recent = (
        db.query(Transaction)
        .filter(Transaction.account_id == account_id)
        .order_by(Transaction.date.desc())
        .limit(30)
        .all()
    )

    return {
        "account_id": account_id,
        "balance": account.balance,
        "monthly_expenses": abs(monthly_expenses),
        "recent_transactions": [
            {
                "id": t.id,
                "date": t.date.isoformat(),
                "description": t.description,
                "amount": t.amount,
                "category": t.category.name if t.category else "Otro",
                "category_emoji": t.category.emoji if t.category else "📌",
            }
            for t in recent
        ],
    }
