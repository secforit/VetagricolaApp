create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  source_type text not null,
  source_name text not null,
  target_table text not null,
  status text not null default 'draft',
  idempotency_key text,
  mapping_template_id uuid,
  summary_json jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint import_jobs_status_check check (
    status in ('draft', 'analyzed', 'dry_run_ready', 'running', 'completed', 'completed_with_errors', 'failed')
  )
);

create unique index if not exists import_jobs_clinic_idempotency_key_idx
  on public.import_jobs (clinic_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists import_jobs_clinic_id_idx on public.import_jobs (clinic_id);
create index if not exists import_jobs_status_idx on public.import_jobs (status);

create table if not exists public.import_job_rows (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  job_id uuid not null references public.import_jobs(id) on delete cascade,
  source_row_index integer not null,
  raw_payload jsonb not null default '{}'::jsonb,
  normalized_payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  target_table text,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint import_job_rows_status_check check (
    status in ('pending', 'validated', 'loaded', 'error', 'skipped')
  )
);

create index if not exists import_job_rows_job_id_idx on public.import_job_rows (job_id);
create index if not exists import_job_rows_job_status_idx on public.import_job_rows (job_id, status);
create index if not exists import_job_rows_clinic_id_idx on public.import_job_rows (clinic_id);

create table if not exists public.import_mapping_templates (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  source_fingerprint text not null,
  name text not null,
  version integer not null default 1,
  is_active boolean not null default true,
  target_table text not null,
  mapping_json jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists import_mapping_templates_clinic_id_idx
  on public.import_mapping_templates (clinic_id);
create index if not exists import_mapping_templates_fingerprint_idx
  on public.import_mapping_templates (clinic_id, source_fingerprint);

create table if not exists public.import_mapping_suggestions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  job_id uuid not null references public.import_jobs(id) on delete cascade,
  source_field text not null,
  target_table text not null,
  target_field text not null,
  confidence numeric(5,4) not null,
  reason text not null default '',
  accepted boolean,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists import_mapping_suggestions_job_id_idx
  on public.import_mapping_suggestions (job_id);

create table if not exists public.import_conflicts (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  job_id uuid not null references public.import_jobs(id) on delete cascade,
  row_id uuid references public.import_job_rows(id) on delete cascade,
  conflict_type text not null,
  details_json jsonb not null default '{}'::jsonb,
  resolution_status text not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  constraint import_conflicts_resolution_status_check check (
    resolution_status in ('open', 'resolved', 'ignored')
  )
);

create index if not exists import_conflicts_job_id_idx on public.import_conflicts (job_id);

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'import_jobs_set_updated_at'
  ) then
    create trigger import_jobs_set_updated_at
      before update on public.import_jobs
      for each row execute function public.set_updated_at();
  end if;
end
$$;

alter table public.import_jobs enable row level security;
alter table public.import_job_rows enable row level security;
alter table public.import_mapping_templates enable row level security;
alter table public.import_mapping_suggestions enable row level security;
alter table public.import_conflicts enable row level security;

drop policy if exists import_jobs_select_admin on public.import_jobs;
create policy import_jobs_select_admin on public.import_jobs
  for select
  using (public.user_is_clinic_admin(clinic_id));

drop policy if exists import_jobs_insert_admin on public.import_jobs;
create policy import_jobs_insert_admin on public.import_jobs
  for insert
  with check (public.user_is_clinic_admin(clinic_id));

drop policy if exists import_jobs_update_admin on public.import_jobs;
create policy import_jobs_update_admin on public.import_jobs
  for update
  using (public.user_is_clinic_admin(clinic_id))
  with check (public.user_is_clinic_admin(clinic_id));

drop policy if exists import_job_rows_select_admin on public.import_job_rows;
create policy import_job_rows_select_admin on public.import_job_rows
  for select
  using (public.user_is_clinic_admin(clinic_id));

drop policy if exists import_job_rows_insert_admin on public.import_job_rows;
create policy import_job_rows_insert_admin on public.import_job_rows
  for insert
  with check (public.user_is_clinic_admin(clinic_id));

drop policy if exists import_job_rows_update_admin on public.import_job_rows;
create policy import_job_rows_update_admin on public.import_job_rows
  for update
  using (public.user_is_clinic_admin(clinic_id))
  with check (public.user_is_clinic_admin(clinic_id));

drop policy if exists import_mapping_templates_select_admin on public.import_mapping_templates;
create policy import_mapping_templates_select_admin on public.import_mapping_templates
  for select
  using (public.user_is_clinic_admin(clinic_id));

drop policy if exists import_mapping_templates_insert_admin on public.import_mapping_templates;
create policy import_mapping_templates_insert_admin on public.import_mapping_templates
  for insert
  with check (public.user_is_clinic_admin(clinic_id));

drop policy if exists import_mapping_templates_update_admin on public.import_mapping_templates;
create policy import_mapping_templates_update_admin on public.import_mapping_templates
  for update
  using (public.user_is_clinic_admin(clinic_id))
  with check (public.user_is_clinic_admin(clinic_id));

drop policy if exists import_mapping_suggestions_select_admin on public.import_mapping_suggestions;
create policy import_mapping_suggestions_select_admin on public.import_mapping_suggestions
  for select
  using (public.user_is_clinic_admin(clinic_id));

drop policy if exists import_mapping_suggestions_insert_admin on public.import_mapping_suggestions;
create policy import_mapping_suggestions_insert_admin on public.import_mapping_suggestions
  for insert
  with check (public.user_is_clinic_admin(clinic_id));

drop policy if exists import_mapping_suggestions_update_admin on public.import_mapping_suggestions;
create policy import_mapping_suggestions_update_admin on public.import_mapping_suggestions
  for update
  using (public.user_is_clinic_admin(clinic_id))
  with check (public.user_is_clinic_admin(clinic_id));

drop policy if exists import_conflicts_select_admin on public.import_conflicts;
create policy import_conflicts_select_admin on public.import_conflicts
  for select
  using (public.user_is_clinic_admin(clinic_id));

drop policy if exists import_conflicts_insert_admin on public.import_conflicts;
create policy import_conflicts_insert_admin on public.import_conflicts
  for insert
  with check (public.user_is_clinic_admin(clinic_id));

drop policy if exists import_conflicts_update_admin on public.import_conflicts;
create policy import_conflicts_update_admin on public.import_conflicts
  for update
  using (public.user_is_clinic_admin(clinic_id))
  with check (public.user_is_clinic_admin(clinic_id));
