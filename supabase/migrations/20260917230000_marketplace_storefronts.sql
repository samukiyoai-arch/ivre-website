-- Additive storefront and cart foundation. No funds move through these tables.
create table public.creator_storefronts (
 creator_id uuid primary key references public.creator_profiles(id) on delete cascade,
 published boolean not null default false,
 languages text[] not null default '{}',
 social_links jsonb not null default '{}' check(jsonb_typeof(social_links)='object'),
 previous_work text not null default '' check(length(previous_work)<=6000),
 updated_at timestamptz not null default now()
);
create table public.creator_packages (
 id uuid primary key default gen_random_uuid(),
 creator_id uuid not null references public.creator_profiles(id) on delete cascade,
 title text not null check(length(trim(title)) between 3 and 160),
 platform text not null check(platform in ('Instagram','YouTube','TikTok','Facebook','LinkedIn','X','UGC')),
 deliverables text not null check(length(trim(deliverables)) between 10 and 4000),
 creator_amount numeric(12,2) not null check(creator_amount>=100 and creator_amount<=10000000),
 delivery_days integer not null check(delivery_days between 1 and 180),
 requires_post boolean not null default true,
 usage_rights text not null check(length(trim(usage_rights)) between 3 and 2000),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create index creator_packages_creator on public.creator_packages(creator_id);
create table public.creator_portfolio_assets (
 id uuid primary key default gen_random_uuid(),
 creator_id uuid not null references public.creator_profiles(id) on delete cascade,
 kind text not null check(kind in ('image','video','link')),
 url text not null check(url ~ '^https://' and length(url)<=2000),
 caption text not null default '' check(length(caption)<=300),
 created_at timestamptz not null default now()
);
create table public.marketplace_cart_items (
 company_id uuid not null references public.company_profiles(id) on delete cascade,
 package_id uuid not null references public.creator_packages(id),
 quantity integer not null default 1 check(quantity between 1 and 20),
 created_at timestamptz not null default now(),
 primary key(company_id,package_id)
);
create table public.marketplace_cart_briefs (
 company_id uuid primary key references public.company_profiles(id) on delete cascade,
 product text not null default '' check(length(product)<=500),
 objective text not null default '' check(length(objective)<=2000),
 audience text not null default '' check(length(audience)<=2000),
 instructions text not null default '' check(length(instructions)<=6000),
 deadline date,
 updated_at timestamptz not null default now()
);

alter table public.creator_storefronts enable row level security;
alter table public.creator_packages enable row level security;
alter table public.creator_portfolio_assets enable row level security;
alter table public.marketplace_cart_items enable row level security;
alter table public.marketplace_cart_briefs enable row level security;
grant select,insert,update,delete on public.creator_storefronts,public.creator_packages,public.creator_portfolio_assets,public.marketplace_cart_items,public.marketplace_cart_briefs to authenticated;
create policy storefront_owner on public.creator_storefronts for all to authenticated using(creator_id=auth.uid()) with check(creator_id=auth.uid());
create policy package_owner on public.creator_packages for all to authenticated using(creator_id=auth.uid()) with check(creator_id=auth.uid());
create policy portfolio_owner on public.creator_portfolio_assets for all to authenticated using(creator_id=auth.uid()) with check(creator_id=auth.uid());
create policy cart_company on public.marketplace_cart_items for all to authenticated using(private.company_manage(company_id)) with check(private.company_manage(company_id));
create policy brief_company on public.marketplace_cart_briefs for all to authenticated using(private.company_manage(company_id)) with check(private.company_manage(company_id));

create function private.storefront_publish_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare p public.creator_profiles%rowtype;
begin
 select * into p from public.creator_profiles where id=new.creator_id;
 if new.published and (p.status<>'active' or nullif(trim(p.bio),'') is null or nullif(trim(p.location),'') is null or cardinality(p.niches)=0
 or not exists(select 1 from public.creator_packages where creator_id=new.creator_id and active)
 or not exists(select 1 from auth.users where id=new.creator_id and email_confirmed_at is not null)) then
  raise exception 'Complete your bio, location, niche, verified email and at least one active package before publishing.';
 end if;
 new.updated_at:=now();return new;
end $$;
create trigger storefront_publish_guard before insert or update on public.creator_storefronts for each row execute function private.storefront_publish_guard();
revoke all on function private.storefront_publish_guard() from public,anon,authenticated;

-- Explicit public projection: never expose email, earnings or private account fields.
create function public.marketplace_profile(profile_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.creator_profiles%rowtype; s public.creator_storefronts%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in to view creator profiles.'; end if;
 select * into p from public.creator_profiles where id=profile_id;
 select * into s from public.creator_storefronts where creator_id=profile_id;
 if p.id is null or (auth.uid()<>profile_id and (p.status<>'active' or not coalesce(s.published,false))) then raise exception 'This creator profile is not available.'; end if;
 return jsonb_build_object('id',p.id,'full_name',p.full_name,'bio',p.bio,'avatar_url',p.avatar_url,
 'location',p.location,'niches',p.niches,'instagram_handle',p.instagram_handle,'follower_count',p.follower_count,
 'engagement_rate',p.engagement_rate,'availability',p.availability,'portfolio_url',p.portfolio_url,
 'languages',s.languages,'social_links',s.social_links,'previous_work',s.previous_work,'published',coalesce(s.published,false),
 'stats_source','Creator-provided','packages',coalesce((select jsonb_agg(jsonb_build_object(
 'id',id,'title',title,'platform',platform,'deliverables',deliverables,'creator_amount',creator_amount,
 'display_price',creator_amount+round(creator_amount*0.1,2),'delivery_days',delivery_days,'requires_post',requires_post,'usage_rights',usage_rights))
 from public.creator_packages where creator_id=profile_id and active),'[]'::jsonb),
 'assets',coalesce((select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'url',url,'caption',caption) order by created_at)
 from public.creator_portfolio_assets where creator_id=profile_id),'[]'::jsonb));
