-- moshimoshi · staff manage rooms, photos in rooms by permission, and no age limit
-- (runs after 20261108000006_rooms_and_blocks.sql; re-runnable as a whole in the SQL Editor)
--
-- 1) Rooms: staff (public.is_admin()) create, edit and delete rooms from /admin → ห้อง. The lobby
--    (is_lobby) can't be deleted: new people land there. Deleting a room deletes its members,
--    messages, likes and sessions (on delete cascade); reports keep their text (room_message_id is
--    set null). Photo files of a deleted room stay in the room-images bucket until removed through
--    the Storage API.
-- 2) Photos in rooms: a member may post a photo when they are the room's host, or a host/staff has
--    switched on room_members.can_post_images for them, or they are staff. Files go to the private
--    room-images bucket at r/<room id>/<uuid>-<w>x<h>.jpg (JPEG, at most 1.5 MB); a photo message is
--    a room_messages row of kind 'image' whose body is that path, and it needs my own uploaded file.
--    At most 30 photos per hour per person in rooms. Everyone signed in can see room photos, like
--    room chat itself. Joining a room always starts as a plain member without photo rights (leaving
--    and joining again resets them).
--    public.set_room_member_perms(room, user, images, host): hosts of that room and staff switch
--    photo rights; only staff can make or unmake hosts.
-- 3) No age limit: profiles no longer need a birth year to finish onboarding, and no birth year is
--    refused. The app stops asking for it. Existing birth years stay stored until you run the
--    optional clean-up at the end of this file.

-- ------------------------------------------------------------------ 1) staff manage rooms
grant insert, update, delete on public.rooms to authenticated;

drop policy if exists rooms_admin_insert on public.rooms;
create policy rooms_admin_insert on public.rooms for insert to authenticated
  with check (public.is_admin());
drop policy if exists rooms_admin_update on public.rooms;
create policy rooms_admin_update on public.rooms for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists rooms_admin_delete on public.rooms;
create policy rooms_admin_delete on public.rooms for delete to authenticated
  using (public.is_admin() and not is_lobby);

-- ------------------------------------------------------------------ 2) photos in rooms
alter table public.room_members add column if not exists can_post_images boolean not null default false;

-- joining stays "myself, as a plain member, without photo rights"
drop policy if exists room_members_insert on public.room_members;
create policy room_members_insert on public.room_members for insert to authenticated
  with check (user_id = (select auth.uid()) and role = 'member' and not can_post_images);

-- I'm in this room and may post photos in it
create or replace function private.can_post_room_image(p_room text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.room_members m
    where m.room_id = p_room and m.user_id = (select auth.uid())
      and (m.role = 'host' or m.can_post_images or public.is_admin())
  );
$$;
revoke all on function private.can_post_room_image(text) from public, anon;
grant execute on function private.can_post_room_image(text) to authenticated, service_role;

-- my own uploaded file for this room, at the right path, and under 30 photos in the last hour
create or replace function private.room_image_ok(p_room text, p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_path ~ ('^r/' || p_room || '/[0-9a-f-]{36}-[1-9][0-9]{0,3}x[1-9][0-9]{0,3}\.jpg$')
    and exists (
      select 1 from storage.objects o
      where o.bucket_id = 'room-images' and o.name = p_path and o.owner_id = (select auth.uid())::text
    )
    and not exists (select 1 from public.room_messages m where m.kind = 'image' and m.body = p_path)
    and (
      select count(*) from public.room_messages m
      where m.user_id = (select auth.uid()) and m.kind = 'image' and m.created_at > now() - interval '1 hour'
    ) < 30;
$$;
revoke all on function private.room_image_ok(text, text) from public, anon;
grant execute on function private.room_image_ok(text, text) to authenticated, service_role;

alter table public.room_messages drop constraint if exists room_messages_kind_check;
alter table public.room_messages add constraint room_messages_kind_check
  check (kind in ('text', 'welcome', 'system', 'image'));

drop policy if exists room_messages_insert on public.room_messages;
create policy room_messages_insert on public.room_messages for insert to authenticated
  with check (
    user_id = (select auth.uid()) and private.is_room_member(room_id)
    and (
      kind = 'text'
      or (kind = 'image' and private.can_post_room_image(room_id) and private.room_image_ok(room_id, body))
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('room-images', 'room-images', false, 1572864, array['image/jpeg'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- uploads made in the last hour (kept files), so nobody fills the bucket
create or replace function private.room_upload_quota_ok()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (
    select count(*) from storage.objects o
    where o.bucket_id = 'room-images' and o.owner_id = (select auth.uid())::text
      and o.created_at > now() - interval '1 hour'
  ) < 40;
$$;
revoke all on function private.room_upload_quota_ok() from public, anon;
grant execute on function private.room_upload_quota_ok() to authenticated, service_role;

drop policy if exists room_images_select on storage.objects;
create policy room_images_select on storage.objects for select to authenticated
  using (bucket_id = 'room-images');
drop policy if exists room_images_insert on storage.objects;
create policy room_images_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'room-images'
    and name ~ '^r/[a-z0-9-]{1,40}/[0-9a-f-]{36}-[1-9][0-9]{0,3}x[1-9][0-9]{0,3}\.jpg$'
    and private.can_post_room_image((storage.foldername(name))[2])
    and private.room_upload_quota_ok()
  );
drop policy if exists room_images_delete on storage.objects;
create policy room_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'room-images' and (owner_id = (select auth.uid())::text or public.is_admin()));

-- hosts of the room and staff switch photo rights; only staff make or unmake hosts
create or replace function public.set_room_member_perms(p_room text, p_user uuid, p_images boolean default null, p_host boolean default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin boolean := public.is_admin();
  v_host boolean;
begin
  select exists (
    select 1 from public.room_members
    where room_id = p_room and user_id = (select auth.uid()) and role = 'host'
  ) into v_host;
  if not (v_admin or v_host) or (p_host is not null and not v_admin) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.room_members
  set can_post_images = coalesce(p_images, can_post_images),
      role = case when p_host is null then role when p_host then 'host' else 'member' end
  where room_id = p_room and user_id = p_user;
  if not found then
    raise exception 'not_member';
  end if;
end;
$$;
revoke all on function public.set_room_member_perms(text, uuid, boolean, boolean) from public, anon;
grant execute on function public.set_room_member_perms(text, uuid, boolean, boolean) to authenticated, service_role;

-- ------------------------------------------------------------------ 3) no age limit
-- Same guard as 20261025000001_init.sql without the birth-year rules (too_young / age_required).
create or replace function private.profiles_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    -- last_seen_at is the server's clock: no faking "online", no skewed phone clocks
    if tg_op = 'INSERT' then
      new.is_host := false;
      new.created_at := now();
      new.last_seen_at := now();
    else
      new.id := old.id;
      new.is_host := old.is_host;
      new.created_at := old.created_at;
      if new.last_seen_at is distinct from old.last_seen_at then
        new.last_seen_at := now();
      end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

notify pgrst, 'reload schema';

-- ------------------------------------------------------------------ optional clean-up (run by hand)
-- The app no longer needs birth years. To delete the ones already stored (cannot be undone):
--   update public.profiles set onboarded = true where not onboarded and birth_year is not null;
--   update public.profiles set birth_year = null where birth_year is not null;
-- The first line keeps people who skipped the rest of onboarding (birth year saved) out of the
-- onboarding screen once their birth year is gone.
