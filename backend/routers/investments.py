from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

from database import get_db
from models import Investment
from auth import get_current_user
from services import yahoo_finance, fintual

router = APIRouter(prefix="/investments", tags=["investments"])

# Tickers que son fondos de Fintual (no van a Yahoo Finance)
FINTUAL_FUNDS = set(fintual.FUND_IDS.keys())


class InvestmentCreate(BaseModel):
    ticker: str
    name: str
    shares: float
    buy_price: float
    buy_date: datetime
    platform: Optional[str] = None
    notes: Optional[str] = None


@router.get("/")
def list_investments(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Lista todas las inversiones con su valor actual y rendimiento."""
    investments = db.query(Investment).all()
    result = []
    for inv in investments:
        if inv.ticker in FINTUAL_FUNDS:
            perf = fintual.calculate_fintual_performance(
                inv.ticker, inv.shares, inv.buy_price, inv.buy_date.strftime("%Y-%m-%d")
            )
        else:
            perf = yahoo_finance.calculate_performance(
                inv.ticker, inv.shares, inv.buy_price, inv.buy_date.strftime("%Y-%m-%d")
            )
        result.append({
            "id": inv.id,
            "ticker": inv.ticker,
            "name": inv.name,
            "shares": inv.shares,
            "buy_price": inv.buy_price,
            "buy_date": inv.buy_date.isoformat(),
            "platform": inv.platform,
            "notes": inv.notes,
            **perf,
        })
    return result


@router.post("/", status_code=201)
def add_investment(data: InvestmentCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    inv = Investment(**data.model_dump())
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return {"id": inv.id, "message": "Inversión agregada."}


@router.delete("/{investment_id}", status_code=204)
def delete_investment(investment_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    inv = db.get(Investment, investment_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Inversión no encontrada.")
    db.delete(inv)
    db.commit()


@router.get("/{investment_id}/performance")
def get_performance(investment_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Retorna el historial de rendimiento para el gráfico de línea."""
    inv = db.get(Investment, investment_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Inversión no encontrada.")

    if inv.ticker in FINTUAL_FUNDS:
        return fintual.calculate_fintual_performance(
            inv.ticker, inv.shares, inv.buy_price, inv.buy_date.strftime("%Y-%m-%d")
        )
    return yahoo_finance.calculate_performance(
        inv.ticker, inv.shares, inv.buy_price, inv.buy_date.strftime("%Y-%m-%d")
    )


@router.get("/portfolio/summary")
def portfolio_summary(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Resumen del portafolio completo: valor total, ganancia total."""
    investments = db.query(Investment).all()
    total_invested = 0.0
    total_current = 0.0

    for inv in investments:
        if inv.ticker in FINTUAL_FUNDS:
            current = fintual.get_fund_current_nav(inv.ticker)
            current_nav = current["nav"] if current else inv.buy_price
            total_invested += inv.shares * inv.buy_price
            total_current += inv.shares * current_nav
        else:
            price = yahoo_finance.get_current_price(inv.ticker) or inv.buy_price
            total_invested += inv.shares * inv.buy_price
            total_current += inv.shares * price

    gain = total_current - total_invested
    gain_pct = (gain / total_invested * 100) if total_invested > 0 else 0

    return {
        "total_invested": round(total_invested, 2),
        "total_current": round(total_current, 2),
        "total_gain": round(gain, 2),
        "total_gain_pct": round(gain_pct, 2),
        "count": len(investments),
    }
