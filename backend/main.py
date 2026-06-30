from fastapi import FastAPI, Depends, HTTPException, status, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import os
import database
import email_service
import auth
import ai_service
from sqlalchemy import text

app = FastAPI(title="MailChimp Clone API")

# Allow CORS for local React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/migrate")
def run_migration(db: Session = Depends(database.get_db)):
    try:
        db.query(database.User).delete()
        db.commit()
        return {"msg": "Migration successful"}
    except Exception as e:
        return {"error": str(e)}

# Pydantic models
class Token(BaseModel):
    access_token: str
    token_type: str

class UserCreate(BaseModel):
    email: str
    password: str

class ContactCreate(BaseModel):
    name: Optional[str] = ""
    email: str
    tags: Optional[str] = ""

class ContactResponse(BaseModel):
    id: int
    name: Optional[str] = ""
    email: str
    tags: str
    is_active: bool

    class Config:
        from_attributes = True

class CampaignLeadBase(BaseModel):
    name: Optional[str] = ""
    email: str

class CampaignCreate(BaseModel):
    subject: str
    body: str
    leads: Optional[List[CampaignLeadBase]] = None

class CampaignResponse(BaseModel):
    id: int
    subject: str
    body: str
    sent_count: int
    opens: int
    clicks: int
    status: str

    class Config:
        from_attributes = True

# --- AI ENDPOINTS ---
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = None

class EmailGenerateRequest(BaseModel):
    prompt: str

@app.post("/api/ai/chat")
def ai_chat(req: ChatRequest, current_user: database.User = Depends(auth.get_current_user)):
    history_dict = [msg.model_dump() for msg in req.history] if req.history else None
    response = ai_service.chat_with_assistant(req.message, history_dict)
    return {"reply": response}

@app.post("/api/ai/generate")
def ai_generate_email(req: EmailGenerateRequest, current_user: database.User = Depends(auth.get_current_user)):
    generated_html = ai_service.generate_email_content(req.prompt)
    return {"html": generated_html}

