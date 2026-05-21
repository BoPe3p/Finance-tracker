"""
Servicio para la API pública de Fintual.

Fintual tiene una API REST pública (sin autenticación) para consultar precios históricos
de sus fondos. Útil para ver el rendimiento del Fondo Risky Norris y otros.

Documentación: https://fintual.cl/api-docs
"""

import requests
from datetime import datetime, date, timedelta

FINTUAL_API = "https://fintual.cl/api"

# IDs de los fondos principales de Fintual
# Se pueden obtener con GET /asset_providers/1/real_assets
FUND_IDS = {
    "risky-norris": 188,   # Fondo Risky Norris (agresivo)
    "clooney": 187,        # George Clooney (moderado)
    "pitt": 186,           # Brad Pitt (conservador)
    "einstein": 185,       # Albert Einstein (muy conservador)
}


def get_fund_current_nav(fund_key: str) -> dict | None:
    """
    Retorna el valor actual (NAV = Net Asset Value) de la cuota del fondo.
    fund_key: 'risky-norris', 'clooney', 'pitt', o 'einstein'
    """
    fund_id = FUND_IDS.get(fund_key)
    if not fund_id:
        return None
    try:
        today = date.today().isoformat()
        yesterday = (date.today() - timedelta(days=3)).isoformat()
        url = f"{FINTUAL_API}/real_assets/{fund_id}/days"
        response = requests.get(url, params={"from_date": yesterday, "to_date": today}, timeout=10)
        response.raise_for_status()
        data = response.json().get("data", [])
        if not data:
            return None
        latest = data[-1]["attributes"]
        return {
            "fund": fund_key,
            "date": latest["date"],
            "nav": float(latest["nav"]),
            "cumulative_return": float(latest.get("cumulative_return", 0)),
        }
    except Exception:
        return None


def get_fund_historical_nav(fund_key: str, since: str) -> list[dict]:
    """
    Retorna el historial de valor cuota desde 'since' (formato YYYY-MM-DD) hasta hoy.
    Útil para el gráfico de línea de inversión en Fintual.
    """
    fund_id = FUND_IDS.get(fund_key)
    if not fund_id:
        return []
    try:
        today = date.today().isoformat()
        url = f"{FINTUAL_API}/real_assets/{fund_id}/days"
        response = requests.get(url, params={"from_date": since, "to_date": today}, timeout=15)
        response.raise_for_status()
        data = response.json().get("data", [])
        return [
            {"date": item["attributes"]["date"], "nav": float(item["attributes"]["nav"])}
            for item in data
        ]
    except Exception:
        return []


def calculate_fintual_performance(fund_key: str, units: float, buy_nav: float, buy_date: str) -> dict:
    """
    Calcula el rendimiento de una inversión en un fondo de Fintual.

    units: número de cuotas compradas
    buy_nav: valor de la cuota al momento de compra
    buy_date: fecha de compra (YYYY-MM-DD)
    """
    current = get_fund_current_nav(fund_key)
    history = get_fund_historical_nav(fund_key, buy_date)

    current_nav = current["nav"] if current else buy_nav
    invested_value = units * buy_nav
    current_value = units * current_nav
    gain_loss = current_value - invested_value
    gain_loss_pct = (gain_loss / invested_value * 100) if invested_value > 0 else 0

    investment_line = [
        {"date": point["date"], "value": round(units * point["nav"], 2)}
        for point in history
    ]

    return {
        "fund": fund_key,
        "units": units,
        "buy_nav": buy_nav,
        "current_nav": round(current_nav, 4),
        "invested_value": round(invested_value, 2),
        "current_value": round(current_value, 2),
        "gain_loss": round(gain_loss, 2),
        "gain_loss_pct": round(gain_loss_pct, 2),
        "investment_line": investment_line,
    }
