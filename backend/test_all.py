"""
RCMS Backend - Comprehensive Test Script
Run: python test_all.py  (while Flask is running on port 5000)
"""
import requests
import sys

BASE = 'http://localhost:5000/api'
passed = 0
failed = 0
results = []

def test(name, condition, detail=''):
    global passed, failed
    if condition:
        passed += 1
        results.append(f'  PASS  {name}')
    else:
        failed += 1
        results.append(f'  FAIL  {name}  {detail}')

def get(path, headers=None):
    return requests.get(BASE + path, headers=headers, timeout=10)

def post(path, json=None, headers=None):
    return requests.post(BASE + path, json=json, headers=headers, timeout=10)

def put(path, json=None, headers=None):
    return requests.put(BASE + path, json=json, headers=headers, timeout=10)

def delete(path, headers=None):
    return requests.delete(BASE + path, headers=headers, timeout=10)


print('=' * 60)
print('  RCMS Backend Test Suite')
print('=' * 60)

# ── 1. Health Check ──────────────────────────────────────────
print('\n[1] Health Check')
r = get('/health')
test('Health endpoint', r.ok, str(r.status_code))

# ── 2. Demo/Seed users should NOT be able to login ──────────
print('\n[2] Seed Users Blocked')
r = post('/auth/login', json={'email': 'admin@college.edu.in', 'password': 'admin123'})
test('Seed admin cannot login', r.status_code == 403, f'{r.status_code}: {r.json().get("error","")}')

r = post('/auth/login', json={'email': 'principal@college.edu.in', 'password': 'principal123'})
test('Seed principal cannot login', r.status_code == 403, f'{r.status_code}')

r = post('/auth/login', json={'email': 'hod.cse@college.edu.in', 'password': 'hod123'})
test('Seed HOD cannot login', r.status_code == 403, f'{r.status_code}')

r = post('/auth/login', json={'email': 'ravi.cse@college.edu.in', 'password': 'faculty123'})
test('Seed faculty cannot login', r.status_code == 403, f'{r.status_code}')

# ── 3. Signup Flow ───────────────────────────────────────────
print('\n[3] Signup & Login')
# Signup a new admin (for testing)
r = post('/auth/signup', json={
    'name': 'Test Admin', 'email': 'testadmin@test.com',
    'password': 'test123', 'role': 'admin', 'department': ''
})
test('Signup new admin', r.status_code == 201, f'{r.status_code}')
admin_token = r.json().get('token', '') if r.ok else ''
ah = {'Authorization': f'Bearer {admin_token}'}

# Signup a faculty
r = post('/auth/signup', json={
    'name': 'Test Faculty', 'email': 'testfac@test.com',
    'password': 'test123', 'role': 'faculty', 'department': 'CSE'
})
test('Signup new faculty', r.status_code == 201, f'{r.status_code}')
fac_token = r.json().get('token', '') if r.ok else ''
fh = {'Authorization': f'Bearer {fac_token}'}

# Login with newly signed-up user
r = post('/auth/login', json={'email': 'testadmin@test.com', 'password': 'test123'})
test('Signed-up admin can login', r.ok, f'{r.status_code}')
if r.ok:
    admin_token = r.json()['token']
    ah = {'Authorization': f'Bearer {admin_token}'}

r = post('/auth/login', json={'email': 'testfac@test.com', 'password': 'test123'})
test('Signed-up faculty can login', r.ok, f'{r.status_code}')
if r.ok:
    fac_token = r.json()['token']
    fh = {'Authorization': f'Bearer {fac_token}'}

# ── 4. Auth Endpoints ───────────────────────────────────────
print('\n[4] Auth Endpoints')
r = get('/auth/me', headers=ah)
test('GET /auth/me', r.ok, str(r.status_code))

r = get('/auth/users', headers=ah)
test('GET /auth/users', r.ok, str(r.status_code))
users = r.json() if r.ok else []

r = get('/auth/users?role=faculty', headers=ah)
test('Filter users by role', r.ok, str(r.status_code))

r = get('/auth/users?department=CSE', headers=ah)
test('Filter users by department', r.ok, str(r.status_code))

r = get('/auth/users?role=all_roles', headers=ah)
test('Filter all_roles returns all', r.ok and len(r.json()) > 1, str(r.status_code))

r = get('/auth/users?department=all_departments', headers=ah)
test('Filter all_departments returns all', r.ok and len(r.json()) > 1, str(r.status_code))

# ── 5. User Management ──────────────────────────────────────
print('\n[5] User Management (CRUD)')
r = post('/auth/users', json={
    'name': 'Created User', 'email': 'created@test.com',
    'password': 'pw123', 'role': 'faculty', 'department': 'IT'
}, headers=ah)
test('Admin create user', r.status_code == 201, f'{r.status_code}')
created_id = r.json().get('id', 0) if r.ok else 0