# --- AUTH ENDPOINTS ---
@app.post("/api/auth/register", response_model=Token)
def register(user: UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(database.User).filter(database.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_count = db.query(database.User).count()
    is_admin = (user_count == 0)
    is_approved = is_admin
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = database.User(email=user.email, hashed_password=hashed_password, is_admin=is_admin, is_approved=is_approved)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    if not new_user.is_approved:
        raise HTTPException(status_code=403, detail="Account created successfully, but pending admin approval.")
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(data={"sub": new_user.email}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer", "is_admin": new_user.is_admin}

@app.post("/api/auth/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(database.User).filter(database.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    
    if not user.is_approved:
        raise HTTPException(status_code=403, detail="Your account is pending admin approval.")
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer", "is_admin": user.is_admin}

# --- ADMIN ENDPOINTS ---
@app.get("/api/admin/users")
def get_all_users(db: Session = Depends(database.get_db), current_user: database.User = Depends(auth.get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    users = db.query(database.User).all()
    return [{"id": u.id, "email": u.email, "is_admin": u.is_admin, "is_approved": u.is_approved} for u in users]

@app.post("/api/admin/users/{user_id}/approve")
def approve_user(user_id: int, db: Session = Depends(database.get_db), current_user: database.User = Depends(auth.get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    target_user = db.query(database.User).filter(database.User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    target_user.is_approved = True
    db.commit()
    return {"message": "User approved successfully"}

@app.delete("/api/admin/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(database.get_db), current_user: database.User = Depends(auth.get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    target_user = db.query(database.User).filter(database.User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(target_user)
    db.commit()
    return {"message": "User deleted"}


# --- SECURE ENDPOINTS ---
@app.get("/api/contacts", response_model=List[ContactResponse])
def get_contacts(db: Session = Depends(database.get_db), current_user: database.User = Depends(auth.get_current_user)):
    return db.query(database.Contact).all()

@app.post("/api/contacts", response_model=ContactResponse)
def create_contact(contact: ContactCreate, db: Session = Depends(database.get_db), current_user: database.User = Depends(auth.get_current_user)):
    db_contact = db.query(database.Contact).filter(database.Contact.email == contact.email).first()
    if db_contact:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_contact = database.Contact(name=contact.name, email=contact.email, tags=contact.tags)
    db.add(new_contact)
    db.commit()
    db.refresh(new_contact)
    return new_contact

@app.delete("/api/contacts/{contact_id}")
def delete_contact(contact_id: int, db: Session = Depends(database.get_db), current_user: database.User = Depends(auth.get_current_user)):
    contact = db.query(database.Contact).filter(database.Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    db.delete(contact)
    db.commit()
    return {"message": "Contact deleted"}

@app.get("/api/campaigns", response_model=List[CampaignResponse])
def get_campaigns(db: Session = Depends(database.get_db), current_user: database.User = Depends(auth.get_current_user)):
    return db.query(database.Campaign).order_by(database.Campaign.created_at.desc()).all()

@app.post("/api/campaigns/send")
def send_campaign(campaign: CampaignCreate, background_tasks: BackgroundTasks, db: Session = Depends(database.get_db), current_user: database.User = Depends(auth.get_current_user)):
    new_campaign = database.Campaign(subject=campaign.subject, body=campaign.body, status="processing")
    db.add(new_campaign)
    db.commit()
    db.refresh(new_campaign)

    if campaign.leads and len(campaign.leads) > 0:
        for lead_in in campaign.leads:
            db_lead = database.CampaignLead(campaign_id=new_campaign.id, name=lead_in.name, email=lead_in.email)
            db.add(db_lead)
        db.commit()
        # In a real app, this goes to Celery/Redis
        background_tasks.add_task(process_isolated_campaign, new_campaign.id, [lead.email for lead in campaign.leads])
    else:
        # Fallback to global audience for older calls
        contacts = db.query(database.Contact).filter(database.Contact.is_active == True).all()
        if not contacts:
            raise HTTPException(status_code=400, detail="No active contacts found")
        background_tasks.add_task(process_campaign_sending, new_campaign.id, contacts)
    
    return {"message": "Campaign queued for sending", "campaign_id": new_campaign.id}

def process_isolated_campaign(campaign_id: int, emails: list):
    db = database.SessionLocal()
    campaign = db.query(database.Campaign).filter(database.Campaign.id == campaign_id).first()
    if not campaign:
        db.close()
        return

    success_count = email_service.send_bulk_emails(campaign.subject, campaign.body, emails)
    
    campaign.status = "sent"
    campaign.sent_count = success_count
    db.commit()
    db.close()

def process_campaign_sending(campaign_id: int, contacts: list):
    db = database.SessionLocal()
    campaign = db.query(database.Campaign).filter(database.Campaign.id == campaign_id).first()
    if not campaign:
        db.close()
        return

    success_count = 0
    # Add tracking pixels and links to each email body
    for contact in contacts:
        # 1x1 invisible pixel for open tracking
        tracking_pixel = f'<img src="http://127.0.0.1:8000/api/track/open/{campaign_id}/{contact.id}" width="1" height="1" />'
        personalized_body = campaign.body + tracking_pixel
        
        # We would normally wrap links here for click tracking, but keeping it simple for the clone
        # success = email_service.send_single_email(...) # refactored for single send
        # success_count += 1
        pass # mock for now
    
    # Mocking bulk send since email_service is bulk only currently
    recipients = [c.email for c in contacts]
    success_count = email_service.send_bulk_emails(campaign.subject, campaign.body, recipients)
    
    campaign.sent_count = success_count
    campaign.status = "sent"
    db.commit()
    db.close()


# --- PUBLIC TRACKING ENDPOINTS ---
@app.get("/api/track/open/{campaign_id}/{contact_id}")
def track_open(campaign_id: int, contact_id: int, db: Session = Depends(database.get_db)):
    # Log the open event
    log = database.TrackingLog(campaign_id=campaign_id, contact_id=contact_id, event_type="open")
    db.add(log)
    
    # Update campaign stats
    campaign = db.query(database.Campaign).filter(database.Campaign.id == campaign_id).first()
    if campaign:
        campaign.opens += 1
    
    db.commit()
    
    # Return 1x1 transparent GIF
    return FileResponse(os.path.join(os.path.dirname(__file__), "pixel.gif"), media_type="image/gif")


@app.get("/api/track/click/{campaign_id}/{contact_id}")
def track_click(campaign_id: int, contact_id: int, url: str, db: Session = Depends(database.get_db)):
    # Log the click event
    log = database.TrackingLog(campaign_id=campaign_id, contact_id=contact_id, event_type="click", url=url)
    db.add(log)
    
    # Update campaign stats
    campaign = db.query(database.Campaign).filter(database.Campaign.id == campaign_id).first()
    if campaign:
        campaign.clicks += 1
    
    db.commit()
    
    return RedirectResponse(url=url)


# --- SERVE FRONTEND ---
frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.exists(frontend_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_path, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        return FileResponse(os.path.join(frontend_path, "index.html"))
