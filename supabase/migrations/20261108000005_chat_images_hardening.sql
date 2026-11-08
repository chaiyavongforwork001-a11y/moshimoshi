-- moshimoshi · chat photos, tightened (runs after 20261108000004_chat_images.sql)
--
-- 0004 already ran on production, so the fixes from its review come here instead:
--
-- 1) Opening a photo (the storage select policy, which also decides list, signed links, download
--    and which rows remove() can reach): the person who uploaded it, always; the other person in
--    the chat only while a photo message still points at the file and neither of them has blocked
--    the other; admins only for photos that are in a report (reports.message_body keeps the path).
--    Before, any member could open every file in the chat folder (unsent ones, and after a block
--    too) and admins could open every photo in every chat.
-- 2) Deleting a file: its uploader, and admins for reported photos, but nobody while an open
--    report about that photo targets them, admins included (remove() then returns an empty list
--    without an error and the file stays for the team). Before, a sender could wipe the evidence
--    right after a report, and an admin could wipe the evidence about their own photo. A signed
--    upload URL can still overwrite a held file (see "Not covered" below).
-- 3) Uploading: the 0004 rules (both said yes, active chat, no block, not suspended) plus caps. A
--    new file goes in while fewer than 40 of my files from the last hour, and fewer than 200 from
--    the last day, are still stored (Storage answers 403 past them; a file I delete stops counting).
--    The 30-an-hour limit only ever counted messages, so files that were uploaded and never posted
--    had no limit at all. And nothing goes into a path that a photo message or a report still
--    points at. Such a file can go missing (the app cleans up after a send whose message landed but
--    whose answer got lost, or the owner deletes it), and then its sender could swap in other bytes,
--    or the other person could put their own photo in the sender's bubble and report it. A normal
--    send always uploads to a fresh random path. Tokens made in advance skip all of this (see "Not
--    covered" below).
-- 4) A photo message must point at a file its sender already uploaded and that no report points
--    at, and one file backs at most one message: a reported photo can't come back after an unsend,
--    and a photo staff took down can't be posted again if deleting its file failed. The path check
--    now fails for a body that isn't a well-formed photo path (a null result used to count as a
--    pass), and a text message can't be a photo path (so reporting a text can't stand in for a
--    photo report; rows already there aren't checked).
-- 5) At most 30 photo messages an hour per person, now counted from an insert-only log under a
--    per-person lock: unsending no longer frees a slot, and parallel inserts can't all slip under.
-- 6) A block switches consent_media off for both people in every chat they share, so after an
--    unblock photos need a fresh yes from both. Blocks made before this file ran get the same
--    switch-off once, here.
-- 7) admin_list_reports: a chat photo that staff turned into a notice reads as removed (it looked
--    live again after a reload).
-- 8) admin_remove_chat_image: nobody takes down their own photo from the reports console (own_report,
--    like admin_resolve_report); another admin can.
--
-- Not covered:
-- - A signed upload URL (createSignedUploadUrl) is checked once, when it's made, and its upload
--   runs as the service role with no row-level security, for up to 2 hours. So a token made while
--   a path was still free can later replace the bytes there (with upsert) even once the photo is
--   posted or held, or fill the path again after its file was deleted, and tokens made in advance
--   skip the upload caps. Storage builds without supabase/storage PR #1392 also check a plain
--   upload only before its bytes arrive and finish it as the service role, so a second upload
--   started while the path was still empty can do the same. Both only reach paths picked before
--   anything was posted there, so in practice a sender's own photos (the other person can't know
--   a path that early), and the app itself only uses upload() with upsert off. Closing it needs a
--   trigger on storage.objects or uploads through an Edge Function: docs/backend-setup.md §7.
-- - A signed download link is checked when it's made, and the caller picks how long it lasts. A
--   link already handed out keeps working after an unsend or a block until it expires or the file
--   is deleted.
--
-- Errors are raised with a short key as the message: image_rate_limited, own_report.
-- Run this file again after any re-run of 0004: 0004 writes its looser policies, path check, rate
-- function and admin_remove_chat_image back.
-- Re-runnable. The SQL editor runs the whole file as one transaction: if the unique index or the
-- path check stops on rows already in chat_messages, nothing changes. Before running, these
-- read-only checks should all come back empty (the last three read storage.objects, so first make
-- sure the editor's role bypasses row-level security: select rolbypassrls from pg_roles where
-- rolname = current_user; must say true, or they come back empty without an error):
--   select body, count(*) from public.chat_messages where kind = 'image' group by body having count(*) > 1;
--   select id, chat_id, body from public.chat_messages where kind = 'image' and private.chat_image_chat(body) is distinct from chat_id;
--   -- photo messages pointing at someone else's file (0004 didn't check the owner): delete them
--   select m.id, m.chat_id, m.user_id, o.owner_id from public.chat_messages m join storage.objects o on o.bucket_id = 'chat-images' and o.name = m.body where m.kind = 'image' and o.owner_id is distinct from m.user_id::text;
--   -- other policies on storage.objects: each one must be pinned to another bucket, because
--   -- permissive policies add up and one without a bucket filter would widen the rules below
--   select policyname, permissive, roles, cmd, qual, with_check from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname not in ('chat_images_select', 'chat_images_insert', 'chat_images_delete');
-- Keep object versioning off for the chat-images bucket: archived versions and delete markers would
-- count toward the caps and satisfy the photo-message file check.