# Created user can login (is_verified=True by default)
if created_id:
    r = post('/auth/login', json={'email': 'created@test.com', 'password': 'pw123'})
    test('Admin-created user can login', r.ok, f'{r.status_code}')

    r = put(f'/auth/users/{created_id}/toggle', headers=ah)
    test('Toggle user active', r.ok, str(r.status_code))

    r = put(f'/auth/users/{created_id}/toggle', headers=ah)
    test('Toggle user back', r.ok, str(r.status_code))

    r = delete(f'/auth/users/{created_id}', headers=ah)
    test('Delete user', r.ok, str(r.status_code))

# ── 6. Dashboard Endpoints ──────────────────────────────────
print('\n[6] Dashboard')
for ep in ['/dashboard/stats', '/dashboard/accreditation', '/dashboard/activity']:
    r = get(ep, headers=ah)
    test(f'GET {ep}', r.ok, str(r.status_code))

# ── 7. Circulars ────────────────────────────────────────────
print('\n[7] Circulars')
r = get('/circulars', headers=ah)
test('GET /circulars', r.ok, str(r.status_code))

r = get('/circulars/categories/summary', headers=ah)
test('GET /circulars/categories/summary', r.ok, str(r.status_code))

# ── 8. Submissions ──────────────────────────────────────────
print('\n[8] Submissions')
r = get('/submissions', headers=ah)
test('GET /submissions', r.ok, str(r.status_code))

r = get('/submissions/mine', headers=fh)
test('GET /submissions/mine (faculty)', r.ok, str(r.status_code))

# ── 9. Notifications ────────────────────────────────────────
print('\n[9] Notifications')
r = get('/notifications', headers=ah)
test('GET /notifications', r.ok, str(r.status_code))

r = get('/notifications/unread-count', headers=ah)
test('GET /notifications/unread-count', r.ok, str(r.status_code))

r = put('/notifications/read-all', headers=ah)
test('PUT /notifications/read-all', r.ok, str(r.status_code))

# ── 10. Chat ────────────────────────────────────────────────
print('\n[10] Chat & Restrictions')
r = get('/chat/contacts', headers=ah)
test('GET /chat/contacts (admin)', r.ok, str(r.status_code))

r = get('/chat/groups', headers=ah)
test('GET /chat/groups', r.ok, str(r.status_code))

# Admin contacts should NOT include faculty
if r.ok:
    contacts = get('/chat/contacts', headers=ah).json()
    contact_roles = {c['role'] for c in contacts}
    test('Admin contacts exclude faculty', 'faculty' not in contact_roles, f'roles: {contact_roles}')

# Faculty contacts should NOT include admin
contacts_fac = get('/chat/contacts', headers=fh).json()
fac_contact_roles = {c['role'] for c in contacts_fac}
test('Faculty contacts exclude admin', 'admin' not in fac_contact_roles, f'roles: {fac_contact_roles}')

# Faculty DM to admin should be blocked
admin_users = [u for u in users if u['role'] == 'admin']
if admin_users:
    r = post('/chat', json={'receiver_id': admin_users[0]['id'], 'message': 'blocked?'}, headers=fh)
    test('Faculty DM to admin blocked (403)', r.status_code == 403, str(r.status_code))

# ── 11. Reports ─────────────────────────────────────────────
print('\n[11] Reports')
r = get('/reports/data', headers=ah)
test('GET /reports/data', r.ok, str(r.status_code))

# ── 12. OTP Endpoints ───────────────────────────────────────
print('\n[12] OTP Endpoints')
r = post('/auth/send-otp', json={'email': 'otp.test@example.com', 'name': 'OTP Test'})
test('POST /auth/send-otp exists', r.status_code in (200, 500), f'{r.status_code}')

r = post('/auth/verify-otp', json={'email': 'otp.test@example.com', 'otp': '000000'})
test('POST /auth/verify-otp exists', r.status_code in (200, 400), f'{r.status_code}')

# ── 13. Duplicate signup check ──────────────────────────────
print('\n[13] Edge Cases')
r = post('/auth/signup', json={
    'name': 'Dup', 'email': 'testadmin@test.com',
    'password': 'x', 'role': 'faculty', 'department': 'CSE'
})
test('Duplicate email rejected (409)', r.status_code == 409, str(r.status_code))

r = post('/auth/login', json={'email': 'nonexistent@x.com', 'password': 'x'})
test('Wrong email rejected (401)', r.status_code == 401, str(r.status_code))

r = post('/auth/login', json={'email': 'testadmin@test.com', 'password': 'wrongpw'})
test('Wrong password rejected (401)', r.status_code == 401, str(r.status_code))

# ── Cleanup: delete test users ──────────────────────────────
print('\n[Cleanup]')
users_now = get('/auth/users', headers=ah).json()
for u in users_now:
    if u['email'] in ('testadmin@test.com', 'testfac@test.com', 'created@test.com'):
        delete(f'/auth/users/{u["id"]}', headers=ah)
print('  Test users cleaned up.')

# ── Summary ─────────────────────────────────────────────────
print('\n' + '=' * 60)
for line in results:
    print(line)
print('=' * 60)
print(f'\n  TOTAL: {passed} passed, {failed} failed out of {passed + failed}')
if failed == 0:
    print('  ALL TESTS PASSED!')
else:
    print(f'  {failed} test(s) FAILED')
print()

sys.exit(0 if failed == 0 else 1)
