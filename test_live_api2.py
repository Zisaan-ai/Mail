import requests

BASE_URL = 'https://email-marketer-ijk5.onrender.com'

# The index.html loads fine.
# Let's try to fetch a non-existent API route to see if FastAPI is up
r = requests.get(f'{BASE_URL}/api/nonexistent')
print('Nonexistent route:', r.status_code, r.text)

# Now let's try the DB error
r = requests.get(f'{BASE_URL}/api/contacts')
print('Contacts route:', r.status_code, r.text)
