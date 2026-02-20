# UK Takeaway Phone Order Assistant Dashboard

## Demo Mode

This application runs in **demo mode** by default (`DEMO_MODE=true` in `.env.local`).

### What Demo Mode Provides
- Mock data for 2 users and 10 sample calls
- Full dashboard functionality without database setup
- Safe for development and testing

### Environment Variables

```bash
# Demo Mode
DEMO_MODE=true

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
```

### Development

```bash
npm install
npm run dev
```

### Migration to Production

To use a real database (Vercel Postgres):
1. Set up Vercel Postgres database
2. Update `.env.local` with database connection strings
3. Remove or set `DEMO_MODE=false`
4. Run migrations to create tables

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for details.
