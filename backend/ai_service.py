import os
import google.generativeai as genai

# Setup Gemini API
# This will pick up the GEMINI_API_KEY from environment variables on Render
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

# We use the free gemini-1.5-flash model, which is fast and very capable.
MODEL_NAME = "gemini-1.5-flash"

def generate_email_content(prompt: str) -> str:
    """Generates an email body based on the user's prompt."""
    if not api_key:
        return "<p>Error: Gemini API Key is missing. Please add GEMINI_API_KEY to your Render environment variables.</p>"
    
    try:
        model = genai.GenerativeModel(MODEL_NAME)
        # We instruct the model to return ONLY HTML
        full_prompt = f"""
You are an expert email marketing copywriter. 
Write a professional, engaging, and high-converting email based on the following instructions.
Return ONLY valid HTML code for the email body (do not include markdown formatting like ```html, just the raw HTML).
Do not include <html> or <body> tags, just the inner content like <h1>, <p>, <ul>, etc.
Use inline CSS if needed for styling. Keep it clean and modern.

User instructions: {prompt}
"""
        response = model.generate_content(full_prompt)
        text = response.text.strip()
        # Clean up markdown if the AI mistakenly adds it
        if text.startswith("```html"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()
    except Exception as e:
        return f"<p>AI Error: {str(e)}</p>"


def chat_with_assistant(message: str, history: list = None) -> str:
    """Answers user queries regarding email marketing and platform usage."""
    if not api_key:
        return "⚠️ Error: Gemini API Key is missing. Please add GEMINI_API_KEY to your Render environment variables to enable the AI assistant."
    
    try:
        model = genai.GenerativeModel(MODEL_NAME)
        system_instruction = "You are a helpful, friendly AI assistant built into the 'Pro Email Marketer' platform. You help users with email marketing strategies, subject lines, writing tips, and platform usage. Keep your answers concise, professional, and easy to read. Use formatting like bullet points when appropriate."
        
        # Build chat history for context
        formatted_history = []
        if history:
            for msg in history:
                role = "user" if msg.get("role") == "user" else "model"
                formatted_history.append({"role": role, "parts": [msg.get("content", "")]})
        
        # Start a chat session
        chat = model.start_chat(history=formatted_history)
        
        if not history:
            full_message = f"System: {system_instruction}\n\nUser: {message}"
        else:
            full_message = message

        response = chat.send_message(full_message)
        return response.text
    except Exception as e:
        return f"⚠️ AI Error: {str(e)}"
