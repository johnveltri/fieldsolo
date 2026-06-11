# Local Supabase quick reference

After `npx supabase start --workdir backend`, use this sheet so you do not have to scroll the CLI every time.

## What to keep handy

| Keep bookmarked? | What | Why |
|------------------|------|-----|
| **Yes** | **Studio**, **API base URL**, **Mailpit** | Stable while `supabase/config.toml` ports are unchanged. Use daily for DB UI, REST, and test email. |
| **Optional** | GraphQL / Edge Functions base paths | Same host as API; only if you use those features locally. |
| **Do not paste into git** | Publishable, secret, JWT, storage keys | Treat as secrets. Values are **printed when the stack starts** and can differ after restart; copy from your terminal or `supabase status` when needed. |

## URLs (default ports from `supabase/config.toml`)

These assume the local stack is **running** and ports are unchanged.

| Service | URL |
|---------|-----|
| **API (Kong)** | http://127.0.0.1:54321 |
| **REST** | http://127.0.0.1:54321/rest/v1 |
| **GraphQL** | http://127.0.0.1:54321/graphql/v1 |
| **Edge Functions** | http://127.0.0.1:54321/functions/v1 |
| **Studio** | http://127.0.0.1:54323 |
| **Mailpit** (dev email) | http://127.0.0.1:54324 |
| **MCP** (if enabled) | http://127.0.0.1:54321/mcp |

## Database

| | |
|--|--|
| **Connection string** | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

User/password are the standard local defaults (`postgres` / `postgres`) unless you changed them.

## Keys for app env

For **Expo** (`apps/mobile-expo`), you typically need:

- `EXPO_PUBLIC_SUPABASE_URL` → API URL above (`http://127.0.0.1:54321`)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` → **publishable** / anon key from CLI output

See `apps/mobile-expo/.env.example` — copy to `.env` (not committed) and paste keys from `supabase status`.

### Expo Go (iOS + Android)

Start Metro from the repo root with:

```bash
npm run mobile
```

Then press `i` (iOS) or `a` (Android), or use `npm run mobile:ios` / `npm run mobile:android`.

If you see **Missing Supabase env vars** on one emulator, stop Metro and restart with cache cleared:

```bash
cd apps/mobile-expo && npx expo start --clear
```

Env vars live in `apps/mobile-expo/.env` only — a Metro server started without loading that file will bundle empty `EXPO_PUBLIC_*` values on every platform.

### Local Docker is the default

With **`EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`**, the Expo app and **local Studio** (`http://127.0.0.1:54323`) talk to the **same** database. A row returned by SQL in Studio (e.g. `auth.users`) is the same project the app uses—as long as `.env` keys come from `supabase status` for that running stack.

**Optional:** To point the app at a **hosted** project instead, set URL and anon key from **Project Settings → API** there (not the local CLI output).

### Auth user check (local Studio → SQL)

```sql
select id, email, created_at
from auth.users
where email = 'your@email.com';
```

### Jobs + RLS

The app loads jobs with the **anon key + your session** (RLS on). The publishable anon key is still
used for Supabase Auth, but shared schema migrations no longer grant direct table access to the
`anon` role. Rows usually need **`public.jobs.user_id = auth.uid()`**. Studio’s **Table Editor**
often uses role **`postgres`**, which bypasses RLS—so you can see rows the app cannot, until
`user_id` is set.

Child-table writes (`sessions`, `notes`, `materials`, `attachments`, `job_activity_events`) now
also require parent ownership checks. A signed-in user cannot write child rows that reference
another user’s `job_id`/`session_id`, even if `user_id` on the child row matches the caller.

Shared schema migrations no longer include seed-demo bypass policies. Local resets start without
seeded jobs by default; create real jobs under your authenticated user.

### Optional: temporarily restore open anon table access locally

If you need the old debugging behavior where unauthenticated table reads/writes are open in your
local stack, run:

```sql
\i backend/supabase/snippets/enable_local_anon_table_access.sql
```

Or paste the contents of
[`backend/supabase/snippets/enable_local_anon_table_access.sql`](./supabase/snippets/enable_local_anon_table_access.sql)
into Studio SQL.

To revert to the secure default, reset the local database:

```bash
npx supabase db reset --workdir backend
```

**Service role** and **storage S3 keys** are for server-side or advanced tooling—do not embed in client apps.

**Current values:** run from repo root:

```bash
npx supabase status --workdir backend
```

Use the printed keys; do not commit them.

## Security

Local Supabase uses shared development defaults. Do not use these URLs or keys in production. See the CLI “Local dev security notice” after `supabase start`.

## CLI (start / stop / reset)

See [`supabase/README.md`](./supabase/README.md).
