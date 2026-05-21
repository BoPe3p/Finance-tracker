from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # corriente, vista, credito
    bank = Column(String, nullable=False)
    balance = Column(Float, default=0.0)
    color = Column(String, default="#3b82f6")
    fintoc_link_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    emoji = Column(String, default="📌")

    transactions = relationship("Transaction", back_populates="category")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime(timezone=True), nullable=False)
    description = Column(String, nullable=False)
    amount = Column(Float, nullable=False)  # negativo = gasto, positivo = ingreso
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    account = relationship("Account", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")


class Investment(Base):
    __tablename__ = "investments"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, nullable=False)   # ej: AAPL, COPEC.SN, risky-norris
    name = Column(String, nullable=False)
    shares = Column(Float, nullable=False)
    buy_price = Column(Float, nullable=False)  # precio por acción al comprar
    buy_date = Column(DateTime(timezone=True), nullable=False)
    platform = Column(String, nullable=True)   # ej: Fintual, Interactive Brokers, etc.
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Transfer(Base):
    __tablename__ = "transfers"

    id = Column(Integer, primary_key=True, index=True)
    recipient_rut = Column(String, nullable=False)
    recipient_name = Column(String, nullable=True)
    recipient_bank = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    message = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending, completed, failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
