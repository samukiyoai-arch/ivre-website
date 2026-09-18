-- IVRE Team Portal — initial database schema
-- Apply through the Supabase migration API or SQL editor.

create extension if not exists pgcrypto;

create sequence if not exists public.client_code_seq start 1;
create sequence if not exists public.lead_code_seq start 1;
create sequence if not exists public.task_code_seq start 1;
create sequence if not exists public.credential_code_seq start 1;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  mobile text,
  role text not null default 'team'
    check (role in ('admin','ceo','coo','creative_head','sales_head','marketing_head','editor','team')),
  department text,
  status text not null default 'pending'
    check (status in ('pending','active','suspended')),
  approved boolean not null default false,
  can_view_credentials boolean not null default false,
  can_edit_master boolean not null default false,
  whatsapp_alert boolean not null default true,
  last_login_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  client_code text not null unique default ('CL-' || lpad(nextval('public.client_code_seq')::text, 4, '0')),
  client_name text not null,
  brand_company text,
  contact_person text,
  email text,
  phone text,
  city text,
  industry text,
  lead_source text,
  status text not null default 'active'
    check (status in ('active','prospect','paused','closed')),
  account_holder_id uuid references public.profiles(id) on delete set null,
  order_details text,
  agreement_date date,
  agreement_file_url text,
  first_payment_received_date date,
  last_payment_received_date date,
  next_payment_due_date date,
  monthly_fee numeric(12,2) not null default 0 check (monthly_fee >= 0),
  amount_received numeric(12,2) not null default 0 check (amount_received >= 0),
  balance numeric(12,2) not null default 0 check (balance >= 0),
  payment_status text not null default 'due'
    check (payment_status in ('paid','due','overdue','partial')),
  services_required text[] not null default '{}',
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  lead_code text not null unique default ('LEAD-' || lpad(nextval('public.lead_code_seq')::text, 4, '0')),
  potential_client text not null,
  brand_company text,
  contact_person text,
  email text,
  mobile text,
  city text,
  business_category text,
  services_proposed text[] not null default '{}',
  expected_monthly_value numeric(12,2) not null default 0 check (expected_monthly_value >= 0),
  lead_owner_id uuid references public.profiles(id) on delete set null,
  proposal_status text not null default 'Not started',
  proposal_sent_date date,
  proposal_details text,
  agreement_link text,
  seo_audit_status text not null default 'Pending',
  audit_report_url text,
  follow_up_target_date date,
  status text not null default 'open'
    check (status in ('open','contacted','proposal','won','lost','closed')),
  next_action text,
  remarks text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  task_code text not null unique default ('TASK-' || lpad(nextval('public.task_code_seq')::text, 4, '0')),
  client_id uuid references public.clients(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  due_date date not null,
  due_time time not null default '11:00',
  title text not null,
  service_category text,
  assigned_user_id uuid references public.profiles(id) on delete set null,
  priority text not null default 'medium'
    check (priority in ('high','medium','low')),
  status text not null default 'open'
    check (status in ('open','ongoing','closed')),
  ongoing_remarks text,
  closing_remarks text,
  escalation_to text,
  escalated boolean not null default false,
  closed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (client_id is not null or lead_id is not null or service_category is not null)
);

