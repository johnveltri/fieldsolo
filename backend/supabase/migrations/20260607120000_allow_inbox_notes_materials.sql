-- Allow "Inbox" notes/materials: rows owned by a user with no job and no
-- session parent (job_id IS NULL AND session_id IS NULL). These are quick
-- captures saved to the Inbox to be assigned to a job later.
--
-- Two things currently block this:
--   1. The `*_at_least_one_parent` CHECK constraints require >= 1 parent.
--   2. The `_own` RLS policies require parent ownership (a job/session the user
--      owns), so a parentless row would never satisfy the policy.
--
-- We drop the check constraints and add a "no parent + owned by me" branch to
-- the RLS policies. The `enforce_child_job_matches_session_job` trigger only
-- runs when session_id is set, so Inbox rows are unaffected by it.

-- -----------------------------------------------------------------------------
-- Drop the at-least-one-parent check constraints
-- -----------------------------------------------------------------------------

alter table public.notes drop constraint if exists notes_at_least_one_parent;
alter table public.materials drop constraint if exists materials_at_least_one_parent;

-- -----------------------------------------------------------------------------
-- notes RLS: allow owner rows with no parent (Inbox), in addition to
-- job-owned / session-owned rows.
-- -----------------------------------------------------------------------------

drop policy if exists "notes_select_own" on public.notes;
drop policy if exists "notes_insert_own" on public.notes;
drop policy if exists "notes_update_own" on public.notes;
drop policy if exists "notes_delete_own" on public.notes;

create policy "notes_select_own"
on public.notes
for select
to authenticated
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and (
    (job_id is null and session_id is null)
    or exists (
      select 1 from public.jobs j
      where j.id = notes.job_id and j.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.sessions s
      where s.id = notes.session_id and s.user_id = (select auth.uid())
    )
  )
);

create policy "notes_insert_own"
on public.notes
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and (
    (job_id is null and session_id is null)
    or exists (
      select 1 from public.jobs j
      where j.id = notes.job_id and j.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.sessions s
      where s.id = notes.session_id and s.user_id = (select auth.uid())
    )
  )
);

create policy "notes_update_own"
on public.notes
for update
to authenticated
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and (
    (job_id is null and session_id is null)
    or exists (
      select 1 from public.jobs j
      where j.id = notes.job_id and j.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.sessions s
      where s.id = notes.session_id and s.user_id = (select auth.uid())
    )
  )
)
with check (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and (
    (job_id is null and session_id is null)
    or exists (
      select 1 from public.jobs j
      where j.id = notes.job_id and j.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.sessions s
      where s.id = notes.session_id and s.user_id = (select auth.uid())
    )
  )
);

create policy "notes_delete_own"
on public.notes
for delete
to authenticated
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and (
    (job_id is null and session_id is null)
    or exists (
      select 1 from public.jobs j
      where j.id = notes.job_id and j.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.sessions s
      where s.id = notes.session_id and s.user_id = (select auth.uid())
    )
  )
);

-- -----------------------------------------------------------------------------
-- materials RLS: same no-parent owner branch.
-- -----------------------------------------------------------------------------

drop policy if exists "materials_select_own" on public.materials;
drop policy if exists "materials_insert_own" on public.materials;
drop policy if exists "materials_update_own" on public.materials;
drop policy if exists "materials_delete_own" on public.materials;

create policy "materials_select_own"
on public.materials
for select
to authenticated
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and (
    (job_id is null and session_id is null)
    or exists (
      select 1 from public.jobs j
      where j.id = materials.job_id and j.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.sessions s
      where s.id = materials.session_id and s.user_id = (select auth.uid())
    )
  )
);

create policy "materials_insert_own"
on public.materials
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and (
    (job_id is null and session_id is null)
    or exists (
      select 1 from public.jobs j
      where j.id = materials.job_id and j.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.sessions s
      where s.id = materials.session_id and s.user_id = (select auth.uid())
    )
  )
);

create policy "materials_update_own"
on public.materials
for update
to authenticated
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and (
    (job_id is null and session_id is null)
    or exists (
      select 1 from public.jobs j
      where j.id = materials.job_id and j.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.sessions s
      where s.id = materials.session_id and s.user_id = (select auth.uid())
    )
  )
)
with check (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and (
    (job_id is null and session_id is null)
    or exists (
      select 1 from public.jobs j
      where j.id = materials.job_id and j.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.sessions s
      where s.id = materials.session_id and s.user_id = (select auth.uid())
    )
  )
);

create policy "materials_delete_own"
on public.materials
for delete
to authenticated
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and (
    (job_id is null and session_id is null)
    or exists (
      select 1 from public.jobs j
      where j.id = materials.job_id and j.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.sessions s
      where s.id = materials.session_id and s.user_id = (select auth.uid())
    )
  )
);
