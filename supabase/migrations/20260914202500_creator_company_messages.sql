drop policy company_messages_send on public.campaign_messages;
create policy company_messages_send on public.campaign_messages for insert to authenticated
with check(sender_id=auth.uid() and application_id is not null and exists(
 select 1 from public.campaign_applications a where a.id=campaign_messages.application_id and a.campaign_id=campaign_messages.campaign_id
 and ((private.company_manage(private.campaign_company(a.campaign_id)) and recipient_id=a.creator_id)
 or (a.creator_id=auth.uid() and recipient_id=public.creator_campaign_contact(a.campaign_id)))));
