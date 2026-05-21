from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional

from database import get_db
from models import Transaction, Account, Category
from auth import get_current_user
from services.categorizer import categorize

router = APIRouter(prefix="/transactions", tags=["transactions"])


class TransactionCreate(BaseModel):
    date: datetime
    description: str
    amount: float
    account_id: int
    category_id: Optional[int] = None


class TransactionOut(BaseModel):
    id: int
    date: datetime
    description: str
    amount: float
    account_id: int
    account_name: Optional[str] = None
    category_id: Optional[int]
    category_name: Optional[str] = None
    category_emoji: Optional[str] = None

    model_config = {"from_attributes": True}


@router.get("/")
def list_transactions(
    search: str = Query(""),
    account_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    limit: int = Query(200),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    query = db.query(Transaction)
    if search:
        query = query.filter(Transaction.description.ilike(f"%{search}%"))
    if account_id:
        query = query.filter(Transaction.account_id == account_id)
    if category_id:
        query = query.filter(Transaction.category_id == category_id)

    transactions = query.order_by(Transaction.date.desc()).limit(limit).all()

    return [
        {
            "id": t.id,
            "date": t.date.isoformat(),
            "description": t.description,
            "amount": t.amount,
            "account_id": t.account_id,
            "account_name": t.account.name if t.account else None,
            "category_id": t.category_id,
            "category_name": t.category.name if t.category else "Otro",
            "category_emoji": t.category.emoji if t.category else "📌",
        }
        for t in transactions
    ]


@router.post("/", status_code=201)
def create_transaction(data: TransactionCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    # Auto-categorizar si no se provee categoría
    if data.category_id is None:
        cat_name = categorize(data.description)
        category = db.query(Category).filter(Category.name == cat_name).first()
        if not category:
            category = db.query(Category).filter(Category.name == "Otro").first()
        data = data.model_copy(update={"category_id": category.id if category else None})

    transaction = Transaction(**data.model_dump())
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return {"id": transaction.id, "message": "Transacción creada."}


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(transaction_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    t = db.get(Transaction, transaction_id)
    if not t:
        raise HTTPException(status_code=404, detail="Transacción no encontrada.")
    db.delete(t)
    db.commit()


@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """
    Datos para el dashboard:
    - Gasto mes actual
    - Comparación con mes anterior
    - Balance total entre cuentas
    - Distribución por categoría
    - Últimas 5 transacciones
    - Heatmap anual (gastos por día)
    """
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    if now.month == 1:
        prev_month_start = now.replace(year=now.year - 1, month=12, day=1, hour=0, minute=0, second=0, microsecond=0)
        prev_month_end = month_start
    else:
        prev_month_start = now.replace(month=now.month - 1, day=1, hour=0, minute=0, second=0, microsecond=0)
        prev_month_end = month_start

    current_month_expenses = (
        db.query(func.sum(Transaction.amount))
        .filter(Transaction.amount < 0, Transaction.date >= month_start)
        .scalar() or 0
    )
    prev_month_expenses = (
        db.query(func.sum(Transaction.amount))
        .filter(Transaction.amount < 0, Transaction.date >= prev_month_start, Transaction.date < prev_month_end)
        .scalar() or 0
    )

    total_balance = db.query(func.sum(Account.balance)).scalar() or 0

    # Distribución por categoría (mes actual)
    category_data = (
        db.query(Category.name, Category.emoji, func.sum(Transaction.amount).label("total"))
        .join(Transaction)
        .filter(Transaction.amount < 0, Transaction.date >= month_start)
        .group_by(Category.id)
        .order_by(func.sum(Transaction.amount))
        .all()
    )

    # Últimas 5 transacciones
    last_5 = (
        db.query(Transaction)
        .order_by(Transaction.date.desc())
        .limit(5)
        .all()
    )

    # Heatmap anual
    year_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    heatmap_rows = (
        db.query(func.date(Transaction.date).label("day"), func.sum(Transaction.amount).label("total"))
        .filter(Transaction.amount < 0, Transaction.date >= year_start)
        .group_by(func.date(Transaction.date))
        .all()
    )

    return {
        "current_month_expenses": abs(current_month_expenses),
        "prev_month_expenses": abs(prev_month_expenses),
        "month_change_pct": round(
            ((abs(current_month_expenses) - abs(prev_month_expenses)) / abs(prev_month_expenses) * 100)
            if prev_month_expenses else 0,
            1,
        ),
        "total_balance": total_balance,
        "account_count": db.query(Account).count(),
        "categories": [
            {"name": row.name, "emoji": row.emoji, "total": abs(row.total)}
            for row in category_data
        ],
        "last_transactions": [
            {
                "id": t.id,
                "date": t.date.isoformat(),
                "description": t.description,
                "amount": t.amount,
                "account_name": t.account.name if t.account else "",
                "category_name": t.category.name if t.category else "Otro",
                "category_emoji": t.category.emoji if t.category else "📌",
            }
            for t in last_5
        ],
        "heatmap": [
            {"date": str(row.day), "amount": abs(row.total)}
            for row in heatmap_rows
        ],
    }
