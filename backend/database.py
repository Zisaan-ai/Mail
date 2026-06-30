from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./email_marketer.db")

# SQLAlchemy 1.4+ requires postgresql:// instead of postgres://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_admin = Column(Boolean, default=False)
    is_approved = Column(Boolean, default=False)
    verification_code = Column(String, nullable=True)
    is_email_verified = Column(Boolean, default=False)

class Contact(Base):
    __tablename__ = "contacts"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    tags = Column(String, default="")  # comma separated tags
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Campaign(Base):
    __tablename__ = "campaigns"
    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, index=True)
    body = Column(String)
    sent_count = Column(Integer, default=0)
    opens = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    is_ab_test = Column(Boolean, default=False)
    subject_b = Column(String, nullable=True)
    body_b = Column(String, nullable=True)
    sent_count_a = Column(Integer, default=0)
    sent_count_b = Column(Integer, default=0)
    opens_a = Column(Integer, default=0)
    opens_b = Column(Integer, default=0)
    status = Column(String, default="sent") # draft, scheduled, sent
    created_at = Column(DateTime, default=datetime.utcnow)

class CampaignLead(Base):
    __tablename__ = "campaign_leads"
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, index=True)
    email = Column(String, index=True)
    name = Column(String, nullable=True)
    company = Column(String, nullable=True)
    status = Column(String, default="pending") # pending, sent, bounced
    variant = Column(String, nullable=True) # 'A' or 'B'
    created_at = Column(DateTime, default=datetime.utcnow)

class TrackingLog(Base):
    __tablename__ = "tracking_logs"
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, index=True)
    contact_id = Column(Integer, index=True)
    event_type = Column(String) # 'open' or 'click'
    url = Column(String, nullable=True) # if click, what url
    timestamp = Column(DateTime, default=datetime.utcnow)

# Create tables
Base.metadata.create_all(bind=engine)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
