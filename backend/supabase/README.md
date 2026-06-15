# Supabase (FieldSolo backend)

This folder is the **source of truth** for schema and local tooling. Remote Supabase projects use the same migrations via `db push` / CI.

## Layout

- `config.toml` — local stack (API, DB, Studio ports, etc.).
- `migrations/` — ordered SQL migrations (apply to hosted project with `supabase db push` after linking).
- `seed.sql` — optional demo rows after `db reset`.

## CLI commands (from repo root)

Supabase CLI treats **`backend`** as the project root (the directory that contains this `supabase/` folder).

```bash
# Start local Postgres + API + Studio (requires Docker)
npx supabase start --workdir backend

# Stop local stack
npx supabase stop --workdir backend

# Reapply migrations + seed
npx supabase db reset --workdir backend
```

## Hosted project

1. Create a project in the [Supabase dashboard](https://supabase.com/dashboard).
2. Link the CLI: `npx supabase link --workdir backend` (project ref + DB password).
3. Push schema: `npx supabase db push --workdir backend`.

## Env for `apps/mobile-expo`

Use the project **Project URL** and **anon public** key as:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Local defaults after `supabase start` are shown in the CLI output (`API URL` and `anon key`).

The Expo app still uses the publishable anon key for Supabase Auth and session refresh. Shared
schema migrations no longer grant direct public-table access to the `anon` role.

## Storage buckets

New attachment rows default to the Supabase Storage bucket named `fieldsolo`. Existing attachment
rows can still reference their original bucket value. Before pushing the FieldSolo storage default
migration to a hosted project, create or confirm the `fieldsolo` bucket in Supabase Storage.

## Jobs in the app

Job Detail loads **`fetchFirstJobIdForCurrentUser`** → **`fetchJobDetail`**: only rows the **authenticated user** can see under RLS (typically **`jobs.user_id = auth.uid()`**). If none exist, the UI shows **no jobs**. `seed.sql` is intentionally empty by default; create real user-owned jobs in local dev.

For child tables (`sessions`, `notes`, `materials`, `attachments`, `job_activity_events`), authenticated
CRUD now requires both:
- row ownership (`user_id = auth.uid()`)
- parent ownership (referenced `job_id` / `session_id` resolves to rows owned by `auth.uid()`)

There is no seed-demo bypass policy or demo-claim RPC in the shared schema.

## Local-only open table access

Shared migrations are secure by default. If you need the old local debugging behavior where the
`anon` role can read/write public tables directly, apply
[`snippets/enable_local_anon_table_access.sql`](./snippets/enable_local_anon_table_access.sql)
manually in local Studio SQL or `psql`.

To revert to the secure default, reset the local database:

```bash
npx supabase db reset --workdir backend
```

## Authentication (email / password only)

**Local (`config.toml`):** SMS signup is off (`[auth.sms]` / `enable_signup = false`); OAuth blocks like `[auth.external.apple]` stay `enabled = false`. Email signup is on under `[auth.email]`. Confirmations default to off locally (`enable_confirmations = false`) so new users can sign in immediately—turn confirmations on for production-like testing if needed.

**Hosted:** In the [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication** → **Providers**, disable every provider except **Email** (disable Phone, Apple, Google, and any others you do not use). Under **Email**, enable “Email” / password sign-in as required by your app.
