-- Every Creative Portal account is assigned to the active Creative Head at
-- signup. The head can review and activate/suspend only their own reports.

alter table public.profiles
  add column if not exists reports_to_id uuid
  references public.profiles(id) on delete set null;

create index if not exists idx_profiles_reports_to
  on public.profiles(reports_to_id);

update public.profiles executive
set reports_to_id = (
  select head.id
  from public.profiles head
  where head.role = 'creative_head'
    and head.approved
    and head.status = 'active'
  order by head.created_at
  limit 1
)
where executive.role in ('creative_executive', 'editor')
  and executive.reports_to_id is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first_user boolean;
  is_creative_request boolean;
  creative_manager_id uuid;
begin
  select not exists(select 1 from public.profiles) into is_first_user;
  is_creative_request := lower(coalesce(new.raw_user_meta_data ->> 'requested_portal', '')) = 'creative';

  if is_creative_request then
    select id
    into creative_manager_id
    from public.profiles
    where role = 'creative_head'
      and approved
      and status = 'active'
    order by created_at
    limit 1;
  end if;

  insert into public.profiles (
    id, full_name, email, role, department, status, approved,
    can_view_credentials, can_edit_master, reports_to_id
  )
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    case
      when is_first_user then 'admin'
      when is_creative_request then 'creative_executive'
      else 'team'
    end,
    case
      when is_first_user then 'Management'
      when is_creative_request then 'Creative'
      else null
    end,
    case when is_first_user then 'active' else 'pending' end,
    is_first_user,
    is_first_user,
    is_first_user,
    creative_manager_id
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create or replace function private.can_manage_creative_task(target_assignee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select private.is_leadership()
    or (
      private.current_user_role() = 'creative_head'
      and (
        target_assignee_id is null
        or target_assignee_id = (select auth.uid())
        or exists (
          select 1
          from public.profiles
          where id = target_assignee_id
            and reports_to_id = (select auth.uid())
            and approved
            and status = 'active'
            and role in ('creative_executive', 'editor')
        )
      )
    );
$$;

create or replace function private.can_view_creative_task(target_assignee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select private.current_user_role() = 'creative_head'
    and (
      target_assignee_id is null
      or target_assignee_id = (select auth.uid())
      or exists (
        select 1
        from public.profiles
        where id = target_assignee_id
          and reports_to_id = (select auth.uid())
          and role in ('creative_executive', 'editor')
      )
    );
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
      select 1
      from public.clients c
      where c.id = target_client_id
        and c.account_holder_id = (select auth.uid())
    )
    or (
      private.current_user_role() = 'creative_head'
      and exists (
        select 1
        from public.clients c
        join public.profiles executive on executive.id = c.account_holder_id
        where c.id = target_client_id
          and executive.reports_to_id = (select auth.uid())
          and executive.role in ('creative_executive', 'editor')
      )
    )
    or exists (
      select 1
      from public.tasks t
      where t.client_id = target_client_id
        and (
          t.assigned_user_id = (select auth.uid())
          or private.can_view_creative_task(t.assigned_user_id)
        )
    );
$$;

revoke all on function private.can_manage_creative_task(uuid) from public, anon;
revoke all on function private.can_view_creative_task(uuid) from public, anon;
revoke all on function private.can_access_client(uuid) from public, anon;
grant execute on function private.can_manage_creative_task(uuid) to authenticated;
grant execute on function private.can_view_creative_task(uuid) to authenticated;
grant execute on function private.can_access_client(uuid) to authenticated;

drop policy if exists "Approved users view permitted team" on public.profiles;
create policy "Approved users view permitted team"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or private.is_leadership()
  or (
    private.is_active_member()
    and (
      (
        private.current_user_role() = 'creative_head'
        and reports_to_id = (select auth.uid())
        and role in ('creative_executive', 'editor')
      )
      or (
        private.current_user_role() in ('creative_head', 'creative_executive', 'editor')
        and approved
        and status = 'active'
        and role in ('creative_head', 'creative_executive', 'editor')
      )
    )
  )
);

create or replace function public.set_creative_report_access(
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

revoke all on function public.set_creative_report_access(uuid, boolean)
  from public, anon;
grant execute on function public.set_creative_report_access(uuid, boolean)
  to authenticated;
