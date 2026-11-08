-- moshimoshi · room chat is for the room's members, and a list of the people I blocked
-- (runs after 20261108000005_chat_images_hardening.sql)
--
-- 1) Posting a line in a room's chat now needs a room_members row for me in that room: join first,
--    then chat, and leaving stops it again. Before, anyone signed in could post in any room, joined
--    or not. Lines the database writes itself still go in: post_room_welcome (the welcome card when
--    an onboarded person first lands in a room) is security definer and inserts as the table owner,
--    which row-level security doesn't apply to, and a staff removal (admin_delete_room_message) is an
--    update. The restrictive room_messages_not_suspended policy from 20261025000002_admin.sql still
--    applies on top, so a suspended member can't post either. Reading room chat stays open to
--    everyone signed in, as before.
-- 2) public.my_blocked_people(): the people I blocked, newest first, with the name and mochi look the
--    app's list shows (Me → ตั้งค่า → คนที่บล็อกไว้), so I can find them again and unblock. I can't
--    read their profiles myself (profiles_select hides people in a block relation with me, both
--    ways), so it's security definer. It takes no arguments and only reads blocks rows where I'm the
--    blocker, so it can't tell anyone who blocked them, or who blocked whom. Unblocking stays a plain
--    delete on public.blocks (blocks_delete: my own rows only).
--
-- Not covered:
-- - Someone who blocked me hides their profile from me, but if I block them back, this list shows
--   their current name and look. Leaving them out (or their name) would tell me that they blocked
--   me. Their name as it was when they joined a room is in that room's welcome card anyway, which
--   everyone signed in can read.
--
-- No new error keys: a room line from someone who isn't in the room gets the plain row-level
-- security "no" (new row violates row-level security policy for table "room_messages"). A suspended
-- member's names room_messages_not_suspended, but a suspended non-member gets the plain one too, as
-- the member rule is checked first, so the app asks the server (my_suspended_until, room_members)
-- which it was rather than reading the text.
-- Re-runnable. Run this file again after any re-run of 20261025000001_init.sql, which writes the old
-- room_messages_insert policy back.

-- ------------------------------------------------------------------ room chat: members only
-- I'm in this room. Like is_chat_member, it only answers about the caller.
create or replace function private.is_room_member(p_room text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.room_members
    where room_id = p_room and user_id = (select auth.uid())
  );
$$;

-- policies call it as the signed-in user
revoke all on function private.is_room_member(text) from public, anon;
grant execute on function private.is_room_member(text) to authenticated, service_role;

-- my own text lines, in a room I'm in (welcome cards come from the database, see above)
drop policy if exists room_messages_insert on public.room_messages;
create policy room_messages_insert on public.room_messages for insert to authenticated
  with check (user_id = (select auth.uid()) and kind = 'text' and private.is_room_member(room_id));

-- ------------------------------------------------------------------ the people I blocked
create or replace function public.my_blocked_people()
returns table (user_id uuid, name text, color text, face text, accessory text, blocked_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select b.blocked, p.name, p.color, p.face, p.accessory, b.created_at
  from public.blocks b
  join public.profiles p on p.id = b.blocked
  where b.blocker = (select auth.uid())
  order by b.created_at desc, b.blocked;
$$;

-- signed-in people only (new functions in public are open to everyone, anon included, until revoked)
revoke all on function public.my_blocked_people() from public, anon;
grant execute on function public.my_blocked_people() to authenticated, service_role;

notify pgrst, 'reload schema';
