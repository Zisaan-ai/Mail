import requests
import time

url = "https://email-marketer-ijk5.onrender.com/api/migrate"
print("Triggering DB Migration on Render...")
for i in range(10): # retry for 2 mins while Render deploys
    try:
        r = requests.get(url)
        if r.status_code == 200:
            print("Success!", r.text)
            break
        else:
            print("Failed, status code:", r.status_code, r.text)
    except Exception as e:
        print("Error:", e)
    print("Waiting 10s...")
    time.sleep(10)
