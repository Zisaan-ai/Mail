import requests
import uuid

BASE_URL = 'https://email-marketer-ijk5.onrender.com/api'
test_username = f'testuser_{uuid.uuid4().hex[:6]}'

r = requests.post(f'{BASE_URL}/auth/register', json={'username': test_username, 'password': '123'})
print(r.status_code, r.text)
