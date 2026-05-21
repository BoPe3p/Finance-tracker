"""
Servicio de Yahoo Finance usando la biblioteca yfinance.

Qué hace yfinance:
- Descarga datos históricos de precios de acciones de Yahoo Finance
- Gratis, sin API key
- Soporta acciones USA (AAPL), Chile (COPEC.SN), ETFs (VOO), crypto (BTC-USD)
"""

from datetime import datetime, date
import yfinance as yf


def get_current_price(ticker: str) -> float | None:
    """Retorna el precio actual de un ticker. None si no se encuentra."""
    try:
        stock = yf.Ticker(ticker)
        info = stock.fast_info
        return float(info.last_price)
    except Exception:
        return None


def get_ticker_name(ticker: str) -> str:
    """Retorna el nombre de la empresa del ticker (ej: AAPL → Apple Inc.)"""
    try:
        stock = yf.Ticker(ticker)
        return stock.info.get("longName") or stock.info.get("shortName") or ticker
    except Exception:
        return ticker


def get_historical_prices(ticker: str, start_date: str) -> list[dict]:
    """
    Retorna el historial de precios de cierre desde start_date hasta hoy.
    start_date formato: "YYYY-MM-DD"
    Retorna lista de {"date": "YYYY-MM-DD", "price": float}
    """
    try:
        stock = yf.Ticker(ticker)
        history = stock.history(start=start_date)
        return [
            {"date": str(idx.date()), "price": round(float(row["Close"]), 2)}
            for idx, row in history.iterrows()
        ]
    except Exception:
        return []


def calculate_performance(
    ticker: str,
    shares: float,
    buy_price: float,
    buy_date: str,
) -> dict:
    """
    Calcula el rendimiento de una inversión.

    Retorna:
    - current_price: precio actual
    - current_value: valor actual total (shares × current_price)
    - invested_value: lo que invertiste (shares × buy_price)
    - gain_loss: ganancia o pérdida en $
    - gain_loss_pct: ganancia o pérdida en %
    - history: lista de puntos para el gráfico de línea
    - if_bought_today: cuánto ganarías/perderías si hubieras comprado hoy
    """
    current_price = get_current_price(ticker) or buy_price
    history = get_historical_prices(ticker, buy_date)

    invested_value = shares * buy_price
    current_value = shares * current_price
    gain_loss = current_value - invested_value
    gain_loss_pct = (gain_loss / invested_value * 100) if invested_value > 0 else 0

    # Si compraras hoy con el mismo monto, cuántas acciones obtendrías
    # y cuánto valdrían (trivialmente igual al monto invertido, pero sirve para contexto)
    shares_if_bought_today = invested_value / current_price if current_price > 0 else 0

    # Línea "mi inversión": valor de mis shares en cada fecha histórica
    investment_line = [
        {"date": point["date"], "value": round(shares * point["price"], 2)}
        for point in history
    ]

    return {
        "ticker": ticker,
        "shares": shares,
        "buy_price": buy_price,
        "current_price": round(current_price, 2),
        "invested_value": round(invested_value, 2),
        "current_value": round(current_value, 2),
        "gain_loss": round(gain_loss, 2),
        "gain_loss_pct": round(gain_loss_pct, 2),
        "shares_if_bought_today": round(shares_if_bought_today, 4),
        "investment_line": investment_line,
    }
