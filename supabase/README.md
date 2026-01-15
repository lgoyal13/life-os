# Life OS Supabase Setup

## Quick Start

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Name: `life-os` (or your preference)
5. Database Password: Generate a strong password (save it!)
6. Region: Choose closest to you
7. Click "Create new project" and wait ~2 minutes

### 2. Run Database Migrations

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy contents of `migrations/001_create_tables.sql` and run it
4. Create another query, copy `migrations/002_seed_data.sql` and run it

### 3. Get API Credentials

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

### 4. Configure Frontend

Create `web/.env`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_CAPTURE_API_URL=https://your-project-id.supabase.co/functions/v1/capture
```

### 5. Deploy Capture Edge Function

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project (find project ref in Settings → General)
supabase link --project-ref your-project-ref

# Set Gemini API key secret
supabase secrets set GEMINI_API_KEY=your-gemini-api-key

# Deploy the function
supabase functions deploy capture --no-verify-jwt
```

### 6. Test

1. Start the frontend: `cd web && npm run dev`
2. Open http://localhost:5173
3. You should see the seeded items
4. Click + to add a new item

## Files

- `migrations/001_create_tables.sql` - Database schema
- `migrations/002_seed_data.sql` - Sample data
- `functions/capture/index.ts` - AI capture Edge Function

## Troubleshooting

**"Failed to fetch" errors:**
- Check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set correctly
- Make sure you ran the migration SQL

**Capture not working:**
- Verify VITE_CAPTURE_API_URL is set
- Check that the Edge Function is deployed: `supabase functions list`
- Check function logs: `supabase functions logs capture`

**Items not appearing:**
- Check Supabase Table Editor to see if data exists
- Verify RLS policies are in place (the migration adds permissive policies)
