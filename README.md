# Email Marketer Pro (SaaS Edition)

Welcome to your new MailChimp-style Email Marketing Platform!

## Features
- **User Authentication:** Secure JWT-based login system.
- **Audience Management:** Add and manage your contacts and tag them easily.
- **Campaign Builder:** Compose emails with premium built-in templates (Gig Promotion, Cold Emails).
- **Analytics & Tracking:** Real-time tracking of email **Open Rates** via invisible pixels.
- **Background Processing:** Send bulk emails asynchronously without freezing the app.

## How to Run Locally

### Prerequisites
- Python 3.10+
- SMTP Credentials (e.g., Gmail App Password)

### Setup Instructions
1. Open a terminal in the `backend` folder.
2. Create a virtual environment and install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: .\venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Create a `.env` file in the `backend` folder with your SMTP details:
   ```env
   SMTP_SERVER=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   ```
4. Start the server:
   ```bash
   uvicorn main:app --reload
   ```
5. Open your browser and go to `http://127.0.0.1:8000`

## Deployment (24/7 Free Hosting on Render)

We have configured a `render.yaml` file to make deploying to Render.com a 1-click process.

### Step-by-step Guide:
1. Push this entire folder to a **GitHub Repository**.
2. Create a free account on [Render.com](https://render.com).
3. Click on **New +** and select **Blueprint**.
4. Connect your GitHub account and select this repository.
5. Render will automatically read the `render.yaml` file and set up the Web Service.
6. Once deployed, Render will provide a free URL (e.g. `your-app.onrender.com`).
7. **Important**: Remember to go to the Environment Variables tab in Render and add your `SMTP_SERVER`, `SMTP_PORT`, `SMTP_USERNAME`, and `SMTP_PASSWORD` so emails can be sent.
8. Your Email Marketing Platform is now live 24/7 for free!
