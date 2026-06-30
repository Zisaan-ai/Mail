import requests
import json
import uuid

BASE_URL = 'https://email-marketer-ijk5.onrender.com/api'
test_username = f'testuser_{uuid.uuid4().hex[:6]}'
password = 'password123'

print('1. Testing Registration...')
r = requests.post(f'{BASE_URL}/auth/register', json={'username': test_username, 'password': password})
if r.status_code == 200:
    print('? Registration successful (Postgres DB working!)')
else:
    print('? Registration failed:', r.status_code, r.text)

print('\n2. Testing Login...')
r = requests.post(f'{BASE_URL}/auth/token', data={'username': test_username, 'password': password})
if r.status_code == 200:
    token = r.json().get('access_token')
    headers = {'Authorization': f'Bearer {token}'}
    print('? Login successful')
else:
    print('? Login failed:', r.text)
    headers = {}

if headers:
    print('\n3. Testing Contact Creation...')
    r = requests.post(f'{BASE_URL}/contacts', json={'name': 'Neon Test', 'email': 'neon@test.com', 'tags': 'test'}, headers=headers)
    if r.status_code == 200:
        print('? Contact creation successful (Data saved to Cloud DB!)')
    else:
        print('? Contact creation failed:', r.text)

    print('\n4. Testing Gemini AI Email Generation...')
    r = requests.post(f'{BASE_URL}/ai/generate', json={'prompt': 'Write a short hello email'}, headers=headers)
    if r.status_code == 200:
        reply = r.json()
        if 'html' in reply and 'Error:' not in reply['html']:
            print('? AI Generation successful (Gemini API working!)')
            print('AI Output snippet:', reply['html'][:50] + '...')
        else:
            print('?? AI Generation returned error message (Key might be invalid or missing):', reply)
    else:
        print('? AI Generation failed:', r.status_code, r.text)

print('\nAll tests finished.')
