import asyncio
import random
from sqlalchemy.orm import Session
from datetime import datetime, date
import database
import email_service
import imaplib
import email
from email.header import decode_header
from database import Reply

SPINTAX_SUBJECTS = [
    "Quick question {about|regarding} {your|the} {project|website}",
    "{Hello|Hi|Hey} {there|friend}, {how are you|hope you're well}",
    "Checking in {on|regarding} {our|the} {discussion|chat}",
    "{Following up|Reaching out} {about|regarding} {the|our} {meeting|call}"
]

SPINTAX_BODIES = [
    "{Hi|Hello|Hey},<br><br>{Just wanted to|I wanted to} {reach out|check in} and see if {you have time|you're free} {this week|next week} for a {quick chat|brief call}.<br><br>{Let me know|Thanks},<br>Warmup",
    "{Hope you are doing well|Hope you're having a good week}.<br><br>{I saw|I noticed} your {recent post|update} and {wanted to|thought I'd} {say hi|connect}.<br><br>{Best|Cheers},<br>Warmup System",
    "{Hi|Hello},<br><br>{Can we|Should we} {schedule|set up} a {time|meeting} to {discuss|talk about} {things|the project}? {Let me know your availability|Please let me know when you are free}.<br><br>{Thanks|Regards},"
]

async def warmup_loop():
    print("Warmup Service Started...")
    while True:
        try:
            db = database.SessionLocal()
            accounts = db.query(database.SendingAccount).filter(database.SendingAccount.warmup_enabled == True).all()
            
            if len(accounts) > 1:
                for account in accounts:
                    # Daily reset could be handled here or in a separate daily cron
                    # We'll just check if it's under limit for now.
                    if account.warmup_sent_today < account.warmup_daily_limit:
                        other_accounts = [a for a in accounts if a.id != account.id]
                        if not other_accounts:
                            continue
                            
                        target = random.choice(other_accounts)
                        
                        subject = random.choice(SPINTAX_SUBJECTS)
                        body = random.choice(SPINTAX_BODIES)
                        
                        print(f"Warmup: Sending from {account.email} to {target.email}")
                        
                        # Send email (which already parses spintax)
                        success = email_service.send_bulk_emails(subject, body, [target.email], account)
                        
                        if success > 0:
                            account.warmup_sent_today += 1
                            db.commit()
            
            db.close()
        except Exception as e:
            print(f"Warmup Loop Error: {e}")
            
        # Wait 15 minutes between cycles
        await asyncio.sleep(15 * 60)

async def reset_daily_limits():
    """Resets warmup_sent_today every 24 hours (run separately or schedule at midnight)"""
    while True:
        await asyncio.sleep(24 * 60 * 60)
        try:
            db = database.SessionLocal()
            accounts = db.query(database.SendingAccount).all()
            for account in accounts:
                account.sent_today = 0
                account.warmup_sent_today = 0
                if account.warmup_enabled:
                    account.warmup_daily_limit += account.warmup_increment_per_day
            db.commit()
            db.close()
            print("Daily limits reset!")
        except Exception as e:
            print(f"Reset Error: {e}")

def check_inbox(account, db):
    if not account.imap_server or not account.imap_password:
        return
    try:
        mail = imaplib.IMAP4_SSL(account.imap_server, account.imap_port or 993)
        mail.login(account.email, account.imap_password)
        mail.select("inbox")
        
        status, messages = mail.search(None, "UNSEEN")
        if status == "OK":
            for num in messages[0].split():
                typ, data = mail.fetch(num, "(RFC822)")
                for response_part in data:
                    if isinstance(response_part, tuple):
                        msg = email.message_from_bytes(response_part[1])
                        
                        subject, encoding = decode_header(msg["Subject"])[0]
                        if isinstance(subject, bytes):
                            subject = subject.decode(encoding if encoding else 'utf-8')
                            
                        # If it's a warmup email, mark read, maybe reply or unspam.
                        # For now, let's just parse the body
                        body = ""
                        if msg.is_multipart():
                            for part in msg.walk():
                                if part.get_content_type() == "text/plain":
                                    body = part.get_payload(decode=True).decode()
                                    break
                        else:
                            body = msg.get_payload(decode=True).decode()
                            
                        # Pass to AI Sentiment Analyzer
                        import ai_core
                        sentiment = ai_core.analyze_sentiment(body)
                        
                        # Save to DB
                        new_reply = Reply(
                            account_id=account.id,
                            sender_email=msg.get("From"),
                            subject=subject,
                            body=body,
                            sentiment=sentiment
                        )
                        db.add(new_reply)
                        db.commit()
                        print(f"New Reply from {msg.get('From')} - Sentiment: {sentiment}")
                        
        mail.logout()
    except Exception as e:
        print(f"IMAP Error for {account.email}: {e}")

