import requests
import json

url = "https://email-marketer-ijk5.onrender.com"

# 1. Register
r1 = requests.post(f"{url}/api/auth/register", json={"email": "deepcheck@test.com", "password": "pass"})
print("Register Status:", r1.status_code)
print("Register Body:", r1.text)

# 2. Login (should fail if not verified, or fail if not created)
r2 = requests.post(f"{url}/api/auth/token", data={"username": "deepcheck@test.com", "password": "pass"})
print("Login Status:", r2.status_code)
print("Login Body:", r2.text)