-- ------------------------------------------------------------------ helpers
-- Like is_chat_member, each of these only answers about the caller: their own chats, reports
-- that target them, or (admins) reports.

-- a photo message (kind 'image') still points at this file, and the file's chat is one of mine
create or replace function private.chat_image_posted(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_chat_member(private.chat_image_chat(p_name))
    and exists (
      select 1 from public.chat_messages m
      where m.kind = 'image'
        and m.body = p_name
        and m.chat_id = private.chat_image_chat(p_name)
    );
$$;

-- a report of any status kept this path as its message copy (reports_before_write copies the
-- reported message's body, and a photo message's body is its path). Answers for admins, who read
-- reports anyway, and for the two people in the photo's chat, where the upload policy uses it so
-- a reported path can't be filled again. A refused upload is all it can tell them, and only about
-- a photo of their own chat that is no longer posted (an open report about it, the hold below
-- shows its uploader anyway).
create or replace function private.chat_image_in_report(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (public.is_admin() or private.is_chat_member(private.chat_image_chat(p_name)))
    and exists (select 1 from public.reports r where r.message_body = p_name);
$$;

-- an open report about this photo targets me, so the file stays for the team. target_user is the
-- message's author, set by the server: nobody can hold someone else's file by reporting a text
-- message that happens to contain its path. Only answers about photo paths.
create or replace function private.chat_image_held(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.chat_image_chat(p_name) is not null
    and exists (
      select 1 from public.reports r
      where r.target_user = (select auth.uid())
        and r.status = 'open'
        and r.message_body = p_name
    );
$$;

-- I'm in this chat and neither of us has blocked the other (is_blocked checks both directions).
-- Only answers for the caller, so it can't tell anyone who blocked whom in other chats.
create or replace function private.can_view_chat_media(p_chat uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.chat_members mine
    join public.chat_members other on other.chat_id = mine.chat_id and other.user_id <> mine.user_id
    where mine.chat_id = p_chat
      and mine.user_id = (select auth.uid())
      and not private.is_blocked(mine.user_id, other.user_id)
  );
$$;

-- How many of my photos from the window are still stored. Runs with the caller's rights on
-- purpose, so the count never depends on how postgres relates to the storage role (a definer
-- count would only work while postgres bypasses RLS or inherits authenticated). With caller
-- rights I always see my own files, through the owner branch of chat_images_select. It's a
-- function rather than a subquery in the upload policy because a storage.objects policy that
-- reads storage.objects directly trips Postgres's policy recursion check.
create or replace function private.my_chat_image_uploads(p_since interval)
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)::integer
  from storage.objects o
  where o.bucket_id = 'chat-images'
    and o.owner_id = (select auth.uid())::text
    and o.created_at > now() - p_since;
$$;

-- policies call these as the signed-in user
revoke all on function
  private.chat_image_posted(text),
  private.chat_image_in_report(text),
  private.chat_image_held(text),
  private.can_view_chat_media(uuid),
  private.my_chat_image_uploads(interval)
from public, anon;
grant execute on function
  private.chat_image_posted(text),
  private.chat_image_in_report(text),
  private.chat_image_held(text),
  private.can_view_chat_media(uuid),
  private.my_chat_image_uploads(interval)
to authenticated, service_role;

-- ------------------------------------------------------------------ photo messages
-- one file backs at most one message, so an admin removing one photo can't break another. Also
-- the lookup behind chat_image_posted. Only image rows are indexed, and their bodies are short.
create unique index if not exists chat_messages_image_body_key
  on public.chat_messages (body) where kind = 'image';

-- a photo message points at a well-formed photo path in its own chat's folder. A body that isn't
-- a path makes chat_image_chat return null, which now fails instead of passing.
alter table public.chat_messages drop constraint if exists chat_messages_image_path_check;
alter table public.chat_messages
  add constraint chat_messages_image_path_check
  check (kind <> 'image' or coalesce(private.chat_image_chat(body) = chat_id, false));

-- only a photo message's body is a photo path, so a report on any other message never reaches a
-- file. NOT VALID: rows already there aren't checked (new rows and updates are).
alter table public.chat_messages drop constraint if exists chat_messages_text_not_photo_path;
alter table public.chat_messages
  add constraint chat_messages_text_not_photo_path
  check (kind = 'image' or private.chat_image_chat(body) is null) not valid;

-- text as before. A photo also needs photos unlocked, no report pointing at its path (a reported
-- photo can't come back after an unsend, nor a staff takedown whose file delete failed), and its
-- file already uploaded by me (checked with my own rights: I always see my own files).
drop policy if exists chat_messages_insert on public.chat_messages;
create policy chat_messages_insert on public.chat_messages for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and private.can_post_in_chat(chat_id)
    and (
      kind = 'text'
      or (
        kind = 'image'
        and private.chat_media_unlocked(chat_id)
        and not private.chat_image_in_report(chat_messages.body)
        and exists (
          select 1 from storage.objects o
          where o.bucket_id = 'chat-images'
            and o.name = chat_messages.body
            and o.owner_id = (select auth.uid())::text
        )
      )
    )
  );

-- ------------------------------------------------------------------ photo message limit
-- one row per photo message sent. Unsending doesn't touch it, and a refused insert rolls its row
-- back. The trigger below prunes rows older than an hour, so no scheduled job is needed.
create table if not exists private.chat_image_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists chat_image_log_user_created_idx on private.chat_image_log (user_id, created_at);

alter table private.chat_image_log enable row level security; -- no policies: internal only
revoke all on table private.chat_image_log from public, anon, authenticated;
grant all on table private.chat_image_log to service_role;

-- at most 30 photo messages an hour per person
create or replace function private.chat_images_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- only my own photo messages count: one in someone else's name fails the insert policy anyway,
  -- and this runs first, so it mustn't tell me how many photos they sent
  if new.kind = 'image' and new.user_id = (select auth.uid()) then
    -- one person's photo messages go in one at a time (same pattern as intents / prompt_sames)
    perform pg_advisory_xact_lock(hashtextextended('chat_images:' || new.user_id::text, 0));
    delete from private.chat_image_log
    where user_id = new.user_id and created_at <= now() - interval '1 hour';
    if (select count(*) from private.chat_image_log where user_id = new.user_id) >= 30 then
      raise exception 'image_rate_limited';
    end if;
    insert into private.chat_image_log (user_id) values (new.user_id);
  end if;
  return new;
end;
$$;

revoke all on function private.chat_images_rate() from public, anon, authenticated;

create or replace trigger chat_messages_image_rate
  before insert on public.chat_messages
  for each row execute function private.chat_images_rate();

-- ------------------------------------------------------------------ storage
-- open (this also decides list, signed links, download and which rows remove() can reach):
-- the uploader always; the other person in the chat while a photo message still points at the
-- file and nobody blocked anybody; admins for photos that are in a report
drop policy if exists chat_images_select on storage.objects;
create policy chat_images_select on storage.objects for select to authenticated
  using (
    bucket_id = 'chat-images'
    and (
      owner_id = (select auth.uid())::text
      or (private.can_view_chat_media(private.chat_image_chat(name)) and private.chat_image_posted(name))
      or ((select public.is_admin()) and private.chat_image_in_report(name))
    )
  );

-- upload: a well-formed path in a chat where photos are unlocked, not while suspended, not into a
-- path that a photo message or a report still points at (a file gone missing under a posted
-- photo can't be filled again, by its sender or by the other person; a normal send always uses a
-- fresh random path), and while fewer than 40 of my files from the last hour and 200 from the
-- last day are still stored. A soft cap: uploads checked at the same moment can each pass, and a
-- signed upload URL is checked once, when it's made (its upload runs as the service role).
drop policy if exists chat_images_insert on storage.objects;
create policy chat_images_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-images'
    and private.chat_media_unlocked(private.chat_image_chat(name))
    and not (select private.is_suspended((select auth.uid())))
    and not private.chat_image_posted(name)
    and not private.chat_image_in_report(name)
    and (select private.my_chat_image_uploads(interval '1 hour')) < 40
    and (select private.my_chat_image_uploads(interval '1 day')) < 200
  );

-- delete: the uploader (unsend) or an admin for a reported photo, but nobody while an open report
-- about the photo targets them: remove() then quietly skips the file and it stays for the team.
-- That binds admins too, like own_report in admin_resolve_report: nobody clears the evidence
-- about themselves, and the other admins still can.
drop policy if exists chat_images_delete on storage.objects;
create policy chat_images_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'chat-images'
    and not private.chat_image_held(name)
    and (
      owner_id = (select auth.uid())::text
      or ((select public.is_admin()) and private.chat_image_in_report(name))
    )
  );

