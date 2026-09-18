-- Companies and creators share campaigns, with separate identity/profile tables.
create table public.company_profiles (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 company_name text not null check(length(trim(company_name))>0), website text, industry text, country text default 'India', city text,
 company_size text, phone text, social_links jsonb not null default '{}', brand_description text,
 products text, target_audience text, target_locations text, brand_tone text, brand_values text, competitors text,
 logo_url text, plan text not null default 'free' check(plan in ('free','basic','elevate','pro','private')),
 search_limit integer not null default 3, campaign_limit integer not null default 1,
 created_at timestamptz not null default now()
);
create table public.company_members (
 company_id uuid not null references public.company_profiles(id) on delete cascade,
 user_id uuid not null references auth.users(id), role text not null check(role in ('owner','admin','campaign_manager','marketing','finance','viewer')),
 created_at timestamptz default now(), primary key(company_id,user_id)
);
create table public.company_team_invites (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.company_profiles(id) on delete cascade,
 email text not null, role text not null check(role in ('admin','campaign_manager','marketing','finance','viewer')),
 created_at timestamptz default now(), unique(company_id,email)
);
alter table public.campaigns add column company_id uuid references public.company_profiles(id);
alter table public.campaigns add column objective text;
alter table public.campaigns add column product text;
alter table public.campaigns add column target_audience text;
alter table public.campaigns add column language text;
alter table public.campaigns add column total_budget numeric not null default 0 check(total_budget>=0);
alter table public.campaign_applications add column lifecycle text not null default 'applied'
 check(lifecycle in ('applied','negotiating','confirmed','content_due','submitted','revision','approved','published','paid'));
alter table public.campaign_applications add column content_deadline date;
alter table public.creator_profiles add column availability text not null default 'available' check(availability in ('available','responding','booked'));
create table public.company_shortlists (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.company_profiles(id) on delete cascade,
 name text not null, created_at timestamptz default now(), unique(company_id,name)
);
create table public.company_creator_links (
 company_id uuid not null references public.company_profiles(id) on delete cascade, creator_id uuid not null references public.creator_profiles(id) on delete cascade,
 shortlist_id uuid references public.company_shortlists(id) on delete set null,
 relationship text not null default 'shortlisted' check(relationship in ('shortlisted','preferred','blocked','worked_with')),
 created_at timestamptz default now(), primary key(company_id,creator_id)
);
create table public.company_searches (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.company_profiles(id) on delete cascade,
 prompt text not null, filters jsonb not null default '{}', result_count integer not null default 0,
 results jsonb not null default '[]', saved boolean not null default false, created_at timestamptz default now()
);
create table public.campaign_content (
 id uuid primary key default gen_random_uuid(), application_id uuid not null references public.campaign_applications(id) on delete cascade,
 title text not null, content_url text not null check(content_url ~ '^https://'),
 status text not null default 'submitted' check(status in ('submitted','revision','approved','published')),
 review_note text, post_url text, reach bigint not null default 0 check(reach>=0), views bigint not null default 0 check(views>=0),
 impressions bigint not null default 0 check(impressions>=0), engagements bigint not null default 0 check(engagements>=0),
 created_at timestamptz not null default now()
);
create table public.company_payments (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.company_profiles(id) on delete cascade,
 application_id uuid not null references public.campaign_applications(id), amount numeric not null check(amount>0),
 status text not null default 'pending' check(status in ('pending','paid')), reference text, invoice_url text,
 paid_at timestamptz, created_at timestamptz not null default now()
);
create table public.company_activity (
 id bigint generated always as identity primary key, company_id uuid not null references public.company_profiles(id) on delete cascade,
 campaign_id uuid references public.campaigns(id) on delete cascade, message text not null, created_at timestamptz not null default now()
);
create table public.company_assets (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.company_profiles(id) on delete cascade,
 name text not null, url text not null check(url ~ '^https://'), kind text not null default 'brand_asset', created_at timestamptz default now()
);
create table public.company_preferences (
 user_id uuid primary key references auth.users(id), campaign_notifications boolean default true, message_notifications boolean default true,
 payment_notifications boolean default true
);
create table public.company_upgrade_requests (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.company_profiles(id), requested_plan text not null,
 created_at timestamptz default now(), unique(company_id,requested_plan)
);

