-- Harden authorization helpers and trigger functions after the initial schema.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter function public.set_updated_at() set search_path = public;
alter function public.prepare_client_financials() set search_path = public;
alter function public.close_task_timestamp() set search_path = public;

alter function public.current_user_role() set schema private;
alter function public.is_leadership() set schema private;
alter function public.can_view_credentials() set schema private;
alter function public.can_access_client(uuid) set schema private;

create or replace function private.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = (select auth.uid())), 'anonymous');
$$;

create or replace function private.is_leadership()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select private.current_user_role() in ('admin','ceo','coo','sales_head');
$$;

create or replace function private.can_view_credentials()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select coalesce((select can_view_credentials from public.profiles where id = (select auth.uid())), false)
    or private.current_user_role() in ('admin','ceo','coo');
$$;

create or replace function private.can_access_client(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select private.is_leadership()
    or exists (
      select 1 from public.clients c
      where c.id = target_client_id and c.account_holder_id = (select auth.uid())
    )
    or exists (
      select 1 from public.tasks t
      where t.client_id = target_client_id and t.assigned_user_id = (select auth.uid())
    );
$$;

revoke all on function private.current_user_role() from public, anon;
revoke all on function private.is_leadership() from public, anon;
revoke all on function private.can_view_credentials() from public, anon;
revoke all on function private.can_access_client(uuid) from public, anon;
grant execute on function private.current_user_role() to authenticated;
grant execute on function private.is_leadership() to authenticated;
grant execute on function private.can_view_credentials() to authenticated;
grant execute on function private.can_access_client(uuid) to authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.sync_client_payment_task() from public, anon, authenticated;
revoke all on function public.sync_lead_followup_task() from public, anon, authenticated;
revoke all on function public.write_audit_log() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.prepare_client_financials() from public, anon, authenticated;
revoke all on function public.close_task_timestamp() from public, anon, authenticated;

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public, private
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
    private.current_user_role(),
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
revoke all on function public.write_audit_log() from public, anon, authenticated;

drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles"
on public.profiles for update to authenticated
using (private.current_user_role() = 'admin')
with check (private.current_user_role() = 'admin');

drop policy if exists "Authorized users view clients" on public.clients;
create policy "Authorized users view clients"
on public.clients for select to authenticated
using (private.can_access_client(id));
drop policy if exists "Leadership creates clients" on public.clients;
create policy "Leadership creates clients"
on public.clients for insert to authenticated
with check (private.is_leadership());
drop policy if exists "Leadership updates clients" on public.clients;
create policy "Leadership updates clients"
on public.clients for update to authenticated
using (private.is_leadership()) with check (private.is_leadership());
drop policy if exists "Admins delete clients" on public.clients;
create policy "Admins delete clients"
on public.clients for delete to authenticated
using (private.current_user_role() = 'admin');

drop policy if exists "Authorized users view leads" on public.leads;
create policy "Authorized users view leads"
on public.leads for select to authenticated
using (private.is_leadership() or lead_owner_id = (select auth.uid()));
drop policy if exists "Leadership creates leads" on public.leads;
create policy "Leadership creates leads"
on public.leads for insert to authenticated
with check (private.is_leadership());
drop policy if exists "Leadership updates leads" on public.leads;
create policy "Leadership updates leads"
on public.leads for update to authenticated
using (private.is_leadership()) with check (private.is_leadership());
drop policy if exists "Admins delete leads" on public.leads;
create policy "Admins delete leads"
on public.leads for delete to authenticated
using (private.current_user_role() = 'admin');

drop policy if exists "Users view assigned tasks" on public.tasks;
create policy "Users view assigned tasks"
on public.tasks for select to authenticated
using (private.is_leadership() or assigned_user_id = (select auth.uid()));
drop policy if exists "Leadership creates tasks" on public.tasks;
create policy "Leadership creates tasks"
on public.tasks for insert to authenticated
with check (private.is_leadership());
drop policy if exists "Owners update tasks" on public.tasks;
create policy "Owners update tasks"
on public.tasks for update to authenticated
using (private.is_leadership() or assigned_user_id = (select auth.uid()))
with check (private.is_leadership() or assigned_user_id = (select auth.uid()));
drop policy if exists "Admins delete tasks" on public.tasks;
create policy "Admins delete tasks"
on public.tasks for delete to authenticated
using (private.current_user_role() = 'admin');

drop policy if exists "Credential viewers read references" on public.credentials;
create policy "Credential viewers read references"
on public.credentials for select to authenticated
using (private.can_view_credentials());
drop policy if exists "Admins create credential references" on public.credentials;
create policy "Admins create credential references"
on public.credentials for insert to authenticated
with check (private.current_user_role() = 'admin');
drop policy if exists "Admins update credential references" on public.credentials;
create policy "Admins update credential references"
on public.credentials for update to authenticated
using (private.current_user_role() = 'admin')
with check (private.current_user_role() = 'admin');
drop policy if exists "Admins delete credential references" on public.credentials;
create policy "Admins delete credential references"
on public.credentials for delete to authenticated
using (private.current_user_role() = 'admin');

drop policy if exists "Leadership reads audit logs" on public.audit_logs;
create policy "Leadership reads audit logs"
on public.audit_logs for select to authenticated
using (private.current_user_role() in ('admin','ceo'));

drop policy if exists "Leadership uploads agreements" on storage.objects;
create policy "Leadership uploads agreements"
on storage.objects for insert to authenticated
with check (bucket_id = 'agreements' and private.is_leadership());
drop policy if exists "Leadership updates agreements" on storage.objects;
create policy "Leadership updates agreements"
on storage.objects for update to authenticated
using (bucket_id = 'agreements' and private.is_leadership());
drop policy if exists "Admins delete agreements" on storage.objects;
create policy "Admins delete agreements"
on storage.objects for delete to authenticated
using (bucket_id = 'agreements' and private.current_user_role() = 'admin');

create index if not exists idx_clients_created_by on public.clients(created_by);
create index if not exists idx_leads_created_by on public.leads(created_by);
create index if not exists idx_tasks_client_id on public.tasks(client_id);
create index if not exists idx_tasks_lead_id on public.tasks(lead_id);
create index if not exists idx_tasks_created_by on public.tasks(created_by);
create index if not exists idx_credentials_client_id on public.credentials(client_id);
create index if not exists idx_credentials_created_by on public.credentials(created_by);
