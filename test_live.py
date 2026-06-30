import requests

url = "https://email-marketer-ijk5.onrender.com/api/auth/register"
r = requests.post(url, json={"email": "higanbana@test.com", "password": "pass"})
print("Register:", r.text)
