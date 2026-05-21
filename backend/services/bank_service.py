"""
Sincronización bancaria usando open-banking-chile (TypeScript/Node.js).

Bancos soportados (scraping automático con credenciales):
  Llama la CLI de open-banking-chile como subproceso.
  Las credenciales se pasan como variables de entorno y NUNCA se guardan.

Banco Security (pendiente — contribución abierta al repo):
  Importación manual de CSV descargado desde el sitio web del banco.

Repo: https://github.com/kaihv/open-banking-chile
Para contribuir Banco Security: ver CONTRIBUTING.md del repo
"""

import subprocess
import json
import os
import csv
import io
from datetime import datetime

SUPPORTED_BANKS = {
    "falabella": "Banco Falabella",
    "bice":      "Banco BICE",
    "santander": "Santander",
    "edwards":   "Banco Edwards",
    "scotiabank":"Scotiabank",
    "bchile":    "Banco de Chile",
    "bci":       "BCI",
    "itau":      "Itaú",
    "bestado":   "BancoEstado",
    "cencosud":  "Tarjeta Cencosud",
}

_BACKEND_DIR  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_FRONTEND_DIR = os.path.join(_BACKEND_DIR, "..", "frontend")
_OBC_BIN      = os.path.join(_FRONTEND_DIR, "node_modules", ".bin", "open-banking-chile")


def sync_via_openbanking(rut: str, password: str, bank_id: str) -> dict:
    """
    Ejecuta el scraper de open-banking-chile para el banco indicado.
    Retorna el JSON con cuentas y movimientos.

    Las credenciales se pasan solo como variables de entorno durante
    la ejecución del subproceso y no se persisten en ningún lugar.
    """
    if not os.path.exists(_OBC_BIN):
        raise FileNotFoundError(
            "open-banking-chile no está instalado. "
            "Ejecuta 'npm install' dentro del directorio frontend/ y vuelve a intentarlo."
        )

    env    = {**os.environ, "RUT": rut, "PASSWORD": password}
    result = subprocess.run(
        [_OBC_BIN, "--bank", bank_id],
        capture_output=True, text=True, env=env,
        timeout=120, cwd=_FRONTEND_DIR,
    )

    if result.returncode != 0:
        msg = result.stderr.strip() or "Error desconocido al ejecutar el scraper bancario"
        raise RuntimeError(msg)

    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        raise RuntimeError(f"Respuesta inesperada del scraper: {result.stdout[:300]}")


def extract_accounts_and_movements(data: dict, bank_id: str) -> tuple[list[dict], list[dict]]:
    """
    Convierte el JSON de open-banking-chile al formato interno de la app.

    Estructura que retorna open-banking-chile:
    {
      "accounts": [
        { "label": "Cuenta Corriente", "balance": 500000,
          "movements": [{ "date": "2025-01-15", "description": "SUPERMERCADO", "amount": -12000 }] }
      ],
      "creditCards": [...]
    }
    """
    bank_name   = SUPPORTED_BANKS.get(bank_id, bank_id)
    accounts_out  = []
    movements_out = []

    for acc in data.get("accounts", []):
        acc_key = str(acc.get("id") or acc.get("label", "cuenta"))
        accounts_out.append({
            "name":            acc.get("label", "Cuenta"),
            "type":            "corriente",
            "currency":        "CLP",
            "balance":         float(acc.get("balance", 0)),
            "bank":            bank_name,
            "bank_account_id": acc_key,
        })
        for mov in acc.get("movements", []):
            movements_out.append({
                "date":            mov.get("date", ""),
                "description":     mov.get("description", ""),
                "amount":          float(mov.get("amount", 0)),
                "account_bank_id": acc_key,
            })

    for card in data.get("creditCards", []):
        card_key = "card_" + str(card.get("id") or card.get("label", "tarjeta"))
        accounts_out.append({
            "name":            card.get("label", "Tarjeta de crédito"),
            "type":            "credito",
            "currency":        "CLP",
            "balance":         float(card.get("balance", 0)),
            "bank":            bank_name,
            "bank_account_id": card_key,
        })
        for mov in card.get("movements", []):
            movements_out.append({
                "date":            mov.get("date", ""),
                "description":     mov.get("description", ""),
                "amount":          float(mov.get("amount", 0)),
                "account_bank_id": card_key,
            })

    return accounts_out, movements_out


def parse_banco_security_csv(content: str) -> list[dict]:
    """
    Parsea el CSV exportado desde Banco Security online.

    Pasos para exportar desde Banco Security:
      1. Inicia sesión en bancosecurity.cl
      2. Selecciona tu cuenta → Movimientos
      3. Filtra el rango de fechas que quieras
      4. Botón 'Exportar' → elige CSV

    Columnas esperadas: Fecha | Descripción/Glosa | Cargo | Abono  (o Monto con signo)
    Acepta separador coma (,) o punto y coma (;) — Excel en Chile usa punto y coma.
    Acepta formatos de fecha: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD.
    Acepta números en formato chileno: 1.234,56 → 1234.56
    """
    separator = ";" if content.count(";") > content.count(",") else ","
    reader    = csv.DictReader(io.StringIO(content), delimiter=separator)
    movements = []

    def _clean_num(s: str) -> float:
        if not s:
            return 0.0
        s = s.replace("$", "").replace(" ", "").strip()
        if "," in s and "." in s:
            s = s.replace(".", "").replace(",", ".")   # 1.234,56 → 1234.56
        elif "," in s:
            s = s.replace(",", ".")                    # 1234,56  → 1234.56
        try:
            return float(s)
        except ValueError:
            return 0.0

    for row in reader:
        row = {k.strip(): v.strip() for k, v in row.items() if k}

        # Fecha
        fecha_raw = (row.get("Fecha") or row.get("fecha") or row.get("FECHA") or "").strip()
        fecha = None
        for fmt in ("%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d", "%d-%m-%y", "%d/%m/%y"):
            try:
                fecha = datetime.strptime(fecha_raw, fmt).strftime("%Y-%m-%d")
                break
            except ValueError:
                continue
        if not fecha:
            continue

        # Descripción
        desc = (
            row.get("Descripción") or row.get("Descripcion") or row.get("DESCRIPCION")
            or row.get("Glosa") or row.get("glosa") or row.get("GLOSA") or ""
        )

        # Monto: columnas Cargo/Abono separadas o columna Monto única con signo
        if any(k in row for k in ("Cargo", "cargo", "CARGO")):
            cargo  = _clean_num(row.get("Cargo") or row.get("cargo") or row.get("CARGO") or "")
            abono  = _clean_num(row.get("Abono") or row.get("abono") or row.get("ABONO") or "")
            amount = abono - cargo
        else:
            amount = _clean_num(row.get("Monto") or row.get("monto") or row.get("MONTO") or "")

        if amount == 0:
            continue

        movements.append({"date": fecha, "description": desc.strip(), "amount": amount})

    return movements
