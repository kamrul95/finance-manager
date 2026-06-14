# Finance Manager

Personal finance web app — multi-wallet, subcategories, budgets, goals, debt tracking, xlsx import from Money Manager.

**Stack:** Next.js 15 · TypeScript · PostgreSQL (Supabase) · Prisma · Tailwind · Recharts

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Create a Supabase project (free, no credit card)
1. Go to https://supabase.com → New project
2. Save the DB password — you'll need it in step 3

### 3. Set up environment variables
```bash
cp .env.example .env.local
```

Edit `.env.local`:
| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings → API → anon public key |
| `DATABASE_URL` | Settings → Database → Connection string (URI) + `?pgbouncer=true` |
| `DIRECT_URL` | Same URI without `?pgbouncer=true` |

### 4. Push database schema
```bash
npm run db:generate
npm run db:push
```

### 5. Run locally
```bash
npm run dev
```
Open http://localhost:3000 → sign up → import your xlsx.

---

## Import Money Manager data
1. In Money Manager app: Export → Excel
2. Go to `/import` in the app
3. Upload the .xlsx file — wallets, categories, and all transactions are imported automatically

---

## Deploy to Vercel (free)
1. Push this folder to a GitHub repo
2. Vercel → Import project → select repo
3. Add your `.env.local` variables under Settings → Environment Variables
4. Deploy — you get a free HTTPS URL instantly

---

## Pages
| Route | Description |
|---|---|
| `/` | Dashboard — net worth, charts, recent transactions |
| `/transactions` | Full transaction list with filter + add form |
| `/wallets` | Wallet management |
| `/categories` | Category + subcategory tree |
| `/budgets` | Monthly budgets with progress bars |
| `/goals` | Savings goals |
| `/debts` | Lend/borrow tracker |
| `/reports` | Charts: trend, pie, savings line |
| `/import` | xlsx import |
| `/settings` | Account |
