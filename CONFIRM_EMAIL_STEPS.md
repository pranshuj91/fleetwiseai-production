# ✅ How to Confirm Email in Supabase (2 Minutes)

## Quick Steps:

### **Method 1: SQL Editor (Fastest - 30 seconds)**

1. Go to: **https://supabase.com/dashboard/project/dphydlneamkkmraxjuxi**

2. Click **SQL Editor** (⚡ icon in left sidebar)

3. Click **"New Query"**

4. Paste this:
```sql
UPDATE auth.users 
SET email_confirmed_at = NOW(),
    confirmed_at = NOW()
WHERE email = 'shane@fleetwiseai.com';
```

5. Click **RUN** (or press Cmd/Ctrl + Enter)

6. You should see: "Success. No rows returned"

7. **DONE!** Account is now active.

---

### **Method 2: Dashboard UI (2 minutes)**

1. Go to: **https://supabase.com/dashboard/project/dphydlneamkkmraxjuxi**

2. Click **Authentication** (👤 icon in left sidebar)

3. Click **Users** tab

4. Find row: **shane@fleetwiseai.com**

5. Click the **three dots (...)** on the right side of the row

6. Select **"Confirm user"** or **"Confirm email"**

7. **DONE!** Account is now active.

---

### **Method 3: Disable Email Confirmation (For All New Users)**

1. Go to: **https://supabase.com/dashboard/project/dphydlneamkkmraxjuxi**

2. Click **Authentication** in left sidebar

3. Click **Settings** or **Configuration** tab

4. Scroll to **Email** section

5. Find **"Enable email confirmations"** toggle

6. **Turn it OFF**

7. Click **Save**

8. **DONE!** New users can login immediately without email confirmation.

---

## ✅ Test Login After Confirmation

```bash
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=shane@fleetwiseai.com&password=shane123"
```

Should return:
```json
{
  "access_token": "eyJhbGc...",
  "user": { ... }
}
```

---

## 🎯 Recommended: Method 1 (SQL)

It's the fastest - just paste and run the SQL!
