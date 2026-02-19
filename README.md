# Fleetwise AI - Frontend Only
backend in supabase

This is a frontend-only React application ready for Lovable AI backend generation.

### Local Development

```bash
npm install
npm run dev
```

The app will run on `http://localhost:3000`

### Vercel Deployment

This project is configured for Vercel deployment:

1. **Connect to Vercel:**
   - Import this repository in Vercel
   - Vercel will auto-detect the React app

2. **Build Settings:**
   - **Root Directory:** `.` (project root)
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`
   - **Install Command:** `npm install`

3. **Environment Variables (Optional for now):**
   - `REACT_APP_SUPABASE_URL` - Will be added by Lovable
   - `REACT_APP_SUPABASE_ANON_KEY` - Will be added by Lovable

4. **Deploy:**
   - Push to main branch for automatic deployment
   - Or deploy manually from Vercel dashboard

### Project Structure

```
/
├── src/
│   ├── pages/          # 65+ pages
│   ├── components/     # 29+ components
│   ├── services/       # Mock services (replace with Supabase)
│   ├── lib/            # API layer
│   └── contexts/       # Auth context
├── public/             # Static assets
├── plugins/            # Build plugins
├── package.json
└── vercel.json         # Vercel configuration
```

### Features

- ✅ **100% UI Preserved** - All pages and components functional
- ✅ **Mock Data** - Realistic data displays throughout
- ✅ **Auto-Login** - Bypassed authentication for demo
- ✅ **Ready for Supabase** - All integration points marked

### Documentation

- **LOVABLE_HANDOFF.md** - Complete guide for Lovable AI
- **REFACTORING_NOTES.md** - Technical refactoring details
- **README_FRONTEND_ONLY.md** - Quick reference

### Status

✅ **Frontend-only refactoring complete**
✅ **Ready for Lovable AI backend generation**
✅ **Vercel deployment configured**

---

**Next Steps:** Hand off to Lovable AI to implement Supabase backend
