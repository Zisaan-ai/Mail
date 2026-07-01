import os
import re
import urllib.request
from bs4 import BeautifulSoup
import json
import requests
from dotenv import load_dotenv

# Try to load env file to get API key if running locally
load_dotenv('backend/.env')
load_dotenv('.env')

MODEL_NAME = "llama-3.1-8b-instant"
API_URL = "https://api.groq.com/openai/v1/chat/completions"

def extract_url_content(text: str) -> str:
    urls = re.findall(r'(https?://[^\s()]+)', text)
    if not urls:
        return ""
    
    context = "\n\n--- Scraped Context from URLs ---\n"
    for url in urls:
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(req, timeout=10) as response:
                html = response.read().decode('utf-8', errors='ignore')
                soup = BeautifulSoup(html, 'html.parser')
                for script in soup(["script", "style"]):
                    script.extract()
                text_content = soup.get_text(separator=' ', strip=True)
                context += f"\nURL: {url}\nContent: {text_content[:5000]}\n"
        except Exception as e:
            print(f"Failed to scrape {url}: {e}")
            context += f"\nURL: {url}\n(Could not read content)\n"
    return context

def _call_ai_api(prompt: str) -> str:
    """Helper to make a direct REST API call to Groq."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("API Key is missing. Please add your Groq API key to your .env file.")
    
    payload = {
        "model": MODEL_NAME,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7
    }
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key.strip()}"
    }
    
    response = requests.post(API_URL, headers=headers, json=payload, timeout=30)
    
    if response.status_code != 200:
        try:
            err_data = response.json()
            err_msg = err_data.get("error", {}).get("message", response.text)
            raise ValueError(f"Groq API Error: {err_msg}")
        except json.JSONDecodeError:
            raise ValueError(f"Groq API Error {response.status_code}: {response.text}")
            
    data = response.json()
    try:
        text = data["choices"][0]["message"]["content"]
        return text
    except (KeyError, IndexError):
        raise ValueError("Unexpected response format from Groq API.")

def handle_ai_error(e: Exception) -> dict:
    """Helper to cleanly format AI errors for the frontend."""
    msg = str(e)
    print(f"AI ERROR: {msg}")
    return {"error": msg}

def generate_email_content(prompt: str) -> dict:
    try:
        full_prompt = f"""
        You are an expert cold email copywriter. Write a highly converting cold email based on these instructions.
        Make it short, punchy, and use Spintax (e.g. {{Hi|Hello}} {{Name|Friend}}) for variation.
        Output ONLY the HTML body of the email. Do not wrap in markdown tags like ```html.
        
        User instructions: {prompt}
        {extract_url_content(prompt)}
        """
        text = _call_ai_api(full_prompt).strip()
        if text.startswith("```html"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return {"html": text.strip()}
    except Exception as e:
        return handle_ai_error(e)

def optimize_subject(subject: str) -> dict:
    try:
        prompt = f"""
        Rewrite the following email subject line into a Spintax format to bypass spam filters.
        Output ONLY the spintax string, nothing else. Example output: {{Quick question|Thoughts}} regarding {{your website|the project}}
        
        Subject to rewrite: {subject}
        """
        text = _call_ai_api(prompt).strip()
        return {"subject": text}
    except Exception as e:
        return handle_ai_error(e)

def generate_icebreakers(csv_content: str) -> dict:
    try:
        prompt = f"""
        You are an AI sales assistant. I have a CSV of leads.
        For each lead, generate a highly personalized, single-sentence icebreaker based on their company or name.
        Return the updated CSV text with a new 'Icebreaker' column appended.
        Do not add any explanations or markdown wrappers, just the raw CSV text.
        
        CSV Data:
        {csv_content}
        """
        text = _call_ai_api(prompt).strip()
        if text.startswith("```csv"):
            text = text[6:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return {"csv": text.strip()}
    except Exception as e:
        return handle_ai_error(e)

def analyze_sentiment(text: str) -> str:
    try:
        prompt = f"""
        You are an AI sales assistant. Read this email reply and classify its sentiment.
        Choose ONLY ONE from these exact tags:
        Interested
        Not Interested
        Meeting Booked
        Out of Office
        Questions / Objections
        Unknown

        Email:
        {text}
        """
        sentiment = _call_ai_api(prompt).strip()
        valid = ["Interested", "Not Interested", "Meeting Booked", "Out of Office", "Questions / Objections", "Unknown"]
        for v in valid:
            if v.lower() in sentiment.lower():
                return v
        return "Unknown"
    except Exception as e:
        print(f"Sentiment Analysis Error: {e}")
        return "Unknown"

def generate_autopilot_campaign(prompt: str) -> dict:
    try:
        full_prompt = f"""
        You are an expert email marketing copywriter. 
        Based on the following product/service description (or scraped URL content), generate a full cold email campaign.
        
        You must return ONLY a valid JSON object with the following exact keys:
        - "subject_a": A highly optimized spintax subject line for the first email.
        - "body_a": The HTML body of the first email (use Spintax).
        - "subject_b": An alternative spintax subject line (or follow-up subject).
        - "body_b": The HTML body of a follow-up email if they don't reply (use Spintax).
        
        Do not use markdown blocks like ```json around the output, just raw JSON.

        User Input: {prompt}
        {extract_url_content(prompt)}
        """
        text = _call_ai_api(full_prompt).strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
            
        return json.loads(text.strip())
    except json.JSONDecodeError:
        return {"error": "AI generated invalid JSON. Please try again."}
    except Exception as e:
        return handle_ai_error(e)

def chat_with_assistant(message: str, history: list = None) -> str:
    try:
        if not history:
            history = []
        
        # Format history for Groq
        groq_history = [{'role': 'system', 'content': 'You are a helpful AI assistant for an email marketing platform. You help users write campaigns, understand stats, and use the platform.'}]
        for msg in history:
            role = 'user' if msg.get('role') == 'user' else 'assistant'
            groq_history.append({'role': role, 'content': msg.get('content', '')})
            
        groq_history.append({'role': 'user', 'content': message})
        
        import os, requests
        api_key = os.getenv('GROQ_API_KEY')
        if not api_key: return 'API Key is missing.'
        
        payload = {
            'model': MODEL_NAME,
            'messages': groq_history,
            'temperature': 0.7
        }
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}'
        }
        res = requests.post(API_URL, headers=headers, json=payload, timeout=30)
        
        if res.status_code != 200:
            return f'AI Error: {res.text}'
            
        return res.json()['choices'][0]['message']['content']
    except Exception as e:
        return f'AI Error: {str(e)}'