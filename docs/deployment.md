# Deploying to Vercel + Supabase

## 1. Database connections (the pooler)

A serverless host starts many short-lived copies of the app. If each opened its own connection to
Postgres, Supabase would run out of connections quickly. Supabase's **transaction pooler** shares a
small number of real connections between all of them, so the app uses it for every query.

`prisma migrate` needs a normal session, which the transaction pooler cannot give. So there are two
addresses, both from Supabase → Project Settings → Database → Connection string:

| Variable | Supabase tab | Port | Used by |
|---|---|---|---|
| `DATABASE_URL` | Transaction pooler | 6543 | the running app |
| `DIRECT_URL` | Session pooler | 5432 | `prisma migrate` only |

Add these parameters to the end of `DATABASE_URL`:

```
?pgbouncer=true&connection_limit=5&pool_timeout=30
```

- `pgbouncer=true` turns off prepared statements, which the transaction pooler does not support.
- `connection_limit=5` lets one app instance run up to five queries at once. Dashboard pages send
  many queries together, so `1` makes them queue and time out.
- `pool_timeout=30` waits up to 30 seconds for a free connection instead of 10.

The Session pooler address works over IPv4. Avoid the "Direct connection" address unless you have
Supabase's IPv4 add-on, because it is IPv6 only.

## 2. Region

`vercel.json` runs the app in `hnd1` (Tokyo) because the database is in `ap-northeast-1` (Tokyo).
A page makes many queries, so every extra round trip between a far-away server and the database
adds up. If you ever move the database, change this to the nearest Vercel region.

## 3. Environment variables to set in Vercel

| Variable | Value |
|---|---|
| `DATABASE_URL` | transaction pooler address with the parameters above |
| `DIRECT_URL` | session pooler address |
| `AUTH_SECRET` | a new random value: `openssl rand -base64 32`. Do not reuse the local one. It also encrypts the saved Google and WhatsApp credentials, so changing it later means re-entering them. |
| `NEXTAUTH_URL` | the live address, e.g. `https://yourdomain.com`. Password-reset emails link to it. |
| `CRON_SECRET` | a random value, used by the scheduled jobs |

Everything else (Google, WhatsApp, email, payments) is set from the app's own Settings → Integrations
page by the Super Admin, so it does not belong in Vercel.

## 4. Database changes

Run migrations from your own computer, never during the build:

```
npx prisma migrate deploy
```

It uses `DIRECT_URL`. Never run `npm run db:reset` or `npm run seed` against the live database:
reset deletes everything, and the seed creates demo accounts that share a published password (the
seed refuses to run when `NODE_ENV=production`, but do not rely on that alone).

## 5. After the first deploy

1. In Google Cloud Console → Credentials → your OAuth client, add the live redirect address
   `https://yourdomain.com/api/integrations/google/callback`, then press **Reconnect Google
   Account** on the live site once (the connection saved locally is not shared with the live site
   unless both use the same database).
2. Check that file uploads go to Google Drive (Settings → Integrations → File Storage). The live
   host's disk is thrown away, so local storage is refused there.
3. Sign in as the Super Admin and change the password.

## 6. Background jobs (reminders, reports, scoring)

`vercel.json` schedules all ten jobs on Vercel Cron. Vercel sends the `CRON_SECRET` variable as a
Bearer token on each call, and `/api/cron/<job>` accepts both GET (Vercel) and POST (any other
scheduler, `npm run jobs:run`), checking the same secret. Nothing to configure beyond setting
`CRON_SECRET` in step 3.

Vercel Cron runs on **UTC**, but the schedule below is Pakistan time (UTC+5, no daylight saving):

| Job | Pakistan time | `vercel.json` (UTC) |
|---|---|---|
| class-reminders | every 5 minutes | `*/5 * * * *` |
| attendance-auto-detect | every 10 minutes | `*/10 * * * *` |
| homework-overdue, payment-reminders | every hour | `0 * * * *` |
| engagement-scores | 6:00 am daily | `0 1 * * *` |
| predictive-risk-scores | 6:15 am daily | `15 1 * * *` |
| inactivity, trial-expiry | 8:00 am daily | `0 3 * * *` |
| lead-followup | 9:00 am daily | `0 4 * * *` |
| weekly-reports | Monday 7:00 am | `0 2 * * 1` |

Things to know:
- Cron jobs that run more than once a day need a **paid Vercel plan** (Pro). The free Hobby plan
  allows one run per day and refuses to deploy a more frequent schedule. Hobby is also for
  non-commercial use only, which a fee-collecting academy is not.
- Each run's result is recorded and shown under Admin → System Health, so a failing job is visible.
- Class times are read as Pakistan time on any server, so reminders and automatic attendance are
  correct on Vercel's UTC servers.
