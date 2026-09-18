create or replace function private.company_campaign_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare company public.company_profiles%rowtype;
begin
 if TG_OP='UPDATE' and (new.company_id is distinct from old.company_id or new.created_by is distinct from old.created_by) then raise exception 'Campaign ownership cannot change'; end if;
 if new.company_id is null then return new; end if;
 if TG_OP='UPDATE' and new.featured is distinct from old.featured and auth.uid() is not null then raise exception 'Featured placement is managed by IVRE'; end if;
 select * into company from public.company_profiles where id=new.company_id for update;
 if TG_OP='INSERT' and (select count(*) from public.campaigns where company_id=new.company_id)>=company.campaign_limit then raise exception 'Your plan campaign limit has been reached'; end if;
 if company.plan='free' and new.required_creators>5 then raise exception 'Free campaigns support up to 5 creators'; end if;
 if new.status='published' and (length(trim(new.name))=0 or length(trim(new.description))=0 or cardinality(new.deliverables)=0 or new.application_deadline<current_date) then raise exception 'Complete the brief, deliverables and a future application deadline before publishing'; end if;
 return new;
end $$;

create function private.company_link_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if new.shortlist_id is not null and not exists(select 1 from public.company_shortlists where id=new.shortlist_id and company_id=new.company_id) then raise exception 'Choose a shortlist in this company'; end if;
 return new;
end $$;
create trigger company_link_guard before insert or update on public.company_creator_links for each row execute function private.company_link_guard();
revoke execute on function private.company_link_guard() from public,anon,authenticated;
do $fix$
declare definition text;
begin
 select pg_get_functiondef('public.handle_new_user()'::regprocedure) into definition;
 definition := replace(definition, chr(92)||chr(92)||'d', '[0-9]');
 definition := replace(definition, chr(92)||chr(92)||'.', '[.]');
 execute definition;
end $fix$;
