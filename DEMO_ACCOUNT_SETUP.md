# 🔐 Demo Account Setup Instructions

## ✅ Account Created

**Email:** shane@fleetwiseai.com  
**Password:** shane123  
**Company:** FleetWise AI Demo Company  
**Role:** Company Admin

---

## ⚠️ Email Confirmation Required

Supabase has email confirmation enabled by default. To make the account work:

### **Option 1: Confirm Email in Supabase Dashboard (2 minutes)**

1. Go to: **https://supabase.com/dashboard/project/dphydlneamkkmraxjuxi**

2. Click **Authentication** in left sidebar

3. Click **Users** tab

4. Find user: **shane@fleetwiseai.com**

5. Click the **"..."** menu on the right

6. Select **"Confirm Email"**

7. Done! Account is now active.

---

### **Option 2: Disable Email Confirmation (Recommended for Demo)**

1. Go to: **https://supabase.com/dashboard/project/dphydlneamkkmraxjuxi**

2. Click **Authentication** in left sidebar

3. Click **Settings** or **Configuration**

4. Find **"Email Confirmations"** setting

5. Toggle **OFF** (disable email confirmation)

6. Save settings

7. Now you can register new accounts without email confirmation

---

## 🧪 Test Login

Once email is confirmed, test the login:

```bash
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=shane@fleetwiseai.com&password=shane123"
```

Expected response:
```json
{
  "access_token": "eyJhbGc...",
  "user": {
    "id": "...",
    "email": "shane@fleetwiseai.com",
    "full_name": "Shane Demo",
    "role": "company_admin",
    "company_id": "..."
  }
}
```

---

## 📝 Alternative: Use Existing Test Account

If you can't access Supabase dashboard, you can use an existing test account:

**Email:** test@fleetwise.com  
**Password:** TestPass123!

(This account may already have email confirmed)

---

## 🚀 Once Confirmed

After confirming the email, the demo account will have:
- ✅ Full access to FleetWise AI
- ✅ Company Admin role
- ✅ Can create trucks, projects, estimates
- ✅ Can manage users
- ✅ All features unlocked

---

## 🔧 Quick Disable Email Confirmation (CLI Method)

If you have direct database access:

```sql
-- Run in Supabase SQL Editor
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'shane@fleetwiseai.com';
```

This immediately confirms the email.

---

**Need help?** The account is created in Supabase, just needs email confirmation!
