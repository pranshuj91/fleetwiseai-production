# 🚀 Supabase Migration Setup Guide

## Step 1: Create Database Schema in Supabase

1. **Open Supabase SQL Editor:**
   - Go to: https://dphydlneamkkmraxjuxi.supabase.co
   - Click on **SQL Editor** in the left sidebar
   - Click **New Query**

2. **Copy and paste the entire contents of `supabase_schema.sql`**

3. **Run the query** (Click "Run" button or press Ctrl+Enter)

4. **Verify tables created:**
   - Go to **Table Editor** in sidebar
   - You should see 25+ tables created

## Step 2: Enable Supabase Auth

Already configured! Your Supabase project has auth enabled by default.

## Step 3: Test Connection

Run this command in your terminal:
```bash
cd /app/backend
python3 test_supabase_connection.py
```

## Step 4: Start Services

```bash
sudo supervisorctl restart all
```

## Step 5: Access Application

Frontend: http://localhost:3000 (or your deployed URL)
Backend API: http://localhost:8001/docs

## Next Steps After Schema Creation

Once you've created the schema in Supabase, let me know and I'll:
1. ✅ Update backend to use Supabase REST API
2. ✅ Implement Supabase Auth
3. ✅ Update all API endpoints
4. ✅ Update frontend to use Supabase
5. ✅ Test everything end-to-end

## Troubleshooting

**If tables don't create:**
- Check for error messages in SQL Editor
- Make sure you're running in the correct database
- Verify you have proper permissions

**If RLS policies block access:**
- Temporarily disable RLS for testing:
  ```sql
  ALTER TABLE tablename DISABLE ROW LEVEL SECURITY;
  ```
- Re-enable after testing

## Important Notes

- All tables use UUID as primary key
- Row Level Security (RLS) is enabled - users only see their company's data
- JSONB fields store complex nested data (like truck specs)
- Automatic timestamps (created_at, updated_at)
- Foreign key relationships maintain data integrity
