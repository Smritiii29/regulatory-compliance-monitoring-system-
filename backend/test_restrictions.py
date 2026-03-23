"""Quick test for chat restrictions, OTP, and core endpoints."""
import requests

BASE = 'http://localhost:5000/api'
passes = 0
fails = []

def test(name, condition):
    global passes
    if condition:
        passes += 1
        print(f'  PASS: {name}')
    else:
        fails.append(name)
        print(f'  FAIL: {name}')

# Login as different roles
r = requests.post(BASE+'/auth/login', json={'email':'admin@college.edu.in','password':'admin123'})
admin_token = r.json()['token']
ah = {'Authorization': 'Bearer ' + admin_token}

r = requests.post(BASE+'/auth/login', json={'email':'principal@college.edu.in','password':'principal123'})
prin_token = r.json()['token']
ph = {'Authorization': 'Bearer ' + prin_token}

r = requests.post(BASE+'/auth/login', json={'email':'hod.cse@college.edu.in','password':'hod123'})
hod_token = r.json()['token']
hh = {'Authorization': 'Bearer ' + hod_token}

r = requests.post(BASE+'/auth/login', json={'email':'ravi.cse@college.edu.in','password':'faculty123'})
fac_token = r.json()['token']
fh = {'Authorization': 'Bearer ' + fac_token}

print('\n=== Chat Restrictions ===')

# Faculty contacts: should only see hod + principal
r = requests.get(BASE+'/chat/contacts', headers=fh)
fac_roles = set(c['role'] for c in r.json())
test('Faculty sees only hod+principal', fac_roles == {'hod', 'principal'})

# Admin contacts: should only see hod + principal
r = requests.get(BASE+'/chat/contacts', headers=ah)
admin_roles = set(c['role'] for c in r.json())
test('Admin sees only hod+principal', admin_roles == {'hod', 'principal'})

# HOD contacts: should see all roles
r = requests.get(BASE+'/chat/contacts', headers=hh)
hod_roles = set(c['role'] for c in r.json())
test('HOD sees all roles', hod_roles == {'admin', 'principal', 'hod', 'faculty'})

# Principal contacts: should see all roles
r = requests.get(BASE+'/chat/contacts', headers=ph)
prin_roles = set(c['role'] for c in r.json())
test('Principal sees all roles', prin_roles == {'admin', 'hod', 'faculty'})

# Faculty DM to admin: should be blocked
users = requests.get(BASE+'/auth/users', headers=ah).json()
admin_id = [u for u in users if u['role'] == 'admin'][0]['id']
r = requests.post(BASE+'/chat', headers=fh, json={'receiver_id': admin_id, 'message': 'test'})
test('Faculty cannot DM admin (403)', r.status_code == 403)

# Admin DM to faculty: should be blocked
fac_id = [u for u in users if u['email'] == 'ravi.cse@college.edu.in'][0]['id']
r = requests.post(BASE+'/chat', headers=ah, json={'receiver_id': fac_id, 'message': 'test'})
test('Admin cannot DM faculty (403)', r.status_code == 403)

# HOD DM to admin: should work
r = requests.post(BASE+'/chat', headers=hh, json={'receiver_id': admin_id, 'message': 'test from HOD'})
test('HOD can DM admin (201)', r.status_code == 201)

print('\n=== OTP Endpoints ===')

# Send OTP
r = requests.post(BASE+'/auth/send-otp', json={'email': 'testuser@example.com', 'name': 'Test'})
test('Send OTP endpoint works', r.status_code == 200)

# Verify OTP with wrong code
r = requests.post(BASE+'/auth/verify-otp', json={'email': 'testuser@example.com', 'otp': '000000'})
test('Bad OTP returns 400', r.status_code == 400)

print('\n=== Core Endpoints ===')

eps = [
    '/health', '/auth/me', '/auth/users', '/dashboard/stats',
    '/dashboard/accreditation', '/dashboard/activity', '/circulars',
    '/circulars/categories/summary', '/submissions', '/submissions/mine',
    '/notifications', '/notifications/unread-count', '/chat/contacts',
    '/chat/groups', '/reports/data',
]
for p in eps:
    h = ah if p != '/health' else {}
    r = requests.get(BASE + p, headers=h)
    test(f'GET {p} -> {r.status_code}', r.ok)

print(f'\n=== RESULTS: {passes} PASSED, {len(fails)} FAILED ===')
if fails:
    for f in fails:
        print(f'  FAILED: {f}')
else:
    print('  ALL TESTS PASSED!')
