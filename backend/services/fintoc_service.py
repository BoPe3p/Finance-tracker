"""
Servicio de Fintoc para conectar Banco Security.

Cómo funciona Fintoc:
1. El usuario hace clic en "Conectar banco" en el frontend
2. Se abre el Fintoc Widget (JavaScript de Fintoc) — una ventana segura de Fintoc
3. El usuario ingresa sus credenciales DIRECTAMENTE en Fintoc (nosotros nunca las vemos)
4. Fintoc retorna un 'link_token' al frontend
5. El frontend envía ese link_token a nuestro backend
6. Desde el backend, usamos el link_token para consultar saldos y movimientos via API

Requerimiento: Crear cuenta en https://app.fintoc.com/ y obtener FINTOC_SECRET_KEY
"""

import os
import fintoc
from datetime import datetime, timedelta

FINTOC_SECRET_KEY = os.getenv("FINTOC_SECRET_KEY", "")


def get_client():
    if not FINTOC_SECRET_KEY:
        raise ValueError(
            "FINTOC_SECRET_KEY no configurada. "
            "Crea una cuenta en https://app.fintoc.com/ y agrega la clave al archivo .env"
        )
    return fintoc.Client(FINTOC_SECRET_KEY)


def get_accounts_from_link(link_token: str) -> list[dict]:
    """
    Retorna las cuentas bancarias asociadas a un link_token de Fintoc.
    Cada cuenta tiene: id, name, type, currency, balance
    """
    client = get_client()
    link = client.links.get(link_token)
    accounts = []
    for account in link.accounts:
        accounts.append({
            "fintoc_id": account.id,
            "name": account.name,
            "type": account.type,
            "currency": account.currency,
            "balance": account.balance / 100 if account.balance else 0,  # Fintoc usa centavos
            "bank": account.institution.name if account.institution else "Banco Security",
        })
    return accounts


def get_movements(link_token: str, account_id: str, days_back: int = 30) -> list[dict]:
    """
    Retorna los movimientos de una cuenta bancaria en los últimos N días.
    Retorna lista de transacciones con: date, description, amount, type
    """
    client = get_client()
    link = client.links.get(link_token)
    since = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")

    movements = []
    for account in link.accounts:
        if account.id != account_id:
            continue
        for movement in account.movements(since=since):
            movements.append({
                "date": str(movement.post_date or movement.transaction_date),
                "description": movement.description or "",
                "amount": movement.amount / 100,  # Fintoc usa centavos
                "type": movement.type,
            })
    return movements
