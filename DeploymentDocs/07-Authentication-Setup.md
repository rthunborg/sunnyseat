# Authentication Setup Guide

This guide covers creating admin users and obtaining JWT tokens for testing and administration.

## Prerequisites

- Backend API running (locally or in Azure)
- Access to PostgreSQL database
- BCrypt hash generation tool (provided)

## Quick Token Generation for Swagger

### Step 1: Generate Password Hash

```powershell
# Use the built-in hash tool
cd D:\SunnySeat\src\backend\Tools\HashTest
dotnet run "YourSecurePassword123!"

# Output will show:
# Generated Hash: $2a$12$...
# Copy this hash
```

### Step 2: Insert Admin User into Database

Connect to your database and run:

```sql
INSERT INTO admin_users (
    "Username",
    "Email",
    "PasswordHash",
    "Role",
    "IsActive",
    "CreatedAt",
    "LastLoginAt",
    "Claims"
) VALUES (
    'admin',
    'admin@sunnyseat.local',
    '$2a$12$<PASTE_YOUR_HASH_HERE>',  -- Use hash from Step 1
    'SuperAdmin',
    true,
    NOW(),
    NOW(),
    '[]'::jsonb
);

-- Verify
SELECT "Id", "Username", "Email", "Role" FROM admin_users;
```

### Step 3: Get JWT Token via Swagger

1. Open Swagger UI:
   - Local: http://localhost:5000/swagger
   - Azure: https://your-api.azurewebsites.net/swagger

2. Find **POST /api/auth/login**
3. Click **"Try it out"**
4. Enter credentials:
   ```json
   {
     "username": "admin",
     "password": "YourSecurePassword123!"
   }
   ```
5. Click **"Execute"**
6. Copy the ccessToken from response

### Step 4: Authorize in Swagger

1. Click **"Authorize"** button () at top of Swagger
2. Enter: Bearer YOUR_ACCESS_TOKEN_HERE
3. Click **"Authorize"** then **"Close"**
4. All protected endpoints now work! 

## Creating Multiple Admin Users

### Via SQL

```sql
-- Create regular admin
INSERT INTO admin_users ("Username", "Email", "PasswordHash", "Role", "IsActive", "CreatedAt", "LastLoginAt", "Claims")
VALUES ('john.doe', 'john@sunnyseat.com', '$2a$12$HashGoesHere', 'Admin', true, NOW(), NOW(), '[]'::jsonb);

-- Create super admin
INSERT INTO admin_users ("Username", "Email", "PasswordHash", "Role", "IsActive", "CreatedAt", "LastLoginAt", "Claims")
VALUES ('super.admin', 'super@sunnyseat.com', '$2a$12$HashGoesHere', 'SuperAdmin', true, NOW(), NOW(), '[]'::jsonb);
```

### Via API (Future Enhancement)

If you implement a user registration endpoint:

```powershell
curl -X POST "https://your-api/api/admin/users" 
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" 
  -H "Content-Type: application/json" 
  -d '{
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "role": "Admin"
  }'
```

## Password Hash Generator Script

Save this as generate-password-hash.ps1:

```powershell
param(
    [Parameter(Mandatory=$true)]
    [string]$Password
)

$projectPath = "D:\SunnySeat\src\backend\Tools\HashTest"

if (-not (Test-Path $projectPath)) {
    Write-Host " HashTest tool not found at $projectPath" -ForegroundColor Red
    exit 1
}

cd $projectPath
$output = dotnet run $Password 2>&1
Write-Host $output
```

Usage:
```powershell
.\generate-password-hash.ps1 -Password "MySecurePassword!"
```

## Token Management

### Check Token Expiration

Tokens expire after 8 hours by default. Decode token at https://jwt.io to see expiration.

### Refresh Token

Use the refresh token endpoint:

```powershell
curl -X POST "https://your-api/api/auth/refresh" 
  -H "Content-Type: application/json" 
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

### Logout

```powershell
curl -X POST "https://your-api/api/auth/logout" 
  -H "Content-Type: application/json" 
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

## Testing with Postman/Insomnia

1. Create a new request
2. Set URL: POST https://your-api/api/auth/login
3. Body (JSON):
   ```json
   {
     "username": "admin",
     "password": "YourPassword"
   }
   ```
4. Send request
5. Copy ccessToken from response
6. For other requests, add header:
   - Key: Authorization
   - Value: Bearer YOUR_ACCESS_TOKEN

## Security Best Practices

1. **Use strong passwords** (min 12 characters, mixed case, numbers, symbols)
2. **Never commit credentials** to Git
3. **Rotate passwords regularly** in production
4. **Use different passwords** for dev/staging/prod
5. **Store production secrets** in Azure Key Vault
6. **Enable MFA** for production admin accounts (future)

## Troubleshooting

### "Invalid username or password"

- Verify password hash was generated correctly
- Check password in SQL matches what you're typing
- Ensure username is correct (case-sensitive)

### "Token expired"

- Generate new token using login endpoint
- Tokens expire after 8 hours
- Use refresh token to get new access token

### "Unauthorized" on protected endpoints

- Click "Authorize" button in Swagger
- Ensure token starts with "Bearer " in Authorization header
- Check token hasn't expired

### Cannot insert admin user - "duplicate key"

Username already exists. Use different username:
```sql
SELECT "Username" FROM admin_users;  -- Check existing users
```

## Quick Reference

**Production Admin Setup:**
1. Generate hash: dotnet run "ProductionPassword123!"
2. Insert into Azure PostgreSQL via Azure Data Studio
3. Test login via Azure API Swagger
4. Store password in password manager

**Development Admin Setup:**
1. Generate hash: dotnet run "DevPassword123!"
2. Insert into local PostgreSQL
3. Test login via local Swagger
4. Use for local development and testing

## Related Documents

- [01-Local-Development-Setup.md](01-Local-Development-Setup.md) - Local setup
- [03-Backend-Deployment-Azure.md](03-Backend-Deployment-Azure.md) - Backend deployment
- [09-Common-Issues.md](09-Common-Issues.md) - Troubleshooting