-- ------------------------------------------------------------------ blocks
-- a block switches photos off for both people in every chat they share, so after an unblock
-- both have to say yes again
create or replace function private.blocks_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.chat_members m
  set consent_media = false
  where m.consent_media
    and m.user_id in (new.blocker, new.blocked)
    and m.chat_id in (
      select a.chat_id
      from public.chat_members a
      join public.chat_members b on b.chat_id = a.chat_id and b.user_id = new.blocked
      where a.user_id = new.blocker
    );
  return null;
end;
$$;

revoke all on function private.blocks_after_insert() from public, anon, authenticated;

create or replace trigger blocks_after_insert
  after insert on public.blocks
  for each row execute function private.blocks_after_insert();

-- blocks made before this file ran: the trigger only sees new ones (and blocking again changes
-- nothing, the app's insert skips an existing row), so switch photos off now in every chat where
-- the two people are blocked. Re-runnable: only rows still on change.
update public.chat_members m
set consent_media = false
where m.consent_media
  and exists (
    select 1 from public.chat_members o
    where o.chat_id = m.chat_id
      and o.user_id <> m.user_id
      and private.is_blocked(m.user_id, o.user_id)
  );

-- ------------------------------------------------------------------ admin: take down a photo
-- Same as 0004 plus own_report: like admin_resolve_report, nobody acts on a report about
-- themselves, so an admin can't take down their own photo here (another admin can). The message's
-- author is the report's target (reports_before_write sets it). Same signature, so create or
-- replace keeps the grants.
create or replace function public.admin_remove_chat_image(p_message uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_path text;
  v_author uuid;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  select body, user_id into v_path, v_author
  from public.chat_messages
  where id = p_message and kind = 'image'
  for update;
  if not found then
    raise exception 'message_not_found';
  end if;
  if v_author = (select auth.uid()) then
    raise exception 'own_report';
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

-- ------------------------------------------------------------------ admin
-- Same as 20261025000002_admin.sql except message_removed: admin_remove_chat_image keeps the row
-- as a staff notice, so a chat message counts as removed the way a room message does. Same
-- signature, defaults and columns, so create or replace keeps the grants and the generated types.
create or replace function public.admin_list_reports(p_status text default 'open', p_limit integer default 50)
returns table (
  id uuid,
  created_at timestamptz,
  status text,
  reason text,
  details text,
  reporter uuid,
  reporter_name text,
  target_user uuid,
  target_name text,
  target_color text,
  target_suspended_until timestamptz,
  prior_reports integer,
  room_message_id uuid,
  chat_message_id uuid,
  room_id text,
  message_body text,
  message_context text,
  message_removed boolean,
  resolved_by uuid,
  resolver_name text,
  resolved_at timestamptz,
  resolution_note text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_status text := coalesce(nullif(btrim(p_status), ''), 'all');
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if v_status not in ('open', 'resolved', 'dismissed', 'all') then
    raise exception 'invalid_status';
  end if;

  return query
  select
    r.id,
    r.created_at,
    r.status,
    r.reason,
    r.details,
    r.reporter,
    rp.name,
    r.target_user,
    tp.name,
    tp.color,
    private.suspended_until(r.target_user),
    pr.n,
    r.room_message_id,
    r.chat_message_id,
    rm.room_id,
    coalesce(r.message_body, rm.body, cm.body),
    coalesce(
      r.message_context,
      ro.name,
      case when r.chat_message_id is not null then 'แชทส่วนตัว' end
    ),
    coalesce(case
      -- users can only post 'text' (and 'image' in chats): a 'system' line with an author is a staff removal
      when r.room_message_id is not null then rm.kind = 'system' and rm.user_id is not null
      when r.chat_message_id is not null then cm.kind = 'system' and cm.user_id is not null
      else r.message_body is not null -- the author deleted it
    end, false),
    r.resolved_by,
    rb.name,
    r.resolved_at,
    r.resolution_note
  from public.reports r
  left join public.profiles rp on rp.id = r.reporter
  left join public.profiles tp on tp.id = r.target_user
  left join public.profiles rb on rb.id = r.resolved_by
  left join public.room_messages rm on rm.id = r.room_message_id
  left join public.rooms ro on ro.id = rm.room_id
  left join public.chat_messages cm on cm.id = r.chat_message_id
  -- earlier reports, leaving out the ones the team found didn't break the rules
  left join lateral (
    select count(*)::integer as n
    from public.reports p
    where p.target_user = r.target_user and p.created_at < r.created_at and p.status <> 'dismissed'
  ) pr on true
  where v_status = 'all' or r.status = v_status
  -- the open queue starts with whoever has waited longest; the other tabs newest first
  order by case when v_status = 'open' then r.created_at end asc, r.created_at desc
  limit v_limit;
end;
$$;

revoke all on function public.admin_list_reports(text, integer) from public, anon;
grant execute on function public.admin_list_reports(text, integer) to authenticated, service_role;

notify pgrst, 'reload schema';
