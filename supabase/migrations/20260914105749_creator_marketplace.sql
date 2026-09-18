-- IVRE Creator Marketplace
-- Separate public creator accounts from internal IVRE team accounts.

create sequence if not exists public.campaign_code_seq start 1;

create table if not exists public.creator_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  instagram_handle text,
  avatar_url text,
  bio text,
  location text,
  niches text[] not null default '{}',
  content_formats text[] not null default '{}',
  audience_locations text[] not null default '{}',
  follower_count integer not null default 0 check (follower_count >= 0),
  engagement_rate numeric(5,2) not null default 0 check (engagement_rate between 0 and 100),
  base_rate numeric(12,2) not null default 0 check (base_rate >= 0),
  portfolio_url text,
  completed_campaigns integer not null default 0 check (completed_campaigns >= 0),
  total_earnings numeric(14,2) not null default 0 check (total_earnings >= 0),
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  campaign_code text not null unique default ('CMP-' || lpad(nextval('public.campaign_code_seq')::text, 4, '0')),
  name text not null,
  brand_name text not null,
  brand_logo_url text,
  description text not null,
  campaign_type text not null,
  location text not null,
  niche text not null,
  creator_type text not null,
  follower_min integer not null default 0 check (follower_min >= 0),
  follower_max integer not null default 0 check (follower_max >= follower_min),
  engagement_min numeric(5,2) not null default 0 check (engagement_min between 0 and 100),
  required_creators integer not null default 1 check (required_creators > 0),
  deliverables text[] not null default '{}',
  budget_min numeric(12,2) not null default 0 check (budget_min >= 0),
  budget_max numeric(12,2) not null default 0 check (budget_max >= budget_min),
  application_deadline date not null,
  campaign_start date,
  campaign_end date,
  visibility text not null default 'public' check (visibility in ('public','private')),
  status text not null default 'draft' check (status in ('draft','published','closed','cancelled')),
  featured boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (campaign_end is null or campaign_start is null or campaign_end >= campaign_start)
);

create table if not exists public.campaign_invitations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  creator_id uuid not null references public.creator_profiles(id) on delete cascade,
  invited_by uuid references public.profiles(id) on delete set null default auth.uid(),
  message text,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, creator_id)
);

create table if not exists public.campaign_applications (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  creator_id uuid not null references public.creator_profiles(id) on delete cascade,
  why_fit text not null,
  content_idea text not null,
  proposed_price numeric(12,2) not null check (proposed_price > 0),
  portfolio_url text,
  match_score integer not null check (match_score between 0 and 100),
  match_breakdown jsonb not null default '{}'::jsonb,
  status text not null default 'submitted'
    check (status in ('submitted','shortlisted','accepted','rejected','withdrawn','completed')),
  brand_note text,
  agreed_amount numeric(12,2) check (agreed_amount is null or agreed_amount >= 0),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, creator_id)
);

