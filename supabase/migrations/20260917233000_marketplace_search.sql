create table public.marketplace_guest_searches (
 guest_key text primary key check(length(guest_key)=64),
 prompt text not null,
 results jsonb not null,
 claimed_company uuid references public.company_profiles(id),
 created_at timestamptz not null default now()
);
alter table public.marketplace_guest_searches enable row level security;
revoke all on public.marketplace_guest_searches from anon,authenticated;
grant all on public.marketplace_guest_searches to service_role;
alter table public.company_profiles alter column search_limit set default 1;
update public.company_profiles set search_limit=1 where plan='free';

create function private.marketplace_match(criteria jsonb) returns jsonb language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(x),'[]'::jsonb) from (
 select p.id,p.full_name,p.avatar_url,p.location,p.niches,p.instagram_handle,p.follower_count,p.engagement_rate,p.availability,
 p.content_formats,p.audience_locations,p.base_rate,
 (select min(creator_amount+round(creator_amount*.1,2)) from public.creator_packages where creator_id=p.id and active) as display_price
 from public.creator_profiles p join public.creator_storefronts s on s.creator_id=p.id
 where s.published and p.status='active' and p.availability<>'booked'
 and exists(select 1 from public.creator_packages k where k.creator_id=p.id and k.active
   and (coalesce(criteria->>'platform','')='' or lower(k.platform)=lower(criteria->>'platform'))
   and (coalesce(criteria->>'budget_max','')='' or k.creator_amount+round(k.creator_amount*.1,2)<=(criteria->>'budget_max')::numeric))
 and (coalesce(criteria->>'niche','')='' or exists(select 1 from unnest(p.niches) n where lower(n)=lower(criteria->>'niche')))
 and (coalesce(criteria->>'location','')='' or p.location ilike '%'||(criteria->>'location')||'%')
 and p.follower_count>=coalesce(nullif(criteria->>'follower_min','')::numeric,0)
 and p.follower_count<=coalesce(nullif(criteria->>'follower_max','')::numeric,2147483647)
 and p.engagement_rate>=coalesce(nullif(criteria->>'engagement_min','')::numeric,0)
 order by p.engagement_rate desc,p.id limit 240) x;
$$;
revoke all on function private.marketplace_match(jsonb) from public,anon,authenticated;

create or replace function public.company_search_creators(cid uuid,query_text text,criteria jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare company public.company_profiles%rowtype; matches jsonb; used integer; sid uuid;
begin
 if not private.company_manage(cid) then raise exception 'Creator search requires a campaign role'; end if;
 if length(trim(query_text)) not between 3 and 1500 then raise exception 'Enter between 3 and 1,500 characters.'; end if;
 select * into company from public.company_profiles where id=cid for update;
 select count(*) into used from public.company_searches where company_id=cid and (company.plan='free' or created_at>=date_trunc('month',now()));
 if used>=company.search_limit then raise exception 'Your search allowance is used. Choose a paid plan in Billing to search again. Signing in does not reset your free search.'; end if;
 matches:=private.marketplace_match(criteria);
 -- Zero matches do not consume an allowance.
 if jsonb_array_length(matches)>0 then
  insert into public.company_searches(company_id,prompt,filters,result_count,results) values(cid,query_text,criteria,jsonb_array_length(matches),matches) returning id into sid;
  used:=used+1;
 end if;
 return jsonb_build_object('id',sid,'total',jsonb_array_length(matches),'creators',matches,'remaining',greatest(0,company.search_limit-used));
end $$;

-- Service-only guest search. Browser identifiers are signed by the edge API.
create function public.marketplace_guest_search(gkey text,query_text text,criteria jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare previous public.marketplace_guest_searches%rowtype; matches jsonb;
begin
 if length(gkey)<>64 or length(trim(query_text)) not between 3 and 1500 then raise exception 'Invalid search'; end if;
 perform pg_advisory_xact_lock(hashtextextended(gkey,0));
 select * into previous from public.marketplace_guest_searches where guest_key=gkey;
 if previous.guest_key is not null then
  if previous.prompt=query_text then return jsonb_build_object('creators',previous.results,'total',jsonb_array_length(previous.results),'remaining',0); end if;
  return jsonb_build_object('login_required',true,'creators','[]'::jsonb,'remaining',0);
 end if;
 matches:=private.marketplace_match(criteria);
 if jsonb_array_length(matches)>0 then insert into public.marketplace_guest_searches(guest_key,prompt,results) values(gkey,query_text,matches); end if;
 return jsonb_build_object('creators',matches,'total',jsonb_array_length(matches),'remaining',case when jsonb_array_length(matches)>0 then 0 else 1 end);
end $$;
revoke all on function public.marketplace_guest_search(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.marketplace_guest_search(text,text,jsonb) to service_role;

create function public.marketplace_claim_trial(gkey text,cid uuid,actor uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare g public.marketplace_guest_searches%rowtype;
begin
 if not exists(select 1 from public.company_members where company_id=cid and user_id=actor and role in ('owner','admin','campaign_manager','marketing')) then raise exception 'Company access denied'; end if;
 perform 1 from public.company_profiles where id=cid for update;
 select * into g from public.marketplace_guest_searches where guest_key=gkey for update;
 if g.guest_key is null then return false; end if;
 if g.claimed_company is not null then
  if g.claimed_company<>cid then raise exception 'This trial has already been linked to another company';end if;
  return true;
 end if;
 -- Preserve the first result set even if this company already used its allowance.
 if not exists(select 1 from public.company_searches where company_id=cid) then
  insert into public.company_searches(company_id,prompt,filters,result_count,results) values(cid,g.prompt,'{}',jsonb_array_length(g.results),g.results);
 end if;
 update public.marketplace_guest_searches set claimed_company=cid where guest_key=gkey;
 return true;
end $$;
revoke all on function public.marketplace_claim_trial(text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.marketplace_claim_trial(text,uuid,uuid) to service_role;
