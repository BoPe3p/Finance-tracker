"""
Autenticación de la app de finanzas.

Cómo funciona:
1. Primera vez: el usuario crea una contraseña maestra → se guarda como hash bcrypt
   en ~/.finanzas_config (nunca la contraseña real, solo el hash irreversible)
2. Cada vez que abre la app: ingresa la contraseña → se compara con el hash
3. Si es correcta, recibe un JWT (token) que dura 30 minutos de inactividad
4. Cada request al backend envía ese token en el header Authorization
5. Si el token expira → debe iniciar sesión de nuevo
"""

import os
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

# Archivo donde se guarda el hash de la contraseña (en el directorio del usuario)
CONFIG_FILE = Path.home() / ".finanzas_config"

# Clave secreta para firmar los JWT — generada aleatoriamente y guardada en config
# Si no existe, se genera al primer inicio
SECRET_KEY_FILE = Path.home() / ".finanzas_jwt_secret"

ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def _get_or_create_secret_key() -> str:
    """Crea una clave secreta aleatoria al primer inicio y la guarda localmente."""
    if SECRET_KEY_FILE.exists():
        return SECRET_KEY_FILE.read_text().strip()
    secret = os.urandom(32).hex()
    SECRET_KEY_FILE.write_text(secret)
    SECRET_KEY_FILE.chmod(0o600)  # Solo el dueño puede leerlo
    return secret


SECRET_KEY = _get_or_create_secret_key()


def is_password_configured() -> bool:
    """Verifica si ya existe una contraseña maestra configurada."""
    return CONFIG_FILE.exists()


def setup_password(password: str) -> None:
    """Guarda el hash bcrypt de la contraseña maestra. Solo se llama la primera vez."""
    if is_password_configured():
        raise ValueError("Ya existe una contraseña configurada.")
    hashed = pwd_context.hash(password)
    config = {"password_hash": hashed}
    CONFIG_FILE.write_text(json.dumps(config))
    CONFIG_FILE.chmod(0o600)  # Solo el dueño puede leerlo


def verify_password(password: str) -> bool:
    """Verifica si la contraseña ingresada coincide con el hash guardado."""
    if not is_password_configured():
        return False
    config = json.loads(CONFIG_FILE.read_text())
    return pwd_context.verify(password, config["password_hash"])


def create_access_token(data: dict) -> str:
    """Crea un JWT con expiración de 30 minutos."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Dependency de FastAPI: verifica el JWT en cada request protegido.
    Si el token es inválido o expiró, devuelve 401 Unauthorized.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sesión expirada o inválida. Por favor inicia sesión de nuevo.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("sub") is None:
            raise credentials_exception
        return payload
    except JWTError:
        raise credentials_exception