create table if not exists public.campaign_messages (
  id bigint generated always as identity primary key,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  application_id uuid references public.campaign_applications(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_campaigns_discovery
  on public.campaigns(status, visibility, application_deadline, niche, location);
create index if not exists idx_campaign_applications_creator
  on public.campaign_applications(creator_id, submitted_at desc);
create index if not exists idx_campaign_applications_campaign_score
  on public.campaign_applications(campaign_id, match_score desc);
create index if not exists idx_campaign_invitations_creator
  on public.campaign_invitations(creator_id, created_at desc);
create index if not exists idx_campaign_messages_participants
  on public.campaign_messages(sender_id, recipient_id, created_at desc);

drop trigger if exists creator_profiles_updated_at on public.creator_profiles;
create trigger creator_profiles_updated_at before update on public.creator_profiles
for each row execute function public.set_updated_at();
drop trigger if exists campaigns_updated_at on public.campaigns;
create trigger campaigns_updated_at before update on public.campaigns
for each row execute function public.set_updated_at();
drop trigger if exists campaign_invitations_updated_at on public.campaign_invitations;
create trigger campaign_invitations_updated_at before update on public.campaign_invitations
for each row execute function public.set_updated_at();
drop trigger if exists campaign_applications_updated_at on public.campaign_applications;
create trigger campaign_applications_updated_at before update on public.campaign_applications
for each row execute function public.set_updated_at();

create or replace function private.calculate_campaign_match(
  target_creator_id uuid,
  target_campaign_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  creator public.creator_profiles%rowtype;
  campaign public.campaigns%rowtype;
  niche_score integer;
  location_score integer;
  follower_score integer;
  engagement_score integer;
  budget_score integer;
  experience_score integer;
  overall_score integer;
begin
  select * into creator from public.creator_profiles where id = target_creator_id and status = 'active';
  select * into campaign from public.campaigns where id = target_campaign_id and status = 'published';

  if creator.id is null or campaign.id is null then
    raise exception 'Creator or campaign is unavailable' using errcode = 'P0002';
  end if;

  niche_score := case
    when exists (select 1 from unnest(creator.niches) n where lower(n) = lower(campaign.niche)) then 100
    when cardinality(creator.niches) = 0 then 55
    else 35
  end;

  location_score := case
    when lower(campaign.location) = 'india' and creator.location is not null then 100
    when creator.location is not null and lower(creator.location) like '%' || lower(campaign.location) || '%' then 100
    else 45
  end;

  follower_score := case
    when creator.follower_count between campaign.follower_min and campaign.follower_max then 100
    when creator.follower_count < campaign.follower_min and campaign.follower_min > 0
      then greatest(20, round(creator.follower_count::numeric / campaign.follower_min * 100)::integer)
    when creator.follower_count > campaign.follower_max and creator.follower_count > 0
      then greatest(45, round(campaign.follower_max::numeric / creator.follower_count * 100)::integer)
    else 70
  end;

  engagement_score := case
    when campaign.engagement_min = 0 then 90
    when creator.engagement_rate >= campaign.engagement_min then 100
    else greatest(20, round(creator.engagement_rate / campaign.engagement_min * 100)::integer)
  end;

  budget_score := case
    when creator.base_rate = 0 then 70
    when creator.base_rate between campaign.budget_min and campaign.budget_max then 100
    when creator.base_rate < campaign.budget_min then 90
    else greatest(25, round(campaign.budget_max / creator.base_rate * 100)::integer)
  end;

  experience_score := least(
    100,
    45 + creator.completed_campaigns * 8 + case when creator.portfolio_url is not null then 20 else 0 end
  );

  overall_score := round(
    niche_score * 0.25 +
    location_score * 0.15 +
    follower_score * 0.20 +
    engagement_score * 0.20 +
    budget_score * 0.10 +
    experience_score * 0.10
  )::integer;

  return jsonb_build_object(
    'overall', overall_score,
    'niche', niche_score,
    'location', location_score,
    'followers', follower_score,
    'engagement', engagement_score,
    'budget', budget_score,
    'experience', experience_score
  );
end;
$$;

revoke all on function private.calculate_campaign_match(uuid, uuid) from public, anon, authenticated;

create or replace function public.creator_campaign_match(campaign_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.calculate_campaign_match((select auth.uid()), campaign_id);
$$;

revoke all on function public.creator_campaign_match(uuid) from public, anon;
grant execute on function public.creator_campaign_match(uuid) to authenticated;

create or replace function private.submit_campaign_application(
  target_campaign_id uuid,
  application_why_fit text,
  application_content_idea text,
  application_price numeric,
  application_portfolio_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target_campaign public.campaigns%rowtype;
  score jsonb;
  application_id uuid;
begin
  if caller_id is null or not exists (
    select 1 from public.creator_profiles where id = caller_id and status = 'active'
  ) then
    raise exception 'An active creator profile is required' using errcode = '42501';
  end if;

  select * into target_campaign
  from public.campaigns
  where id = target_campaign_id and status = 'published';

  if target_campaign.id is null or target_campaign.application_deadline < current_date then
    raise exception 'This campaign is not accepting applications' using errcode = '22023';
  end if;

  if target_campaign.visibility = 'private' and not exists (
    select 1 from public.campaign_invitations
    where campaign_id = target_campaign_id and creator_id = caller_id
  ) then
    raise exception 'This is an invitation-only campaign' using errcode = '42501';
  end if;

  if nullif(btrim(application_why_fit), '') is null
    or nullif(btrim(application_content_idea), '') is null
    or application_price is null
    or application_price <= 0 then
    raise exception 'Complete every application field' using errcode = '22023';
  end if;

  score := private.calculate_campaign_match(caller_id, target_campaign_id);

  insert into public.campaign_applications (
    campaign_id, creator_id, why_fit, content_idea, proposed_price,
    portfolio_url, match_score, match_breakdown
  ) values (
    target_campaign_id, caller_id, btrim(application_why_fit),
    btrim(application_content_idea), application_price,
    nullif(btrim(application_portfolio_url), ''),
    (score ->> 'overall')::integer, score
  )
  returning id into application_id;

  update public.campaign_invitations
  set status = 'accepted', updated_at = now()
  where campaign_id = target_campaign_id and creator_id = caller_id;

  return application_id;
exception
  when unique_violation then
    raise exception 'You have already applied to this campaign' using errcode = '23505';
end;
$$;

revoke all on function private.submit_campaign_application(uuid, text, text, numeric, text)
  from public, anon, authenticated;

create or replace function public.submit_campaign_application(
  target_campaign_id uuid,
  application_why_fit text,
  application_content_idea text,
  application_price numeric,
  application_portfolio_url text default null
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select private.submit_campaign_application(
    target_campaign_id,
    application_why_fit,
    application_content_idea,
    application_price,
    application_portfolio_url
  );
$$;

revoke all on function public.submit_campaign_application(uuid, text, text, numeric, text)
  from public, anon;
grant execute on function public.submit_campaign_application(uuid, text, text, numeric, text)
  to authenticated;

alter table public.creator_profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_invitations enable row level security;
alter table public.campaign_applications enable row level security;
alter table public.campaign_messages enable row level security;

create policy "Creators view their profile"
on public.creator_profiles for select to authenticated
using ((select auth.uid()) = id or private.is_leadership());

create policy "Creators update their profile"
on public.creator_profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id and status = 'active');

create policy "Anyone views public campaigns"
on public.campaigns for select to anon
using (status = 'published' and visibility = 'public');

create policy "Creators view available campaigns"
on public.campaigns for select to authenticated
using (
  private.is_leadership()
  or (status = 'published' and visibility = 'public')
  or exists (
    select 1 from public.campaign_invitations invitation
    where invitation.campaign_id = id and invitation.creator_id = (select auth.uid())
  )
);

create policy "Leadership creates campaigns"
on public.campaigns for insert to authenticated
with check (private.is_leadership());

create policy "Leadership updates campaigns"
on public.campaigns for update to authenticated
using (private.is_leadership())
with check (private.is_leadership());

create policy "Leadership deletes campaigns"
on public.campaigns for delete to authenticated
using (private.is_leadership());

create policy "Creators view their invitations"
on public.campaign_invitations for select to authenticated
using ((select auth.uid()) = creator_id or private.is_leadership());

create policy "Leadership manages invitations"
on public.campaign_invitations for all to authenticated
using (private.is_leadership())
with check (private.is_leadership());

create policy "Creators view their applications"
on public.campaign_applications for select to authenticated
using ((select auth.uid()) = creator_id or private.is_leadership());

create policy "Participants view campaign messages"
on public.campaign_messages for select to authenticated
using (
  (select auth.uid()) in (sender_id, recipient_id)
  or private.is_leadership()
);

create policy "Participants send campaign messages"
on public.campaign_messages for insert to authenticated
with check (
  (select auth.uid()) = campaign_messages.sender_id
  and exists (
    select 1
    from public.campaign_applications application
    where application.id = campaign_messages.application_id
      and application.campaign_id = campaign_messages.campaign_id
      and (
        (
          application.creator_id = campaign_messages.sender_id
          and exists (
            select 1 from public.profiles recipient
            where recipient.id = campaign_messages.recipient_id
              and recipient.approved
              and recipient.status = 'active'
              and recipient.role in ('admin', 'ceo', 'coo', 'marketing_head')
          )
        )
        or (
          private.is_leadership()
          and application.creator_id = campaign_messages.recipient_id
        )
      )
  )
);

grant select, update on table public.creator_profiles to authenticated;
grant select on table public.campaigns to anon, authenticated;
grant insert, update, delete on table public.campaigns to authenticated;
grant select, insert, update, delete on table public.campaign_invitations to authenticated;
grant select on table public.campaign_applications to authenticated;
grant select, insert on table public.campaign_messages to authenticated;
grant usage, select on sequence public.campaign_code_seq to authenticated;
grant usage, select on sequence public.campaign_messages_id_seq to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first_user boolean;
  requested_portal text := lower(coalesce(new.raw_user_meta_data ->> 'requested_portal', ''));
  creative_manager_id uuid;
begin
  if requested_portal = 'creator' then
    insert into public.creator_profiles (
      id, full_name, email, instagram_handle, location, niches,
      follower_count, engagement_rate, base_rate, portfolio_url
    ) values (
      new.id,
      coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
      coalesce(new.email, ''),
      nullif(new.raw_user_meta_data ->> 'instagram_handle', ''),
      nullif(new.raw_user_meta_data ->> 'location', ''),
      coalesce(
        array(select jsonb_array_elements_text(new.raw_user_meta_data -> 'niches')),
        '{}'::text[]
      ),
      greatest(
        case when coalesce(new.raw_user_meta_data ->> 'follower_count', '') ~ '^\d+$'
          then (new.raw_user_meta_data ->> 'follower_count')::integer else 0 end,
        0
      ),
      greatest(
        case when coalesce(new.raw_user_meta_data ->> 'engagement_rate', '') ~ '^\d+(\.\d+)?$'
          then least((new.raw_user_meta_data ->> 'engagement_rate')::numeric, 100) else 0 end,
        0
      ),
      greatest(
        case when coalesce(new.raw_user_meta_data ->> 'base_rate', '') ~ '^\d+(\.\d+)?$'
          then (new.raw_user_meta_data ->> 'base_rate')::numeric else 0 end,
        0
      ),
      nullif(new.raw_user_meta_data ->> 'portfolio_url', '')
    )
    on conflict (id) do nothing;
    return new;
  end if;

  select not exists(select 1 from public.profiles) into is_first_user;

  if requested_portal = 'creative' then
    select id into creative_manager_id
    from public.profiles
    where role = 'creative_head' and approved and status = 'active'
    order by created_at
    limit 1;
  end if;

  insert into public.profiles (
    id, full_name, email, role, department, status, approved,
    can_view_credentials, can_edit_master, reports_to_id
  ) values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    case
      when is_first_user then 'admin'
      when requested_portal = 'creative' then 'creative_executive'
      else 'team'
    end,
    case
      when is_first_user then 'Management'
      when requested_portal = 'creative' then 'Creative'
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

insert into public.campaigns (
  name, brand_name, description, campaign_type, location, niche,
  creator_type, follower_min, follower_max, engagement_min,
  required_creators, deliverables, budget_min, budget_max,
  application_deadline, campaign_start, campaign_end,
  visibility, status, featured
)
select * from (values
  (
    'New Product Launch', 'Apex Performance',
    'We are looking for Indian fitness creators to introduce a new performance nutrition range through credible, routine-led storytelling.',
    'Instagram Reels', 'India', 'Fitness', 'Micro Creator',
    10000, 100000, 3.0::numeric, 20,
    array['1 × Instagram Reel','2 × Instagram Stories']::text[],
    10000::numeric, 15000::numeric,
    (current_date + 21), (current_date + 28), (current_date + 43),
    'public', 'published', true
  ),
  (
    'Monsoon Skin Reset', 'Nira Botanics',
    'Create a candid skincare routine around humid-weather concerns, texture and daily barrier care for an urban Indian audience.',
    'Reels + Stories', 'India', 'Beauty', 'Micro Creator',
    15000, 150000, 2.5::numeric, 12,
    array['1 × Instagram Reel','3 × Instagram Stories']::text[],
    12000::numeric, 20000::numeric,
    (current_date + 16), (current_date + 24), (current_date + 38),
    'public', 'published', false
  ),
  (
    'Mumbai Weekend Menu', 'Third Place Brew',
    'Showcase the cafe experience, signature plates and a relaxed weekend ritual through locally relevant short-form content.',
    'Instagram Reel', 'Mumbai', 'Food', 'Nano Creator',
    3000, 30000, 4.0::numeric, 8,
    array['1 × Instagram Reel','5 edited photos']::text[],
    5000::numeric, 9000::numeric,
    (current_date + 12), (current_date + 18), (current_date + 30),
    'public', 'published', false
  )
) as seed(
  name, brand_name, description, campaign_type, location, niche,
  creator_type, follower_min, follower_max, engagement_min,
  required_creators, deliverables, budget_min, budget_max,
  application_deadline, campaign_start, campaign_end,
  visibility, status, featured
)
where not exists (
  select 1 from public.campaigns existing
  where existing.name = seed.name and existing.brand_name = seed.brand_name
);
