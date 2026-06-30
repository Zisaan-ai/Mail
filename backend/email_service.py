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

def send_bulk_emails(subject: str, body_html: str, recipients: list[str]) -> int:
    """
    Sends bulk emails and returns the count of successful emails.
    """
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        print("SMTP Credentials not configured.")
        return 0

    success_count = 0
    
    # Auto-inject unsubscribe text if missing
    if "unsubscribe" not in body_html.lower():
        body_html += '<br><br><hr><p style="font-size:12px; color:#666;">If you no longer wish to receive these emails, you can <a href="mailto:' + SMTP_USERNAME + '?subject=Unsubscribe">unsubscribe here</a>.</p>'

    # Extract plain text for better deliverability
    soup = BeautifulSoup(body_html, "html.parser")
    body_text = soup.get_text(separator="\n").strip()

    try:
        # Set up the SMTP server
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)

        for recipient in recipients:
            try:
                # Create multipart alternative to reduce spam score
                msg = MIMEMultipart("alternative")
                msg['From'] = SMTP_USERNAME
                msg['To'] = recipient
                msg['Subject'] = subject
                msg['Date'] = formatdate(localtime=True)
                msg['List-Unsubscribe'] = f'<mailto:{SMTP_USERNAME}?subject=Unsubscribe>'

                # Attach text and html parts (Text first, HTML second as per MIME spec)
                part1 = MIMEText(body_text, 'plain')
                part2 = MIMEText(body_html, 'html')
                
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
        print(f"SMTP Connection failed: {e}")
        raise e

    return success_count

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
    return send_bulk_emails(subject, body_html, [email]) > 0
