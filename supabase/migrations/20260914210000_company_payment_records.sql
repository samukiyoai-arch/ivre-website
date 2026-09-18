-- Bookkeeping only. No funds are moved by these records.
create function private.company_payment_guard() returns trigger
language plpgsql security definer set search_path='' as $$
declare app public.campaign_applications%rowtype;
begin
  select * into app from public.campaign_applications where id=new.application_id;
  if app.id is null or new.company_id is distinct from private.campaign_company(app.campaign_id) then
    raise exception 'Payment must belong to the collaboration company';
  end if;
  if app.status not in ('accepted','completed') then raise exception 'An accepted collaboration is required'; end if;
  if TG_OP='UPDATE' then
    if old.status='paid' then raise exception 'Paid records cannot be edited'; end if;
    if new.application_id is distinct from old.application_id or new.company_id is distinct from old.company_id or new.amount is distinct from old.amount or new.id is distinct from old.id or new.created_at is distinct from old.created_at then
      raise exception 'Payment ownership and amount cannot change';
    end if;
  end if;
  new.invoice_url:=nullif(trim(new.invoice_url),'');
  if new.invoice_url is not null and new.invoice_url !~ '^https://' then raise exception 'Use a secure invoice URL'; end if;
  new.reference:=nullif(trim(new.reference),'');
  if new.status='paid' then
    if new.reference is null then raise exception 'An external payment reference is required'; end if;
    new.paid_at:=now();
  else new.paid_at:=null;
  end if;
  return new;
end $$;
create trigger company_payment_guard before insert or update on public.company_payments
for each row execute function private.company_payment_guard();
revoke all on function private.company_payment_guard() from public,anon,authenticated;

revoke update on public.company_payments from authenticated;
grant update(status,reference,invoice_url) on public.company_payments to authenticated;

create function private.company_payment_activity() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.company_activity(company_id,campaign_id,message)
  select new.company_id,a.campaign_id,
    case when new.status='paid' then 'External payment recorded: INR ' else 'Pending payment recorded: INR ' end || new.amount::text
  from public.campaign_applications a where a.id=new.application_id;
  return new;
end $$;
create trigger company_payment_activity after insert or update on public.company_payments
for each row execute function private.company_payment_activity();
revoke all on function private.company_payment_activity() from public,anon,authenticated;

create or replace function public.review_campaign_content(content_id uuid,decision text,note text default null)
returns void language plpgsql security definer set search_path='' as $$
declare item public.campaign_content%rowtype;
begin
  select * into item from public.campaign_content where id=content_id for update;
  if item.id is null or not private.company_manage(private.application_company(item.application_id)) then raise exception 'Content access denied'; end if;
  if item.status='published' then raise exception 'Published content cannot be moved back into review'; end if;
  if decision is null or decision not in ('approved','revision') then raise exception 'Invalid content decision'; end if;
  if decision='revision' and nullif(trim(note),'') is null then raise exception 'Describe the requested changes'; end if;
  update public.campaign_content set status=decision,review_note=note where id=content_id;
  update public.campaign_applications set lifecycle=decision where id=item.application_id;
end $$;
