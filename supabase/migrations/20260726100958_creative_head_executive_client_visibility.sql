-- Creative heads oversee every active Creative Portal executive/editor and
-- may read the client records owned by those direct reports.
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
          and executive.approved
          and executive.status = 'active'
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

revoke all on function private.can_access_client(uuid) from public, anon;
grant execute on function private.can_access_client(uuid) to authenticated;
