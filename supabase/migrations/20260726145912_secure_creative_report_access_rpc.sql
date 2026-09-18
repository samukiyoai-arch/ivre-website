-- Keep the exposed RPC security-invoker and move privileged work into the
-- non-exposed private schema. The private function still validates auth.uid()
-- and direct-report ownership before changing any row.

drop function if exists public.set_creative_report_access(uuid, boolean);

create or replace function private.set_creative_report_access(
  target_profile_id uuid,
  make_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  caller_email text;
  changed_name text;
begin
  select email
  into caller_email
  from public.profiles
  where id = caller_id
    and role = 'creative_head'
    and approved
    and status = 'active';

  if caller_email is null then
    raise exception 'Only an active Creative Head can manage creative reports'
      using errcode = '42501';
  end if;

  update public.profiles
  set approved = make_active,
      status = case when make_active then 'active' else 'suspended' end,
      updated_at = now()
  where id = target_profile_id
    and reports_to_id = caller_id
    and role in ('creative_executive', 'editor')
  returning full_name into changed_name;

  if changed_name is null then
    raise exception 'Creative report not found'
      using errcode = 'P0002';
  end if;

  insert into public.audit_logs (
    user_id, user_email, user_role, action_type, record_area,
    record_id, remarks
  )
  values (
    caller_id,
    caller_email,
    'creative_head',
    case when make_active then 'APPROVE' else 'SUSPEND' end,
    'profiles',
    target_profile_id::text,
    case
      when make_active then 'Creative Head approved ' || changed_name
      else 'Creative Head suspended ' || changed_name
    end
  );
end;
$$;

revoke all on function private.set_creative_report_access(uuid, boolean)
  from public, anon;
grant execute on function private.set_creative_report_access(uuid, boolean)
  to authenticated;

create or replace function public.set_creative_report_access(
  target_profile_id uuid,
  make_active boolean
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.set_creative_report_access(target_profile_id, make_active);
$$;

revoke all on function public.set_creative_report_access(uuid, boolean)
  from public, anon;
grant execute on function public.set_creative_report_access(uuid, boolean)
  to authenticated;
