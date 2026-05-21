from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import requests

from database import get_db
from models import Transfer
from auth import get_current_user

router = APIRouter(prefix="/transfers", tags=["transfers"])

BANKS = [
    {"id": "banco_security", "name": "Banco Security"},
    {"id": "banco_estado", "name": "BancoEstado"},
    {"id": "banco_chile", "name": "Banco de Chile"},
    {"id": "santander", "name": "Santander"},
    {"id": "bci", "name": "BCI"},
    {"id": "itau", "name": "Itaú"},
    {"id": "scotiabank", "name": "Scotiabank"},
    {"id": "falabella", "name": "Banco Falabella"},
    {"id": "ripley", "name": "Banco Ripley"},
    {"id": "consorcio", "name": "Banco Consorcio"},
    {"id": "bice", "name": "BICE"},
]

# Códigos de banco para el deeplink al sistema TEF de Banco Security
BANK_CODES = {
    "banco_security": "Security",
    "banco_estado": "BancoEstado",
    "banco_chile": "BancoChile",
    "santander": "Santander",
    "bci": "BCI",
    "itau": "Itau",
    "scotiabank": "Scotiabank",
}


class TransferRequest(BaseModel):
    recipient_rut: str
    recipient_bank: str
    amount: float
    message: Optional[str] = ""
    recipient_account_type: str = "corriente"  # corriente, vista, ahorro


def lookup_rut_name(rut: str) -> str | None:
    """
    Intenta obtener el nombre asociado a un RUT usando la API pública del SII.
    Retorna None si no se puede obtener.
    """
    try:
        clean_rut = rut.replace(".", "").replace("-", "")
        # API pública del SII (contribuyentes)
        url = f"https://zeus.sii.cl/cvc_cgi/stc/getstc?rut={clean_rut[:-1]}&dv={clean_rut[-1]}"
        response = requests.get(url, timeout=5)
        if response.ok:
            # El SII devuelve HTML, extraemos el nombre si existe
            text = response.text
            if "razon_social" in text.lower() or "nombre" in text.lower():
                return None  # Parseo complejo, dejamos como None por ahora
    except Exception:
        pass
    return None


@router.get("/banks")
def list_banks(_=Depends(get_current_user)):
    return BANKS


@router.post("/prepare")
def prepare_transfer(data: TransferRequest, _=Depends(get_current_user)):
    """
    Valida los datos y retorna un resumen + URL deeplink para abrir la banca online.
    No ejecuta la transferencia — el usuario la confirma en el banco.
    """
    # Validar RUT básico (largo correcto)
    clean = data.recipient_rut.replace(".", "").replace("-", "")
    if len(clean) < 8 or len(clean) > 9:
        return {"valid": False, "error": "RUT inválido. Formato esperado: 12.345.678-9"}

    recipient_name = lookup_rut_name(data.recipient_rut)

    # Generar deeplink a banca en línea de Banco Security
    # Banco Security no tiene deeplink oficial público, pero abrimos la URL de transferencias
    deeplink = "https://www.bancosecurity.cl/personas/transferencias"

    return {
        "valid": True,
        "recipient_rut": data.recipient_rut,
        "recipient_name": recipient_name,
        "recipient_bank": data.recipient_bank,
        "amount": data.amount,
        "message": data.message,
        "deeplink": deeplink,
        "instructions": (
            "Haz clic en 'Ir al banco' para abrir Banco Security. "
            "Ingresa los datos que ves aquí para completar la transferencia."
        ),
    }


@router.post("/save")
def save_transfer(data: TransferRequest, db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Guarda una transferencia en el historial local (como referencia)."""
    transfer = Transfer(
        recipient_rut=data.recipient_rut,
        recipient_bank=data.recipient_bank,
        amount=data.amount,
        message=data.message,
        status="pending",
    )
    db.add(transfer)
    db.commit()
    db.refresh(transfer)
    return {"id": transfer.id, "message": "Transferencia guardada en historial."}


@router.get("/history")
def transfer_history(db: Session = Depends(get_db), _=Depends(get_current_user)):
    transfers = db.query(Transfer).order_by(Transfer.created_at.desc()).limit(50).all()
    return [
        {
            "id": t.id,
            "recipient_rut": t.recipient_rut,
            "recipient_name": t.recipient_name,
            "recipient_bank": t.recipient_bank,
            "amount": t.amount,
            "message": t.message,
            "status": t.status,
            "created_at": t.created_at.isoformat(),
        }
        for t in transfers
    ]
