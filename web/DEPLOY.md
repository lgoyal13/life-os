# Life OS Web Dashboard - Deployment

## Vercel Deployment

**Production URL:** https://web-beta-ten-34.vercel.app

### Deploy Hook

Trigger a new deployment by calling:

```bash
curl -X POST https://api.vercel.com/v1/integrations/deploy/prj_qfMM9bSYKDfnX5fW3pfwvn4mA1KS/5pEOxlkVDn
```

### Manual Deployment

From the `web/` directory:

```bash
npx vercel --prod
```

### Environment Variables

Set in Vercel dashboard or via CLI:

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon/public key (JWT format for Edge Functions)

## Supabase Edge Functions

Deploy from the project root:

```bash
# Deploy capture function
SUPABASE_ACCESS_TOKEN=<token> npx supabase functions deploy capture --project-ref hgnvvlytvukuauonibxm

# Deploy edit-item function
SUPABASE_ACCESS_TOKEN=<token> npx supabase functions deploy edit-item --project-ref hgnvvlytvukuauonibxm
```

### Edge Function Secrets

```bash
SUPABASE_ACCESS_TOKEN=<token> npx supabase secrets set GEMINI_API_KEY=<key> --project-ref hgnvvlytvukuauonibxm
```

## CI/CD

GitHub auto-deploy is enabled. Pushes to `main` automatically trigger production deployments.
