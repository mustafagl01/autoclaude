# Migration Guide: Demo Mode to Vercel Postgres

## Prerequisites
- Vercel account
- Vercel Postgres database created

## Steps

1. **Create Vercel Postgres Database**
   - Go to Vercel dashboard → Storage → Create Database
   - Choose Postgres
   - Copy connection strings

2. **Update Environment Variables**
   ```bash
   # Disable demo mode
   DEMO_MODE=false

   # Add Vercel Postgres connection
   POSTGRES_URL=your-postgres-url
   POSTGRES_PRISMA_URL=your-postgres-prisma-url
   POSTGRES_URL_NON_POOLING=your-postgres-url-non-pooling
   ```

3. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

## Troubleshooting

### Error: "D1 database binding not found"
**Cause**: Demo mode not enabled, but no real database configured
**Fix**: Set `DEMO_MODE=true` in `.env.local`

### Login Error 500
**Cause**: Database connection failed
**Fix**: Check environment variables, ensure demo mode or database is configured

### API calls returning ReferenceError
**Cause**: Database variable scope bug (see issue #1 in QA_FIX_REQUEST.md)
**Fix**: Apply the fix documented in issue #1