end $$;
revoke all on function public.marketplace_profile(uuid) from public,anon;
grant execute on function public.marketplace_profile(uuid) to authenticated;

-- Homepage previews are deliberately not a search or a full profile endpoint.
create function public.marketplace_featured() returns jsonb language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(x),'[]'::jsonb) from (
 select p.id,p.full_name,p.avatar_url,p.location,p.niches,
 (select min(creator_amount+round(creator_amount*0.1,2)) from public.creator_packages where creator_id=p.id and active) as display_price
 from public.creator_profiles p join public.creator_storefronts s on s.creator_id=p.id
 where s.published and p.status='active' and exists(select 1 from public.creator_packages where creator_id=p.id and active)
 order by s.updated_at desc limit 12) x;
$$;
revoke all on function public.marketplace_featured() from public;
grant execute on function public.marketplace_featured() to anon,authenticated;

create function public.marketplace_cart(cid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare items jsonb; base numeric; creator_fee numeric; company_fee numeric;
begin
 if not private.company_manage(cid) then raise exception 'A company campaign role is required.'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('package_id',p.id,'creator_id',p.creator_id,'creator_name',c.full_name,'title',p.title,
 'platform',p.platform,'quantity',i.quantity,'creator_amount',p.creator_amount,'creator_fee',round(p.creator_amount*.1,2),
 'company_fee',round(p.creator_amount*.1,2),'display_price',p.creator_amount+round(p.creator_amount*.1,2),
 'delivery_days',p.delivery_days,'deliverables',p.deliverables,'usage_rights',p.usage_rights,'requires_post',p.requires_post,
 'available',p.active and coalesce(s.published,false) and c.status='active' and c.availability<>'booked')),'[]'::jsonb),
 coalesce(sum(p.creator_amount*i.quantity),0),coalesce(sum(round(p.creator_amount*.1,2)*i.quantity),0)
 into items,base,creator_fee from public.marketplace_cart_items i join public.creator_packages p on p.id=i.package_id
 join public.creator_profiles c on c.id=p.creator_id left join public.creator_storefronts s on s.creator_id=p.creator_id where i.company_id=cid;
 company_fee:=creator_fee;
 return jsonb_build_object('items',items,'creator_earnings',base,'creator_fee',creator_fee,'company_fee',company_fee,
 'package_total',base+creator_fee,'subtotal',base+creator_fee+company_fee,'tax',null,'payable_total',null,
 'payment_enabled',false,'payment_notice','Online booking payments are not active. Tax and marketplace settlement approval are still required. No money will be collected.');
end $$;
revoke all on function public.marketplace_cart(uuid) from public,anon;
grant execute on function public.marketplace_cart(uuid) to authenticated;
