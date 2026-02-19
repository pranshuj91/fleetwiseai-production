#!/bin/bash
echo "🧪 TESTING SUPABASE MIGRATION"
echo "=============================="
echo ""

# Test 1: Backend health
echo "1. Backend Health Check..."
HEALTH=$(curl -s http://localhost:8001/api/health | grep -o "healthy")
if [ "$HEALTH" = "healthy" ]; then
    echo "   ✅ Backend is healthy"
else
    echo "   ❌ Backend health check failed"
fi

# Test 2: Check Supabase data
echo ""
echo "2. Checking Supabase Data..."
cd /app/backend
python3 << 'PYEOF'
import asyncio
import supabase_client as sb

async def check():
    companies = await sb.find_many('companies')
    users = await sb.find_many('users')
    print(f"   ✅ Found {len(companies)} companies in Supabase")
    print(f"   ✅ Found {len(users)} users in Supabase")
    return len(companies) > 0 and len(users) > 0

result = asyncio.run(check())
exit(0 if result else 1)
PYEOF

if [ $? -eq 0 ]; then
    echo "   ✅ Data verified in Supabase"
else
    echo "   ❌ No data found in Supabase"
fi

echo ""
echo "=============================="
echo "✅ MIGRATION TEST COMPLETE"
echo "=============================="
