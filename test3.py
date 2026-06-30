import requests

BASE_URL = 'https://email-marketer-ijk5.onrender.com/api'
try:
    r = requests.post(f'{BASE_URL}/auth/register', json={'username': 'test1', 'password': '123'})
    print(r.status_code, r.text)
except Exception as e:
    print(e)
