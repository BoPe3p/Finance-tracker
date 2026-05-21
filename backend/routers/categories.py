from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models import Category
from auth import get_current_user

router = APIRouter(prefix="/categories", tags=["categories"])


class CategoryCreate(BaseModel):
    name: str
    emoji: str = "📌"


@router.get("/")
def list_categories(db: Session = Depends(get_db), _=Depends(get_current_user)):
    cats = db.query(Category).all()
    return [{"id": c.id, "name": c.name, "emoji": c.emoji} for c in cats]


@router.post("/", status_code=201)
def create_category(data: CategoryCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    if db.query(Category).filter(Category.name == data.name).first():
        raise HTTPException(status_code=400, detail="Ya existe una categoría con ese nombre.")
    cat = Category(name=data.name, emoji=data.emoji)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return {"id": cat.id, "name": cat.name, "emoji": cat.emoji}


@router.delete("/{category_id}", status_code=204)
def delete_category(category_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    cat = db.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada.")
    db.delete(cat)
    db.commit()
