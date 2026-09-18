-- Split the workspace into an admin portal and a creative delivery portal.
-- Creative signups receive a non-privileged pending role until an admin approves them.

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (
    role in (
      'admin',
      'ceo',
      'coo',
      'creative_head',
      'creative_executive',
      'sales_head',
      'marketing_head',
      'editor',
      'team'
    )
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first_user boolean;
  is_creative_request boolean;
begin
  select not exists(select 1 from public.profiles) into is_first_user;
  is_creative_request := lower(coalesce(new.raw_user_meta_data ->> 'requested_portal', '')) = 'creative';

  insert into public.profiles (
    id, full_name, email, role, department, status, approved,
    can_view_credentials, can_edit_master
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
    is_first_user
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create or replace function private.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select approved and status = 'active'
      from public.profiles
      where id = (select auth.uid())
    ),
    false
  );
$$;

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
        or exists (
          select 1
          from public.profiles
          where id = target_assignee_id
            and approved
            and status = 'active'
            and role in ('creative_head', 'creative_executive', 'editor')
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
      or exists (
        select 1
        from public.profiles
        where id = target_assignee_id
          and role in ('creative_head', 'creative_executive', 'editor')
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

revoke all on function private.is_active_member() from public, anon;
revoke all on function private.can_manage_creative_task(uuid) from public, anon;
revoke all on function private.can_view_creative_task(uuid) from public, anon;
revoke all on function private.can_access_client(uuid) from public, anon;
grant execute on function private.is_active_member() to authenticated;
grant execute on function private.can_manage_creative_task(uuid) to authenticated;
grant execute on function private.can_view_creative_task(uuid) to authenticated;
grant execute on function private.can_access_client(uuid) to authenticated;

drop policy if exists "Authenticated users can view team" on public.profiles;
create policy "Approved users view permitted team"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or private.is_leadership()
  or (
    private.is_active_member()
    and private.current_user_role() in ('creative_head', 'creative_executive', 'editor')
    and approved
    and status = 'active'
    and role in ('creative_head', 'creative_executive', 'editor')
  )
);

drop policy if exists "Users view assigned tasks" on public.tasks;
create policy "Users view permitted tasks"
on public.tasks for select to authenticated
using (
  private.is_leadership()
  or assigned_user_id = (select auth.uid())
  or private.can_view_creative_task(assigned_user_id)
);

drop policy if exists "Leadership creates tasks" on public.tasks;
create policy "Task managers create tasks"
on public.tasks for insert to authenticated
with check (private.can_manage_creative_task(assigned_user_id));

drop policy if exists "Owners update tasks" on public.tasks;
create policy "Task managers and owners update tasks"
on public.tasks for update to authenticated
using (
  private.is_leadership()
  or assigned_user_id = (select auth.uid())
  or private.can_view_creative_task(assigned_user_id)
)
with check (
  private.is_leadership()
  or assigned_user_id = (select auth.uid())
  or private.can_manage_creative_task(assigned_user_id)
);

grant update on public.profiles to authenticated;
