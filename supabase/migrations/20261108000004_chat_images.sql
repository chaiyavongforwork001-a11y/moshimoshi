-- moshimoshi · photos in 1:1 chats, once both people say yes (บันไดความไว้ใจ ขั้น 2)
--
-- Each person turns on chat_members.consent_media for themselves (already in the schema, and
-- only they can change their own row). Photos unlock while BOTH are on, the chat is active and
-- nobody blocked the other; either one switching off locks new photos again.
--
-- Photos live in a private storage bucket, one folder per chat:
--   chat-images/<chat id>/<random uuid>-<width>x<height>.jpg
-- The app shrinks every photo to at most 1600px and re-encodes it as JPEG before upload, which
-- also drops EXIF data such as GPS location. Only the two people in the chat (and admins, for
-- reports) can open a photo; only its sender (or an admin) can delete it. A photo message is a
-- chat_messages row of kind 'image' whose body is that path.
--
-- Errors are raised with a short key as the message: image_rate_limited.
-- Re-runnable.

-- ------------------------------------------------------------------ helpers
-- the chat a photo path belongs to (null for anything that isn't a well-formed photo path)
create or replace function private.chat_image_chat(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when p_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[1-9][0-9]{0,3}x[1-9][0-9]{0,3}\.jpg$'
    then split_part(p_name, '/', 1)::uuid
  end;
$$;

-- photos are unlocked: I can post in this chat (member, active, no block) and both people said yes
create or replace function private.chat_media_unlocked(p_chat uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_post_in_chat(p_chat)
    and not exists (
      select 1 from public.chat_members m
      where m.chat_id = p_chat and not m.consent_media
    );
$$;

revoke all on function private.chat_image_chat(text), private.chat_media_unlocked(uuid) from public, anon;
grant execute on function private.chat_image_chat(text), private.chat_media_unlocked(uuid) to authenticated, service_role;

-- ------------------------------------------------------------------ photo messages
alter table public.chat_messages drop constraint if exists chat_messages_kind_check;
alter table public.chat_messages
  add constraint chat_messages_kind_check check (kind in ('text', 'system', 'welcome', 'image'));

-- a photo message points at a photo in its own chat's folder
alter table public.chat_messages drop constraint if exists chat_messages_image_path_check;
alter table public.chat_messages
  add constraint chat_messages_image_path_check check (kind <> 'image' or private.chat_image_chat(body) = chat_id);

drop policy if exists chat_messages_insert on public.chat_messages;
create policy chat_messages_insert on public.chat_messages for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and private.can_post_in_chat(chat_id)
    and (kind = 'text' or (kind = 'image' and private.chat_media_unlocked(chat_id)))
  );

-- at most 30 photos an hour per person
create or replace function private.chat_images_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind = 'image' and (
    select count(*) from public.chat_messages
    where user_id = new.user_id and kind = 'image' and created_at > now() - interval '1 hour'
  ) >= 30 then
    raise exception 'image_rate_limited';
  end if;
  return new;
end;
$$;

revoke all on function private.chat_images_rate() from public, anon, authenticated;

create or replace trigger chat_messages_image_rate
  before insert on public.chat_messages
  for each row execute function private.chat_images_rate();

-- ------------------------------------------------------------------ storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat-images', 'chat-images', false, 1572864, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- open: the two people in the chat, and admins (reported photos)
drop policy if exists chat_images_select on storage.objects;
create policy chat_images_select on storage.objects for select to authenticated
  using (
    bucket_id = 'chat-images'
    and (private.is_chat_member(private.chat_image_chat(name)) or (select public.is_admin()))
  );

-- upload: a well-formed path in a chat where photos are unlocked, not while suspended
drop policy if exists chat_images_insert on storage.objects;
create policy chat_images_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-images'
    and private.chat_media_unlocked(private.chat_image_chat(name))
    and not (select private.is_suspended((select auth.uid())))
  );

-- delete: the sender (unsend), or an admin removing a reported photo
drop policy if exists chat_images_delete on storage.objects;
create policy chat_images_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'chat-images'
    and (owner_id = (select auth.uid())::text or (select public.is_admin()))
  );

-- ------------------------------------------------------------------ admin
-- a reported photo comes down: the message turns into a staff notice (like room messages), and
-- the caller gets the file path back to delete the file through the Storage API (deleting
-- storage rows directly is blocked)
create or replace function public.admin_remove_chat_image(p_message uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_path text;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  select body into v_path
  from public.chat_messages
  where id = p_message and kind = 'image'
  for update;
  if not found then
    raise exception 'message_not_found';
  end if;

  update public.chat_messages
  set body = '[ข้อความนี้ถูกลบโดยทีมงาน]', kind = 'system'
  where id = p_message;
  delete from public.chat_message_sames where message_id = p_message;
  return v_path;
end;
$$;

revoke all on function public.admin_remove_chat_image(uuid) from public, anon;
grant execute on function public.admin_remove_chat_image(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';
