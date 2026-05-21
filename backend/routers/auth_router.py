from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
import auth

router = APIRouter(prefix="/auth", tags=["auth"])


class PasswordRequest(BaseModel):
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.get("/status")
def get_auth_status():
    """Indica si ya existe una contraseña maestra configurada."""
    return {"configured": auth.is_password_configured()}


@router.post("/setup", status_code=201)
def setup_password(req: PasswordRequest):
    """Primera vez: crea la contraseña maestra. Solo puede llamarse una vez."""
    if auth.is_password_configured():
        raise HTTPException(status_code=400, detail="Ya existe una contraseña configurada.")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres.")
    auth.setup_password(req.password)
    token = auth.create_access_token({"sub": "user"})
    return TokenResponse(access_token=token)


@router.post("/login")
def login(req: PasswordRequest):
    """Verifica la contraseña y retorna un JWT de 30 minutos."""
    if not auth.is_password_configured():
        raise HTTPException(status_code=400, detail="No hay contraseña configurada. Usa /auth/setup primero.")
    if not auth.verify_password(req.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contraseña incorrecta.",
        )
    token = auth.create_access_token({"sub": "user"})
    return TokenResponse(access_token=token)
