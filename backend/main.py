from fastapi import FastAPI, Depends, HTTPException, status, Request, BackgroundTasks, Response
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
import random
import string

app = FastAPI(title="MailChimp Clone API")

# Allow CORS for local React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/ping")
def ping():
    return {"status": "ok", "msg": "Server is alive"}

@app.get("/api/hard-reset-db")
def hard_reset_db():
    try:
        database.Base.metadata.drop_all(bind=database.engine)
        database.Base.metadata.create_all(bind=database.engine)
        return {"msg": "Database completely reset and recreated with latest schema"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/migrate")
def run_migration(db: Session = Depends(database.get_db)):
    try:
        db.execute(text("ALTER TABLE users ADD COLUMN verification_code VARCHAR"))
        db.execute(text("ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN DEFAULT FALSE"))
        db.commit()
        return {"msg": "Migration successful"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/reset-users")
def reset_users(db: Session = Depends(database.get_db)):
    db.query(database.User).delete()
    db.commit()
    return {"msg": "All users deleted."}

# Pydantic models
class Token(BaseModel):
    access_token: str
    token_type: str
    is_admin: bool = False

class UserCreate(BaseModel):
    email: str
    password: str

class VerifyEmail(BaseModel):
    email: str
    code: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str

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
    company: Optional[str] = ""

class CampaignCreate(BaseModel):
    subject: str
    body: str
    leads: Optional[List[CampaignLeadBase]] = None
    is_ab_test: Optional[bool] = False
    subject_b: Optional[str] = None
    body_b: Optional[str] = None

class CampaignResponse(BaseModel):
    id: int
    subject: str
    body: str
    sent_count: int
    opens: int
    clicks: int
    status: str
    is_ab_test: Optional[bool] = False
    subject_b: Optional[str] = None
    body_b: Optional[str] = None
    sent_count_a: Optional[int] = 0
    sent_count_b: Optional[int] = 0
    opens_a: Optional[int] = 0
    opens_b: Optional[int] = 0

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
@app.post("/api/auth/register")
def register(user: UserCreate, db: Session = Depends(database.get_db)):
    email_lower = user.email.strip().lower()
    db_user = db.query(database.User).filter(database.User.email.ilike(email_lower)).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_count = db.query(database.User).count()
    is_admin = (user_count == 0) or (email_lower == "zmonemrahman@gmail.com")
    is_approved = is_admin
    
    verification_code = ''.join(random.choices(string.digits, k=6))
    
    # Try sending email first before saving to DB
    try:
        email_sent = email_service.send_verification_email(user.email, verification_code)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SMTP Error: {str(e)}")
        
    if not email_sent:
        raise HTTPException(status_code=500, detail="Failed to send verification email.")

    hashed_password = auth.get_password_hash(user.password)
    new_user = database.User(
        email=email_lower, 
        hashed_password=hashed_password, 
        is_admin=is_admin, 
        is_approved=is_approved,
        verification_code=verification_code,
        is_email_verified=is_admin  # Automatically verify admin
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    if is_admin:
        access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = auth.create_access_token(data={"sub": new_user.email}, expires_delta=access_token_expires)
        return {"access_token": access_token, "token_type": "bearer", "is_admin": True}
    
    return {"status": "needs_verification", "message": "Please verify your email address."}

@app.post("/api/auth/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(database.get_db)):
    user = db.query(database.User).filter(database.User.email == req.email).first()
    if not user:
        # Don't reveal if user exists or not
        return {"message": "If your email is registered, you will receive a reset code."}
        
    verification_code = ''.join(random.choices(string.digits, k=6))
    user.verification_code = verification_code
    db.commit()
    
    try:
        email_service.send_password_reset_email(user.email, verification_code)
    except Exception as e:
        # Still return success to not break the flow or reveal info
        print(f"Failed to send reset email: {e}")
        
    return {"message": "If your email is registered, you will receive a reset code."}

@app.post("/api/auth/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(database.get_db)):
    user = db.query(database.User).filter(database.User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.verification_code != req.code:
        raise HTTPException(status_code=400, detail="Invalid reset code")
        
    user.hashed_password = auth.get_password_hash(req.new_password)
    user.verification_code = None
    db.commit()
    
    return {"message": "Password reset successfully"}

@app.post("/api/auth/verify", response_model=Token)
def verify_email(payload: VerifyEmail, db: Session = Depends(database.get_db)):
    user = db.query(database.User).filter(database.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_email_verified:
        raise HTTPException(status_code=400, detail="Email already verified")
        
    if user.verification_code != payload.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
        
    user.is_email_verified = True
    user.verification_code = None
    db.commit()
    
    if user.email == "zmonemrahman@gmail.com":
        user.is_admin = True
        user.is_approved = True
        db.commit()
        
    if not user.is_approved:
        raise HTTPException(status_code=403, detail="Wait for admin approve")
        
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer", "is_admin": user.is_admin}

@app.post("/api/auth/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    email_lower = form_data.username.strip().lower()
    user = db.query(database.User).filter(database.User.email.ilike(email_lower)).first()
    if not user or not auth.verify_password(form_data.password.strip(), user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    
    if user.email == "zmonemrahman@gmail.com":
        user.is_admin = True
        user.is_approved = True
        user.is_email_verified = True
        db.commit()
        
    if not user.is_email_verified:
        raise HTTPException(status_code=403, detail="Please verify your email address first.")
        
    if not user.is_approved:
        raise HTTPException(status_code=403, detail="Wait for admin approve")
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer", "is_admin": user.is_admin}

# --- ADMIN ENDPOINTS ---
@app.get("/api/test-db")
def test_db(db: Session = Depends(database.get_db)):
    users = db.query(database.User).count()
    return {"count": users, "url": database.DATABASE_URL}

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
    new_campaign = database.Campaign(
        subject=campaign.subject, 
        body=campaign.body, 
        status="processing",
        is_ab_test=campaign.is_ab_test,
        subject_b=campaign.subject_b,
        body_b=campaign.body_b
    )
    db.add(new_campaign)
    db.commit()
    db.refresh(new_campaign)

    if campaign.leads and len(campaign.leads) > 0:
        for lead_in in campaign.leads:
            db_lead = database.CampaignLead(campaign_id=new_campaign.id, name=lead_in.name, email=lead_in.email, company=lead_in.company)
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

    import random
    leads = db.query(database.CampaignLead).filter(database.CampaignLead.campaign_id == campaign_id).all()
    
    success_count_a = 0
    success_count_b = 0
    
    if campaign.is_ab_test:
        random.shuffle(leads)
        midpoint = len(leads) // 2
        leads_a = leads[:midpoint]
        leads_b = leads[midpoint:]
        
        for lead in leads_a:
            lead.variant = 'A'
            pixel = f'<img src="https://email-marketer-ijk5.onrender.com/api/track/lead_open/{campaign_id}/{lead.id}" width="1" height="1" />'
            body_a = campaign.body + pixel
            if email_service.send_bulk_emails(campaign.subject, body_a, [lead.email]) > 0:
                success_count_a += 1
                lead.status = "sent"
                
        for lead in leads_b:
            lead.variant = 'B'
            pixel = f'<img src="https://email-marketer-ijk5.onrender.com/api/track/lead_open/{campaign_id}/{lead.id}" width="1" height="1" />'
            body_b = (campaign.body_b or campaign.body) + pixel
            subj_b = campaign.subject_b or campaign.subject
            if email_service.send_bulk_emails(subj_b, body_b, [lead.email]) > 0:
                success_count_b += 1
                lead.status = "sent"
                
        campaign.sent_count_a = success_count_a
        campaign.sent_count_b = success_count_b
        campaign.sent_count = success_count_a + success_count_b
    else:
        for lead in leads:
            lead.variant = 'A'
            pixel = f'<img src="https://email-marketer-ijk5.onrender.com/api/track/lead_open/{campaign_id}/{lead.id}" width="1" height="1" />'
            body = campaign.body + pixel
            if email_service.send_bulk_emails(campaign.subject, body, [lead.email]) > 0:
                success_count_a += 1
                lead.status = "sent"
                
        campaign.sent_count = success_count_a
        campaign.sent_count_a = success_count_a

    campaign.status = "sent"
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

@app.get("/api/track/lead_open/{campaign_id}/{lead_id}")
def track_lead_open(campaign_id: int, lead_id: int, db: Session = Depends(database.get_db)):
    # Check if already logged to prevent double counting
    existing = db.query(database.TrackingLog).filter(
        database.TrackingLog.campaign_id == campaign_id,
        database.TrackingLog.contact_id == lead_id,
        database.TrackingLog.event_type == "lead_open"
    ).first()
    
    if not existing:
        log = database.TrackingLog(campaign_id=campaign_id, contact_id=lead_id, event_type="lead_open")
        db.add(log)
        
        campaign = db.query(database.Campaign).filter(database.Campaign.id == campaign_id).first()
        lead = db.query(database.CampaignLead).filter(database.CampaignLead.id == lead_id).first()
        
        if campaign and lead:
            if campaign.is_ab_test:
                if lead.variant == 'A':
                    campaign.opens_a += 1
                elif lead.variant == 'B':
                    campaign.opens_b += 1
                campaign.opens = campaign.opens_a + campaign.opens_b
            else:
                campaign.opens_a += 1
                campaign.opens = campaign.opens_a
        db.commit()
        
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
        # Read file fresh every time - bypasses any server-side caching
        index_path = os.path.join(frontend_path, "index.html")
        with open(index_path, "r", encoding="utf-8") as f:
            content = f.read()
        return Response(
            content=content,
            media_type="text/html",
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
                "Pragma": "no-cache",
                "Expires": "0",
                "Surrogate-Control": "no-store",
            }
        )
