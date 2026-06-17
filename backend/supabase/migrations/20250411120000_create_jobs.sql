-- Jobs table — columns mirror @fieldsolo/shared-types `Job` (camelCase in TS).
create table public.jobs (
  id uuid primary key default gen_random_uuid (),
  title text not null,
  customer_name text,
  updated_at timestamptz not null default now()
);

create index jobs_updated_at_idx on public.jobs (updated_at desc);

comment on table public.jobs is 'Jobs domain; align with packages/shared-types Job.';

alter table public.jobs enable row level security;

-- DEV: allow anon reads for the mobile client using the public anon key.
-- Replace with authenticated policies before production.
create policy "jobs_select_anon" on public.jobs for select to anon using (true);