create table if not exists public.credentials (
  id uuid primary key default gen_random_uuid(),
  credential_code text not null unique default ('CRED-' || lpad(nextval('public.credential_code_seq')::text, 4, '0')),
  client_id uuid not null references public.clients(id) on delete cascade,
  platform text not null,
  portal_url text,
  login_username text,
  password_vault_reference text,
  otp_owner text,
  access_level text,
  assigned_team_role text,
  last_verified_date date,
  status text not null default 'active'
    check (status in ('active','needs_review','revoked')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid,
  user_email text,
  user_role text,
  action_type text not null,
  record_area text not null,
  record_id text,
  old_value jsonb,
  new_value jsonb,
  remarks text
);

create index if not exists idx_clients_account_holder on public.clients(account_holder_id);
create index if not exists idx_clients_payment_due on public.clients(next_payment_due_date) where payment_status <> 'paid';
create index if not exists idx_leads_owner on public.leads(lead_owner_id);
create index if not exists idx_leads_follow_up on public.leads(follow_up_target_date);
create index if not exists idx_tasks_assignee on public.tasks(assigned_user_id);
create index if not exists idx_tasks_due_open on public.tasks(due_date) where status <> 'closed';
create index if not exists idx_audit_created_at on public.audit_logs(created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prepare_client_financials()
returns trigger
language plpgsql
as $$
begin
  new.balance = greatest(coalesce(new.monthly_fee, 0) - coalesce(new.amount_received, 0), 0);
  if new.balance = 0 and new.monthly_fee > 0 then
    new.payment_status = 'paid';
  elsif new.next_payment_due_date is not null and new.next_payment_due_date < current_date then
    new.payment_status = 'overdue';
  elsif new.amount_received > 0 then
    new.payment_status = 'partial';
  elsif new.payment_status = 'paid' then
    new.payment_status = 'due';
  end if;
  return new;
end;
$$;

create or replace function public.close_task_timestamp()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'closed' and old.status is distinct from 'closed' then
    new.closed_at = now();
  elsif new.status <> 'closed' then
    new.closed_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists clients_prepare_financials on public.clients;
create trigger clients_prepare_financials before insert or update on public.clients for each row execute function public.prepare_client_financials();
drop trigger if exists clients_updated_at on public.clients;
create trigger clients_updated_at before update on public.clients for each row execute function public.set_updated_at();
drop trigger if exists leads_updated_at on public.leads;
create trigger leads_updated_at before update on public.leads for each row execute function public.set_updated_at();
drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at before update on public.tasks for each row execute function public.set_updated_at();
drop trigger if exists tasks_close_timestamp on public.tasks;
create trigger tasks_close_timestamp before update on public.tasks for each row execute function public.close_task_timestamp();
drop trigger if exists credentials_updated_at on public.credentials;
create trigger credentials_updated_at before update on public.credentials for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first_user boolean;
begin
  select not exists(select 1 from public.profiles) into is_first_user;
  insert into public.profiles (
    id, full_name, email, role, department, status, approved,
    can_view_credentials, can_edit_master
  )
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    case when is_first_user then 'admin' else 'team' end,
    case when is_first_user then 'Management' else null end,
    case when is_first_user then 'active' else 'pending' end,
    is_first_user,
    is_first_user,
    is_first_user
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'anonymous');
$$;

create or replace function public.is_leadership()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('admin','ceo','coo','sales_head');
$$;

create or replace function public.can_view_credentials()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select can_view_credentials from public.profiles where id = auth.uid()), false)
    or public.current_user_role() in ('admin','ceo','coo');
$$;