create function private.company_role(cid uuid) returns text language sql stable security definer set search_path='' as $$
 select role from public.company_members where company_id=cid and user_id=auth.uid(); $$;
create function private.company_manage(cid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(private.company_role(cid) in ('owner','admin','campaign_manager','marketing'),false); $$;
create function private.campaign_company(cid uuid) returns uuid language sql stable security definer set search_path='' as $$
 select company_id from public.campaigns where id=cid; $$;
create function private.application_company(aid uuid) returns uuid language sql stable security definer set search_path='' as $$
 select c.company_id from public.campaign_applications a join public.campaigns c on c.id=a.campaign_id where a.id=aid; $$;
create function private.application_creator(aid uuid) returns uuid language sql stable security definer set search_path='' as $$
 select creator_id from public.campaign_applications where id=aid; $$;
create function private.invited_to_campaign(cid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.campaign_invitations where campaign_id=cid and creator_id=auth.uid()); $$;

-- Keep company signups out of the internal team profile workflow.
do $migration$
declare definition text;
begin
 select pg_get_functiondef('public.handle_new_user()'::regprocedure) into definition;
 definition := replace(definition, 'begin' || chr(10) || '  if requested_portal', 'begin' || chr(10) || '  if requested_portal = ''company'' then return new; end if;' || chr(10) || '  if requested_portal');
 execute definition;
end $migration$;

create function public.create_company_workspace(details jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare cid uuid;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 select company_id into cid from public.company_members where user_id=auth.uid() limit 1;
 if cid is not null then return cid; end if;
 insert into public.company_profiles(owner_id,company_name,website,industry,city,country,phone)
 values(auth.uid(),trim(details->>'company_name'),details->>'website',details->>'industry',details->>'city',coalesce(details->>'country','India'),details->>'phone') returning id into cid;
 insert into public.company_members values(cid,auth.uid(),'owner',now()); return cid;
end $$;

create function public.accept_company_invites() returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 insert into public.company_members(company_id,user_id,role)
 select company_id,auth.uid(),role from public.company_team_invites
 where lower(email)=lower(auth.jwt()->>'email') on conflict do nothing;
 delete from public.company_team_invites where lower(email)=lower(auth.jwt()->>'email');
end $$;

-- Database-owned quotas and identity fields cannot be changed by company clients.
create function private.company_campaign_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare company public.company_profiles%rowtype;
begin
 if TG_OP='UPDATE' and (new.company_id is distinct from old.company_id or new.created_by is distinct from old.created_by) then raise exception 'Campaign ownership cannot change'; end if;
 if new.company_id is null then return new; end if;
 select * into company from public.company_profiles where id=new.company_id for update;
 if TG_OP='INSERT' and (select count(*) from public.campaigns where company_id=new.company_id)>=company.campaign_limit then raise exception 'Your plan campaign limit has been reached'; end if;
 if company.plan='free' and new.required_creators>5 then raise exception 'Free campaigns support up to 5 creators'; end if;
 if new.status='published' and (length(trim(new.name))=0 or length(trim(new.description))=0 or cardinality(new.deliverables)=0 or new.application_deadline<current_date) then raise exception 'Complete the brief, deliverables and a future application deadline before publishing'; end if;
 return new;
end $$;
create trigger company_campaign_guard before insert or update on public.campaigns for each row execute function private.company_campaign_guard();

create function public.review_company_application(aid uuid, decision text, note text default null, amount numeric default null, deadline date default null, stage text default null)
returns void language plpgsql security definer set search_path='' as $$
declare app public.campaign_applications%rowtype; camp public.campaigns%rowtype;
begin
 select * into app from public.campaign_applications where id=aid for update;
 select * into camp from public.campaigns where id=app.campaign_id for update;
 if not private.company_manage(camp.company_id) then raise exception 'Campaign access denied'; end if;
 if decision not in ('submitted','shortlisted','accepted','rejected','completed') then raise exception 'Invalid decision'; end if;
 if app.status='withdrawn' then raise exception 'This application was withdrawn'; end if;
 if decision='accepted' and app.status<>'accepted' and (select count(*) from public.campaign_applications where campaign_id=camp.id and status in ('accepted','completed'))>=camp.required_creators then raise exception 'All creator places are filled'; end if;
 update public.campaign_applications set status=decision,brand_note=note,agreed_amount=coalesce(amount,agreed_amount),content_deadline=coalesce(deadline,content_deadline),
 lifecycle=coalesce(stage,case when decision='accepted' then 'confirmed' else lifecycle end) where id=aid;
end $$;

create function public.submit_creator_content(aid uuid,title text,url text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.campaign_applications where id=aid and creator_id=auth.uid() and status='accepted') then raise exception 'An accepted campaign is required'; end if;
 insert into public.campaign_content(application_id,title,content_url) values(aid,title,url);
 update public.campaign_applications set lifecycle='submitted' where id=aid;
end $$;

create function public.review_campaign_content(content_id uuid,decision text,note text default null) returns void language plpgsql security definer set search_path='' as $$
declare aid uuid;
begin
 select application_id into aid from public.campaign_content where id=content_id;
 if not private.company_manage(private.application_company(aid)) then raise exception 'Content access denied'; end if;
 if decision not in ('approved','revision') then raise exception 'Invalid content decision'; end if;
 if decision='revision' and nullif(trim(note),'') is null then raise exception 'Describe the requested changes'; end if;
 update public.campaign_content set status=decision,review_note=note where id=content_id;
 update public.campaign_applications set lifecycle=decision where id=aid;
end $$;

create function public.publish_creator_content(content_id uuid,url text) returns void language plpgsql security definer set search_path='' as $$
declare aid uuid;
begin
 select application_id into aid from public.campaign_content where id=content_id and status='approved';
 if private.application_creator(aid) is distinct from auth.uid() or url !~ '^https://' then raise exception 'Approved content and a valid post link are required'; end if;
 update public.campaign_content set status='published',post_url=url where id=content_id;
 update public.campaign_applications set lifecycle='published' where id=aid;
end $$;

create function private.company_activity_event() returns trigger language plpgsql security definer set search_path='' as $$
declare cid uuid; campaign uuid; msg text;
begin
 if TG_TABLE_NAME='campaign_applications' then campaign:=new.campaign_id; msg:=case when TG_OP='INSERT' then 'New creator application received' else 'Application updated: '||new.status||' · '||new.lifecycle end;
 elsif TG_TABLE_NAME='campaign_content' then select campaign_id into campaign from public.campaign_applications where id=new.application_id; msg:='Content '||new.status||': '||new.title;
 elsif TG_TABLE_NAME='campaign_messages' then campaign:=new.campaign_id; msg:='New campaign message';
 elsif TG_TABLE_NAME='campaign_invitations' then campaign:=new.campaign_id; msg:='Creator invitation '||new.status;
 end if;
 cid:=private.campaign_company(campaign);
 if cid is not null then insert into public.company_activity(company_id,campaign_id,message) values(cid,campaign,msg); end if; return new;
end $$;
create trigger company_application_activity after insert or update on public.campaign_applications for each row execute function private.company_activity_event();
create trigger company_content_activity after insert or update on public.campaign_content for each row execute function private.company_activity_event();
create trigger company_message_activity after insert on public.campaign_messages for each row execute function private.company_activity_event();
create trigger company_invitation_activity after insert or update on public.campaign_invitations for each row execute function private.company_activity_event();

create function public.company_search_creators(cid uuid,query_text text,criteria jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare company public.company_profiles%rowtype; matches jsonb; total integer; visible_limit integer; sid uuid;
begin
 if not private.company_manage(cid) then raise exception 'Creator search requires a campaign role'; end if;
 if length(trim(query_text))<3 then raise exception 'Describe the creators you need'; end if;
 select * into company from public.company_profiles where id=cid for update;
 if (select count(*) from public.company_searches where company_id=cid and (company.plan='free' or created_at>=date_trunc('month',now())))>=company.search_limit then raise exception 'Search allowance used. Request a plan upgrade in Billing.'; end if;
 visible_limit:=case when company.plan='free' then 5 else 100000 end;
 with filtered as (
 select p.* from public.creator_profiles p where p.status='active'
 and not exists(select 1 from public.company_creator_links l where l.company_id=cid and l.creator_id=p.id and l.relationship='blocked')
 and (coalesce(criteria->>'niche','')='' or exists(select 1 from unnest(p.niches) n where lower(n)=lower(criteria->>'niche')))
 and (coalesce(criteria->>'location','')='' or p.location ilike '%'||(criteria->>'location')||'%')
 and p.follower_count>=coalesce(nullif(criteria->>'follower_min','')::integer,0)
 and p.follower_count<=coalesce(nullif(criteria->>'follower_max','')::integer,2147483647)
 and p.engagement_rate>=coalesce(nullif(criteria->>'engagement_min','')::numeric,0)
 and (coalesce(criteria->>'budget_max','')='' or p.base_rate<= (criteria->>'budget_max')::numeric)
 and (coalesce(criteria->>'availability','')='' or p.availability=criteria->>'availability')
 ), ranked as (
 select jsonb_build_object('id',id,'full_name',full_name,'instagram_handle',instagram_handle,'location',location,'niches',niches,'content_formats',content_formats,'audience_locations',audience_locations,'follower_count',follower_count,'engagement_rate',engagement_rate,'base_rate',base_rate,'portfolio_url',portfolio_url,'bio',bio,'avatar_url',avatar_url,'availability',availability,'completed_campaigns',completed_campaigns) as data, engagement_rate,follower_count from filtered
 ) select (select count(*) from filtered),coalesce((select jsonb_agg(data) from (select data from ranked order by engagement_rate desc,follower_count desc limit visible_limit) r),'[]') into total,matches;
 insert into public.company_searches(company_id,prompt,filters,result_count,results) values(cid,query_text,criteria,total,matches) returning id into sid;
 return jsonb_build_object('id',sid,'total',total,'creators',matches,'remaining',company.search_limit-(select count(*) from public.company_searches where company_id=cid and (company.plan='free' or created_at>=date_trunc('month',now()))));
end $$;

-- RLS isolates each company and prevents bypassing discovery limits by table reads.
do $$ declare t text; begin
 foreach t in array array['company_profiles','company_members','company_team_invites','company_shortlists','company_creator_links','company_searches','campaign_content','company_payments','company_activity','company_assets','company_preferences','company_upgrade_requests'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 end loop;
end $$;
create policy company_read on public.company_profiles for select to authenticated using(private.company_role(id) is not null);
create policy company_edit on public.company_profiles for update to authenticated using(private.company_role(id) in ('owner','admin')) with check(private.company_role(id) in ('owner','admin'));
revoke insert,delete,update on public.company_profiles from authenticated;
grant update(company_name,website,industry,country,city,company_size,phone,social_links,brand_description,products,target_audience,target_locations,brand_tone,brand_values,competitors,logo_url) on public.company_profiles to authenticated;
create policy members_read on public.company_members for select to authenticated using(user_id=auth.uid() or private.company_role(company_id) is not null);
create policy invites_manage on public.company_team_invites for all to authenticated using(private.company_role(company_id) in ('owner','admin')) with check(private.company_role(company_id) in ('owner','admin'));
create policy campaigns_company_read on public.campaigns for select to authenticated using(private.company_role(company_id) is not null);
create policy campaigns_company_insert on public.campaigns for insert to authenticated with check(private.company_manage(company_id) and created_by is null and featured=false);
create policy campaigns_company_update on public.campaigns for update to authenticated using(private.company_manage(company_id)) with check(private.company_manage(company_id));
drop policy "Creators view available campaigns" on public.campaigns;
create policy "Creators view available campaigns" on public.campaigns for select to authenticated using(private.is_leadership() or (status='published' and visibility='public') or private.invited_to_campaign(id) or exists(select 1 from public.campaign_applications a where a.campaign_id=campaigns.id and a.creator_id=auth.uid()));
create policy applications_company_read on public.campaign_applications for select to authenticated using(private.company_role(private.campaign_company(campaign_id)) is not null);
create policy invitations_company_read on public.campaign_invitations for select to authenticated using(private.company_role(private.campaign_company(campaign_id)) is not null);
create policy invitations_company_insert on public.campaign_invitations for insert to authenticated with check(private.company_manage(private.campaign_company(campaign_id)) and invited_by is null);
create policy company_related_creator_read on public.creator_profiles for select to authenticated using(exists(select 1 from public.campaign_applications a where a.creator_id=creator_profiles.id and private.company_role(private.campaign_company(a.campaign_id)) is not null));
create policy company_messages_read on public.campaign_messages for select to authenticated using(private.company_role(private.campaign_company(campaign_id)) is not null);
create policy company_messages_send on public.campaign_messages for insert to authenticated with check(sender_id=auth.uid() and application_id is not null and exists(select 1 from public.campaign_applications a where a.id=campaign_messages.application_id and a.campaign_id=campaign_messages.campaign_id and ((private.company_manage(private.campaign_company(a.campaign_id)) and recipient_id=a.creator_id) or (a.creator_id=auth.uid() and exists(select 1 from public.company_members m where m.company_id=private.campaign_company(a.campaign_id) and m.user_id=campaign_messages.recipient_id)))));
create policy content_read on public.campaign_content for select to authenticated using(private.application_creator(application_id)=auth.uid() or private.company_role(private.application_company(application_id)) is not null);
create policy content_metrics on public.campaign_content for update to authenticated using(private.company_manage(private.application_company(application_id))) with check(private.company_manage(private.application_company(application_id)));
revoke update on public.campaign_content from authenticated;
grant update(reach,views,impressions,engagements) on public.campaign_content to authenticated;
create policy payment_read on public.company_payments for select to authenticated using(private.company_role(company_id) is not null or private.application_creator(application_id)=auth.uid());
create policy payment_insert on public.company_payments for insert to authenticated with check(private.company_role(company_id) in ('owner','admin','finance') and company_id=private.application_company(application_id));
create policy payment_update on public.company_payments for update to authenticated using(private.company_role(company_id) in ('owner','admin','finance')) with check(private.company_role(company_id) in ('owner','admin','finance') and company_id=private.application_company(application_id));
create policy activity_read on public.company_activity for select to authenticated using(private.company_role(company_id) is not null);
create policy searches_read on public.company_searches for select to authenticated using(private.company_role(company_id) is not null);
create policy searches_save on public.company_searches for update to authenticated using(private.company_manage(company_id)) with check(private.company_manage(company_id));
revoke update on public.company_searches from authenticated; grant update(saved) on public.company_searches to authenticated;
do $$ declare t text; begin
 foreach t in array array['company_shortlists','company_creator_links','company_assets'] loop
 execute format('create policy company_read on public.%I for select to authenticated using(private.company_role(company_id) is not null)',t);
 execute format('create policy company_write on public.%I for all to authenticated using(private.company_manage(company_id)) with check(private.company_manage(company_id))',t);
 end loop;
end $$;
create policy preferences_own on public.company_preferences for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy upgrades_read on public.company_upgrade_requests for select to authenticated using(private.company_role(company_id) is not null);
create policy upgrades_request on public.company_upgrade_requests for insert to authenticated with check(private.company_role(company_id) in ('owner','admin'));

do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('create_company_workspace','accept_company_invites','review_company_application','submit_creator_content','review_campaign_content','publish_creator_content','company_search_creators') loop
 execute format('revoke all on function %s from public,anon',f.signature);
 execute format('grant execute on function %s to authenticated',f.signature);
 end loop;
end $$;
create index on public.campaigns(company_id);
create index on public.company_members(user_id);
create index on public.company_searches(company_id,created_at);
create index on public.campaign_content(application_id);
create index on public.company_activity(company_id,created_at desc);
create index on public.company_payments(application_id);

-- Allow creators to identify their campaign's company contact without exposing company data.
create function public.creator_campaign_contact(cid uuid) returns uuid language sql stable security definer set search_path='' as $$
 select c.owner_id from public.company_profiles c join public.campaigns p on p.company_id=c.id
 where p.id=cid and exists(select 1 from public.campaign_applications a where a.campaign_id=cid and a.creator_id=auth.uid()); $$;
revoke all on function public.creator_campaign_contact(uuid) from public,anon; grant execute on function public.creator_campaign_contact(uuid) to authenticated;
