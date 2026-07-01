import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formatdate
import os
from dotenv import load_dotenv
from bs4 import BeautifulSoup

load_dotenv()

SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

import re
import random

def process_spintax(text: str) -> str:
    """
    Parses spintax like {Hello|Hi|Hey} and returns a randomly chosen string.
    Works recursively for nested spintax.
    """
    pattern = re.compile(r'\{([^{}]*)\}')
    while pattern.search(text):
        match = pattern.search(text)
        options = match.group(1).split('|')
        text = text[:match.start()] + random.choice(options) + text[match.end():]
    return text

def send_bulk_emails(subject: str, body_html: str, recipients: list[str], account=None) -> int:
    """
    Sends bulk emails and returns the count of successful emails.
    Requires a valid SendingAccount.
    """
    if not account:
        print("No sending account provided for campaign.")
        return 0
        
    active_server = account.smtp_server
    active_port = account.smtp_port
    active_user = account.smtp_username
    active_pass = account.smtp_password

    if not active_pass:
        print("SMTP Password not configured for account.")
        return 0
        
    success_count = 0
    
    # Auto-inject unsubscribe text if missing, using a placeholder if active_user is missing
    sender_for_unsub = active_user if active_user else "admin@domain.com"
    if "unsubscribe" not in body_html.lower():
        body_html += f'<br><br><hr><p style="font-size:12px; color:#666;">If you no longer wish to receive these emails, you can <a href="mailto:{sender_for_unsub}?subject=Unsubscribe">unsubscribe here</a>.</p>'

    # Extract plain text for better deliverability
    soup = BeautifulSoup(body_html, "html.parser")
    body_text = soup.get_text(separator="\n").strip()

    try:
        # Check if using Brevo API Key
        if active_pass.startswith("xkeysib-"):
            import requests
            headers = {
                "accept": "application/json",
                "api-key": active_pass,
                "content-type": "application/json"
            }
            for recipient in recipients:
                spun_subject = process_spintax(subject)
                spun_html = process_spintax(body_html)
                spun_text = process_spintax(body_text)
                payload = {
                    "sender": {"email": active_user, "name": getattr(account, 'name', 'Admin') if account else 'Admin'},
                    "to": [{"email": recipient}],
                    "subject": spun_subject,
                    "htmlContent": spun_html,
                    "textContent": spun_text
                }
                try:
                    res = requests.post("https://api.brevo.com/v3/smtp/email", json=payload, headers=headers, timeout=10)
                    if res.status_code in [200, 201, 202]:
                        success_count += 1
                        print(f"Sent successfully to {recipient} via Brevo")
                    else:
                        print(f"Failed to send to {recipient} via Brevo: {res.text}")
                        raise Exception(f"Brevo Error: {res.text}")
                except Exception as e:
                    print(f"Exception for {recipient}: {e}")
                    raise e
            return success_count
            
        # Check if using Google App Script
        if active_pass.startswith("https://script.google.com/"):
            import requests
            for recipient in recipients:
                spun_subject = process_spintax(subject)
                spun_html = process_spintax(body_html)
                spun_text = process_spintax(body_text)
                payload = {
                    "recipient": recipient,
                    "subject": spun_subject,
                    "body_html": spun_html,
                    "body_text": spun_text
                }
                try:
                    res = requests.post(active_pass, json=payload, timeout=15)
                    if res.status_code in [200, 201, 202]:
                        success_count += 1
                        print(f"Sent successfully to {recipient} via AppScript")
                    else:
                        print(f"Failed to send to {recipient} via AppScript: {res.text}")
                        raise Exception(f"AppScript Error: {res.text}")
                except Exception as e:
                    print(f"Exception for {recipient}: {e}")
                    raise e
            return success_count

        # Otherwise, fall back to standard SMTP
        if int(active_port) == 465:
            server = smtplib.SMTP_SSL(active_server, int(active_port), timeout=5)
        else:
            server = smtplib.SMTP(active_server, int(active_port), timeout=5)
            server.starttls()
            
        server.login(active_user, active_pass)
        
        for recipient in recipients:
            try:
                spun_subject = process_spintax(subject)
                spun_html = process_spintax(body_html)
                spun_text = process_spintax(body_text)
                msg = MIMEMultipart("alternative")
                msg['Subject'] = spun_subject
                msg['From'] = f"{getattr(account, 'name', '')} <{active_user}>" if account and getattr(account, 'name', None) else active_user
                msg['To'] = recipient
                msg['Date'] = formatdate(localtime=True)
                
                msg['List-Unsubscribe'] = f'<mailto:{active_user}?subject=Unsubscribe>'

                part1 = MIMEText(spun_text, "plain")
                part2 = MIMEText(spun_html, "html")
                msg.attach(part1)
                msg.attach(part2)
                
                server.send_message(msg)
                success_count += 1
                print(f"Sent successfully to {recipient}")
            except Exception as e:
                print(f"Failed to send to {recipient}: {e}")
                raise e

        server.quit()
    except Exception as e:
        print(f"Email Connection failed: {e}")
        raise e

    return success_count


def _send_system_email(subject: str, body_html: str, recipient: str) -> bool:
    """Sends a system email (like auth/verification) using .env credentials."""
    if not SMTP_PASSWORD:
        return False
        
    try:
        if int(SMTP_PORT) == 465:
            server = smtplib.SMTP_SSL(SMTP_SERVER, int(SMTP_PORT), timeout=5)
        else:
            server = smtplib.SMTP(SMTP_SERVER, int(SMTP_PORT), timeout=5)
            server.starttls()
            
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"Admin <{SMTP_USERNAME}>"
        msg["To"] = recipient
        msg.attach(MIMEText(body_html, "html"))
        
        server.sendmail(SMTP_USERNAME, [recipient], msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"System Email failed: {e}")
        return False

def send_verification_email(email: str, code: str):
    """
    Sends a 6-digit verification code to the user.
    If SMTP credentials are not configured, it just prints it to the console.
    """
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        print(f"*** MOCK EMAIL: Verification code for {email} is {code} ***")
        return True

    subject = "Verify your account"
    body_html = f"""
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #4F46E5; text-align: center;">Account Verification</h2>
        <p>Thank you for registering. Please use the following 6-digit code to verify your email address:</p>
        <div style="background: #F3F4F6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 6px; margin: 20px 0;">
            {code}
        </div>
        <p>If you did not request this, please ignore this email.</p>
    </div>
    """
    # Since it's a single email, we can reuse our bulk send logic or write a simpler one
    return _send_system_email(subject, body_html, email)

def send_password_reset_email(email: str, code: str):
    """
    Sends a 6-digit password reset code to the user.
    """
    if not SMTP_PASSWORD:
        print(f"*** MOCK EMAIL: Password reset code for {email} is {code} ***")
        return True

    subject = "Reset your password"
    body_html = f"""
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #4F46E5; text-align: center;">Password Reset</h2>
        <p>We received a request to reset your password. Please use the following 6-digit code to reset it:</p>
        <div style="background: #F3F4F6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 6px; margin: 20px 0;">
            {code}
        </div>
        <p>If you did not request this, please ignore this email.</p>
    </div>
    """
    return _send_system_email(subject, body_html, email)
