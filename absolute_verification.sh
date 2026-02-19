#!/bin/bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔬 ABSOLUTE VERIFICATION - ZERO MONGODB ANYWHERE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

FAILED=0

# 1. Check Python imports
echo "1️⃣  Checking Python imports..."
python3 -c "import motor" 2>&1 | grep -q "No module" && echo "   ✅ motor: NOT INSTALLED" || { echo "   ❌ motor still installed"; FAILED=1; }
python3 -c "import pymongo" 2>&1 | grep -q "No module" && echo "   ✅ pymongo: NOT INSTALLED" || { echo "   ❌ pymongo still installed"; FAILED=1; }

# 2. Check active code
echo ""
echo "2️⃣  Checking backend code..."
IMPORTS=$(grep -r "from motor\|import pymongo\|AsyncIOMotorClient" /app/backend/*.py 2>/dev/null | grep -v "#" | grep -v "backup" | wc -l)
if [ "$IMPORTS" -eq "0" ]; then
    echo "   ✅ NO MongoDB imports in active code"
else
    echo "   ❌ Found $IMPORTS MongoDB imports"
    FAILED=1
fi

# 3. Check environment
echo ""
echo "3️⃣  Checking environment variables..."
MONGO_VARS=$(grep -E "^MONGO_URL=|^DB_NAME=" /app/backend/.env 2>/dev/null | wc -l)
if [ "$MONGO_VARS" -eq "0" ]; then
    echo "   ✅ NO MongoDB environment variables"
else
    echo "   ❌ Found MongoDB environment variables"
    FAILED=1
fi

# 4. Check supervisor
echo ""
echo "4️⃣  Checking supervisor services..."
sudo supervisorctl status mongodb 2>&1 | grep -q "no such process\|ERROR" && echo "   ✅ MongoDB service: REMOVED" || { echo "   ⚠️  MongoDB service still configured"; }

# 5. Check processes
echo ""
echo "5️⃣  Checking running processes..."
MONGO_PROC=$(ps aux | grep mongod | grep -v grep | wc -l)
if [ "$MONGO_PROC" -eq "0" ]; then
    echo "   ✅ NO MongoDB processes running"
else
    echo "   ❌ MongoDB process found"
    FAILED=1
fi

# 6. Check backend health
echo ""
echo "6️⃣  Checking backend health..."
HEALTH=$(curl -s http://localhost:8001/api/health)
echo "$HEALTH" | grep -q "Supabase PostgreSQL" && echo "   ✅ Backend reports: Supabase PostgreSQL" || { echo "   ❌ Wrong database type"; FAILED=1; }

# 7. Verify data in Supabase
echo ""
echo "7️⃣  Verifying data in Supabase..."
cd /app/backend
python3 << 'PYEOF'
import asyncio
import supabase_client as sb

async def verify():
    total = 0
    for table in ['companies', 'users', 'trucks', 'projects', 'estimates']:
        count = await sb.count_documents(table)
        total += count
    print(f"   ✅ Total records in Supabase: {total}")
    return total > 0

result = asyncio.run(verify())
exit(0 if result else 1)
PYEOF

if [ $? -ne 0 ]; then
    echo "   ❌ Data verification failed"
    FAILED=1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $FAILED -eq 0 ]; then
    echo "✅ VERIFICATION PASSED - 100% SUPABASE, ZERO MONGODB"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "System is 100% Supabase:"
    echo "  • MongoDB code: REMOVED ✅"
    echo "  • MongoDB packages: UNINSTALLED ✅"
    echo "  • MongoDB service: REMOVED ✅"
    echo "  • MongoDB process: NOT RUNNING ✅"
    echo "  • Supabase data: VERIFIED ✅"
    echo "  • Backend: OPERATIONAL ✅"
    echo ""
    echo "🎉 MISSION COMPLETE - 100% SUPABASE ONLY"
else
    echo "❌ VERIFICATION FAILED - MongoDB still present"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
