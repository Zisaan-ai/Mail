import requests
import sys

BASE_URL = 'https://email-marketer-ijk5.onrender.com/api'

print('1. Testing Registration...')
r = requests.post(f'{BASE_URL}/auth/register', json={'username': 'testuser2', 'password': 'password123'})
if r.status_code == 200:
    print('Registration successful')
elif r.status_code == 400 and 'already registered' in r.text:
    print('User already exists (expected)')
else:
    print('Registration failed:', r.text)
    sys.exit(1)

print('2. Testing Login...')
r = requests.post(f'{BASE_URL}/auth/token', data={'username': 'testuser2', 'password': 'password123'})
if r.status_code != 200:
    print('Login failed:', r.text)
    sys.exit(1)

token = r.json().get('access_token')
headers = {'Authorization': f'Bearer {token}'}
print('Login successful')

print('3. Testing Contact Creation...')
r = requests.post(f'{BASE_URL}/contacts', json={'name': 'Test User', 'email': 'test@example.com'}, headers=headers)
if r.status_code == 200 or r.status_code == 400:
    print('Contact creation test passed')
else:
    print('Contact creation failed:', r.text)
    sys.exit(1)

print('4. Testing Campaign Creation...')
r = requests.post(f'{BASE_URL}/campaigns/send', json={
    'subject': 'Render Test Email',
    'body': '<h1>Hello</h1><p>This is a test from Render.</p>',
    'leads': [{'email': 'test@example.com', 'name': 'Test'}]
}, headers=headers)

if r.status_code == 200:
    print('Campaign creation successful:', r.json())
else:
    print('Campaign creation failed:', r.text)
    sys.exit(1)

print('ALL TESTS PASSED SUCCESSFULLY!')
