# Role-Based Access Control (RBAC)

## Roles

### SuperUser
- **Platform administrator** — only created by other SuperUsers
- Can see and manage **ALL servers** across all tenants
- Can allocate/assign servers
- Can create other SuperUsers via `/api/auth/superuser`

### Manager (TenantAdmin)
- **Tenant administrator** — created via `/api/auth/signup`
- Can see and manage all servers in **their tenant only**
- Can create regular users in their tenant (todo)
- Cannot see servers from other tenants

### User (Regular)
- **Limited functionality** — created by managers
- Can see and manage **only their own servers**
- Cannot edit tenant settings or create users
- Cannot see other users' servers

## Setup

### 1. Initialize Database and Create Admin SuperUser

```bash
cd api

# Create admin superuser
python init_admin.py admin@beamcast.local supersecurepassword

# Output:
# ✅ Created superuser: admin@beamcast.local
# ✅ Default tenant: Default (id=1)
```

The script will:
- Create the database tables (if they don't exist)
- Create a "Default" tenant
- Create a superuser admin account
- Exit if the user already exists

### 2. TenantAdmin Sign Up (Creates Own Tenant)

New organizations sign up via `/api/auth/signup` and become TenantAdmins:

```bash
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "acme@company.com",
    "password": "securepassword123"
  }'

# Response:
# {
#   "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
#   "user": {
#     "id": 2,
#     "email": "acme@company.com",
#     "role": "manager"
#   }
# }
# Creates new tenant "Acme" automatically
```

### 3. SuperUser Creates Other SuperUsers

Only SuperUsers can create new SuperUsers (via `/api/auth/superuser`):

```bash
curl -X POST http://localhost:8000/api/auth/superuser \
  -H "Authorization: Bearer <superuser-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin2@beamcast.local",
    "password": "securepassword456"
  }'

# Response:
# {
#   "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
#   "user": {
#     "id": 3,
#     "email": "admin2@beamcast.local",
#     "role": "superuser"
#   }
# }
```

### 3. Login

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@beamcast.local",
    "password": "supersecurepassword"
  }'
```

### 4. Get Current User Info

```bash
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer <token>"

# Response:
# {
#   "id": 1,
#   "email": "admin@beamcast.local",
#   "role": "superuser",
#   "tenantId": 1
# }
```

## JWT Token Payload

Tokens include role and tenant information:

```json
{
  "sub": "1",
  "email": "admin@beamcast.local",
  "role": "superuser",
  "tenant_id": 1,
  "jti": "uuid",
  "exp": 1234567890
}
```

## Server Management by Role

### SuperUser Behavior
- Can see all servers in their tenant
- Can delete any server in their tenant
- Can create servers (owned by themselves, but visible to all superusers in tenant)

### User Behavior (Current for non-superusers)
- Can only see their own servers
- Can only delete their own servers
- Can create servers

## Future Enhancements

- [ ] Manager role with tenant-specific permissions
- [ ] Regular user role with restricted access
- [ ] User management endpoints (create/update/delete users)
- [ ] Tenant management endpoints
- [ ] Fine-grained permission system
- [ ] Audit logging for role-based actions
