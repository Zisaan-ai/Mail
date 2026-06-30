import requests
import time

url = "https://email-marketer-ijk5.onrender.com/api/migrate"
print("Triggering DB Migration on Render...")
for i in range(20):
    try:
        r = requests.get(url)
        if "Migration successful" in r.text or "column \"email\"" in r.text or "already exists" in r.text or "does not exist" in r.text:
            print("Response:", r.text)
            if "is_admin" not in r.text:
                print("New code hit!")
                break
        else:
            print("Response:", r.text)
    except Exception as e:
        print("Error:", e)
    print(f"Waiting 10s... ({i+1}/20)")
    time.sleep(10)