create or replace function public.can_access_client(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_leadership()
    or exists (
      select 1 from public.clients c
      where c.id = target_client_id and c.account_holder_id = auth.uid()
    )
    or exists (
      select 1 from public.tasks t
      where t.client_id = target_client_id and t.assigned_user_id = auth.uid()
    );
$$;

create or replace function public.sync_client_payment_task()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.next_payment_due_date is not null and new.payment_status <> 'paid' then
    insert into public.tasks (
      task_code, client_id, due_date, due_time, title, service_category,
      assigned_user_id, priority, status, ongoing_remarks, escalation_to
    )
    values (
      'PAY-' || new.client_code, new.id, new.next_payment_due_date, '11:00',
      'Payment follow-up: ' || new.client_name, 'Client Success',
      new.account_holder_id, 'high', 'open', 'Outstanding balance: ₹' || new.balance::text, 'COO'
    )
    on conflict (task_code) do update set
      due_date = excluded.due_date,
      assigned_user_id = excluded.assigned_user_id,
      ongoing_remarks = excluded.ongoing_remarks,
      status = case when public.tasks.status = 'closed' then 'open' else public.tasks.status end;
  elsif new.payment_status = 'paid' then
    update public.tasks
    set status = 'closed', closing_remarks = coalesce(closing_remarks, 'Payment marked paid')
    where task_code = 'PAY-' || new.client_code and status <> 'closed';
  end if;
  return new;
end;
$$;

drop trigger if exists sync_client_payment_task_trigger on public.clients;
create trigger sync_client_payment_task_trigger
after insert or update of next_payment_due_date, payment_status, balance, account_holder_id
on public.clients
for each row execute function public.sync_client_payment_task();

create or replace function public.sync_lead_followup_task()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.follow_up_target_date is not null and new.status not in ('won','lost','closed') then
    insert into public.tasks (
      task_code, lead_id, due_date, due_time, title, service_category,
      assigned_user_id, priority, status, ongoing_remarks, escalation_to
    )
    values (
      'LEAD-' || new.lead_code, new.id, new.follow_up_target_date, '11:00',
      'Potential client follow-up: ' || new.potential_client, 'Client Success',
      new.lead_owner_id, 'high', 'open',
      'Proposal: ' || new.proposal_status || '; Audit: ' || new.seo_audit_status, 'COO'
    )
    on conflict (task_code) do update set
      due_date = excluded.due_date,
      assigned_user_id = excluded.assigned_user_id,
      ongoing_remarks = excluded.ongoing_remarks,
      status = case when public.tasks.status = 'closed' then 'open' else public.tasks.status end;
  elsif new.status in ('won','lost','closed') then
    update public.tasks
    set status = 'closed', closing_remarks = coalesce(closing_remarks, 'Lead workflow closed')
    where task_code = 'LEAD-' || new.lead_code and status <> 'closed';
  end if;
  return new;
end;
$$;

drop trigger if exists sync_lead_followup_task_trigger on public.leads;
create trigger sync_lead_followup_task_trigger
after insert or update of follow_up_target_date, status, lead_owner_id, proposal_status, seo_audit_status
on public.leads
for each row execute function public.sync_lead_followup_task();

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_id text;
  old_data jsonb;
  new_data jsonb;
begin
  old_data := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end;
  new_data := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end;
  row_id := coalesce(new_data ->> 'id', old_data ->> 'id');
  insert into public.audit_logs (
    user_id, user_email, user_role, action_type, record_area,
    record_id, old_value, new_value, remarks
  )
  values (
    auth.uid(),
    coalesce(auth.jwt() ->> 'email', 'system'),
    public.current_user_role(),
    initcap(lower(tg_op)),
    tg_table_name,
    row_id,
    old_data,
    new_data,
    initcap(replace(tg_table_name, '_', ' ')) || ' ' || lower(tg_op)
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists clients_audit on public.clients;
create trigger clients_audit after insert or update or delete on public.clients for each row execute function public.write_audit_log();
drop trigger if exists leads_audit on public.leads;
create trigger leads_audit after insert or update or delete on public.leads for each row execute function public.write_audit_log();
drop trigger if exists tasks_audit on public.tasks;
create trigger tasks_audit after insert or update or delete on public.tasks for each row execute function public.write_audit_log();
drop trigger if exists credentials_audit on public.credentials;
create trigger credentials_audit after insert or update or delete on public.credentials for each row execute function public.write_audit_log();

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.leads enable row level security;
alter table public.tasks enable row level security;
alter table public.credentials enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Authenticated users can view team" on public.profiles;
create policy "Authenticated users can view team"
on public.profiles for select to authenticated
using (true);
drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles"
on public.profiles for update to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "Authorized users view clients" on public.clients;
create policy "Authorized users view clients"
on public.clients for select to authenticated
using (public.can_access_client(id));
drop policy if exists "Leadership creates clients" on public.clients;
create policy "Leadership creates clients"
on public.clients for insert to authenticated
with check (public.is_leadership());
drop policy if exists "Leadership updates clients" on public.clients;
create policy "Leadership updates clients"
on public.clients for update to authenticated
using (public.is_leadership()) with check (public.is_leadership());
drop policy if exists "Admins delete clients" on public.clients;
create policy "Admins delete clients"
on public.clients for delete to authenticated
using (public.current_user_role() = 'admin');

drop policy if exists "Authorized users view leads" on public.leads;
create policy "Authorized users view leads"
on public.leads for select to authenticated
using (public.is_leadership() or lead_owner_id = auth.uid());
drop policy if exists "Leadership creates leads" on public.leads;
create policy "Leadership creates leads"
on public.leads for insert to authenticated
with check (public.is_leadership());
drop policy if exists "Leadership updates leads" on public.leads;
create policy "Leadership updates leads"
on public.leads for update to authenticated
using (public.is_leadership()) with check (public.is_leadership());
drop policy if exists "Admins delete leads" on public.leads;
create policy "Admins delete leads"
on public.leads for delete to authenticated
using (public.current_user_role() = 'admin');

drop policy if exists "Users view assigned tasks" on public.tasks;
create policy "Users view assigned tasks"
on public.tasks for select to authenticated
using (public.is_leadership() or assigned_user_id = auth.uid());
drop policy if exists "Leadership creates tasks" on public.tasks;
create policy "Leadership creates tasks"
on public.tasks for insert to authenticated
with check (public.is_leadership());
drop policy if exists "Owners update tasks" on public.tasks;
create policy "Owners update tasks"
on public.tasks for update to authenticated
using (public.is_leadership() or assigned_user_id = auth.uid())
with check (public.is_leadership() or assigned_user_id = auth.uid());
drop policy if exists "Admins delete tasks" on public.tasks;
create policy "Admins delete tasks"
on public.tasks for delete to authenticated
using (public.current_user_role() = 'admin');

drop policy if exists "Credential viewers read references" on public.credentials;
create policy "Credential viewers read references"
on public.credentials for select to authenticated
using (public.can_view_credentials());
drop policy if exists "Admins create credential references" on public.credentials;
create policy "Admins create credential references"
on public.credentials for insert to authenticated
with check (public.current_user_role() = 'admin');
drop policy if exists "Admins update credential references" on public.credentials;
create policy "Admins update credential references"
on public.credentials for update to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');
drop policy if exists "Admins delete credential references" on public.credentials;
create policy "Admins delete credential references"
on public.credentials for delete to authenticated
using (public.current_user_role() = 'admin');

drop policy if exists "Leadership reads audit logs" on public.audit_logs;
create policy "Leadership reads audit logs"
on public.audit_logs for select to authenticated
using (public.current_user_role() in ('admin','ceo'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'agreements',
  'agreements',
  false,
  10485760,
  array['application/pdf','image/jpeg','image/png']::text[]
)
on conflict (id) do nothing;

drop policy if exists "Authenticated users read agreements" on storage.objects;
create policy "Authenticated users read agreements"
on storage.objects for select to authenticated
using (bucket_id = 'agreements');
drop policy if exists "Leadership uploads agreements" on storage.objects;
create policy "Leadership uploads agreements"
on storage.objects for insert to authenticated
with check (bucket_id = 'agreements' and public.is_leadership());
drop policy if exists "Leadership updates agreements" on storage.objects;
create policy "Leadership updates agreements"
on storage.objects for update to authenticated
using (bucket_id = 'agreements' and public.is_leadership());
drop policy if exists "Admins delete agreements" on storage.objects;
create policy "Admins delete agreements"
on storage.objects for delete to authenticated
using (bucket_id = 'agreements' and public.current_user_role() = 'admin');

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.leads to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.credentials to authenticated;
grant select on public.audit_logs to authenticated;
grant usage, select on all sequences in schema public to authenticated;

