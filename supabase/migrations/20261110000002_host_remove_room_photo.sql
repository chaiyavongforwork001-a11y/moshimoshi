-- moshimoshi · room hosts (พี่โมชิ) can take down photos in their own room
-- (runs after 20261110000001_room_admin_photos_open_age.sql; re-runnable)
--
-- public.remove_room_photo(message): staff, or a host of the photo's room, turn a photo line into a
-- notice ("[รูปนี้ถูกลบโดยพี่โมชิ]" / "[รูปนี้ถูกลบโดยทีมงาน]") and get back the file's path. The app
-- then removes the file: room-images files may now also be deleted by a host of that room.
-- Only photo lines: hosts can't edit or remove text lines (reports still go to staff).

-- I'm a host of this room
create or replace function private.is_room_host(p_room text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.room_members
    where room_id = p_room and user_id = (select auth.uid()) and role = 'host'
  );
$$;
revoke all on function private.is_room_host(text) from public, anon;
grant execute on function private.is_room_host(text) to authenticated, service_role;

create or replace function public.remove_room_photo(p_message uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room text;
  v_path text;
  v_admin boolean := public.is_admin();
begin
  select room_id, body into v_room, v_path
  from public.room_messages
  where id = p_message and kind = 'image';
  if v_room is null then
    raise exception 'message_not_found';
  end if;
  if not (v_admin or private.is_room_host(v_room)) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.room_messages
  set body = case when v_admin then '[รูปนี้ถูกลบโดยทีมงาน]' else '[รูปนี้ถูกลบโดยพี่โมชิ]' end,
      kind = 'system'
  where id = p_message;
  delete from public.room_message_sames where message_id = p_message;
  return v_path;
end;
$$;
revoke all on function public.remove_room_photo(uuid) from public, anon;
grant execute on function public.remove_room_photo(uuid) to authenticated, service_role;

-- the file: its uploader, staff, or a host of the room it was posted in
drop policy if exists room_images_delete on storage.objects;
create policy room_images_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'room-images'
    and (
      owner_id = (select auth.uid())::text
      or public.is_admin()
      or private.is_room_host((storage.foldername(name))[2])
    )
  );

notify pgrst, 'reload schema';
