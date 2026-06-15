-- FieldSolo rename: new attachment rows should target the FieldSolo storage bucket.
-- Existing attachment rows keep their original bucket value.
alter table public.attachments
  alter column storage_bucket set default 'fieldsolo';

comment on column public.attachments.storage_bucket is
  'Supabase Storage bucket for the object; FieldSolo defaults new rows to fieldsolo.';
