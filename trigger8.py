import requests
import time

url = "https://email-marketer-ijk5.onrender.com/api/reset-users"
print("Triggering DB Reset on Render...")
for i in range(20):
    try:
        r = requests.get(url)
        print("Response:", r.text)
        if "All users deleted" in r.text:
            print("Users wiped successfully!")
            break
    except Exception as e:
        print("Error:", e)
    print(f"Waiting 10s... ({i+1}/20)")
    time.sleep(10)
