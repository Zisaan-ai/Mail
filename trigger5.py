import requests
import time

url = "https://email-marketer-ijk5.onrender.com/api/migrate"
print("Triggering DB Update on Render...")
for i in range(20):
    try:
        r = requests.get(url)
        print("Response:", r.text)
        if "already exists" in r.text or "verification_code" in r.text:
            print("New Code deployed and Migration already applied!")
            break
    except Exception as e:
        print("Error:", e)
    print(f"Waiting 10s... ({i+1}/20)")
    time.sleep(10)
