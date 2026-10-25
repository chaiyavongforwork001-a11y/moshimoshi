-- moshimoshi · moderation & admin
-- Admins (private.app_admins), the report queue, suspensions and the admin RPCs.
-- Re-runnable: columns/indexes use IF NOT EXISTS, constraints are added once by name;
-- functions, triggers and policies are replaced.
-- Still no automatic message filtering (founder decision): people report, the team decides.

-- =================================================================
-- 1. Admins
-- =================================================================
-- who can moderate. No client grants: rows are added by hand (see the end of this file)
create table if not exists private.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table private.app_admins enable row level security; -- no policies: internal only
revoke all on table private.app_admins from public, anon, authenticated;
grant all on table private.app_admins to service_role;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.app_admins where user_id = (select auth.uid())
  );
$$;

-- =================================================================
-- 2. New columns and tables
-- =================================================================
-- reports: a queue with a status, plus the reported message (if any)
alter table public.reports add column if not exists status text not null default 'open';
alter table public.reports add column if not exists resolved_by uuid;
alter table public.reports add column if not exists resolved_at timestamptz;
alter table public.reports add column if not exists resolution_note text;
alter table public.reports add column if not exists room_message_id uuid;
alter table public.reports add column if not exists chat_message_id uuid;
-- copy of the message taken when it was reported, so deleting it doesn't erase the evidence
alter table public.reports add column if not exists message_body text;
alter table public.reports add column if not exists message_context text; -- room name or 'แชทส่วนตัว'

-- suspensions: one row per admin action (also lifts), the newest row is the current state.
-- Kept out of public.profiles, which every signed-in user reads in bulk, so who is suspended
-- and why stays with the team. Written only by admin_suspend_user.
create table if not exists private.suspensions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  until timestamptz, -- null = lifted
  reason text check (char_length(reason) <= 300),
  by_admin uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists suspensions_user_id_idx on private.suspensions (user_id, id desc);
create index if not exists suspensions_by_admin_idx on private.suspensions (by_admin);

alter table private.suspensions enable row level security; -- no policies: internal only
revoke all on table private.suspensions from public, anon, authenticated;
grant all on table private.suspensions to service_role;

-- an earlier draft of this file kept the suspension on public.profiles: carry it over, then drop it
drop trigger if exists profiles_guard_suspension on public.profiles;
do $$
begin
  if (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles'
        and column_name in ('suspended_until', 'suspension_reason')) = 2 then
    execute $q$
      insert into private.suspensions (user_id, until, reason)
      select id, suspended_until, left(suspension_reason, 300)
      from public.profiles
      where suspended_until > now()
    $q$;
  end if;
end;
$$;
alter table public.profiles drop column if exists suspended_until;
alter table public.profiles drop column if exists suspension_reason;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reports_status_check' and conrelid = 'public.reports'::regclass) then
    alter table public.reports add constraint reports_status_check
      check (status in ('open', 'resolved', 'dismissed'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reports_resolution_note_check' and conrelid = 'public.reports'::regclass) then
    alter table public.reports add constraint reports_resolution_note_check
      check (char_length(resolution_note) <= 2000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reports_one_message_check' and conrelid = 'public.reports'::regclass) then
    alter table public.reports add constraint reports_one_message_check
      check (room_message_id is null or chat_message_id is null);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reports_resolved_by_fkey' and conrelid = 'public.reports'::regclass) then
    alter table public.reports add constraint reports_resolved_by_fkey
      foreign key (resolved_by) references public.profiles (id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reports_room_message_id_fkey' and conrelid = 'public.reports'::regclass) then
    alter table public.reports add constraint reports_room_message_id_fkey
      foreign key (room_message_id) references public.room_messages (id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reports_chat_message_id_fkey' and conrelid = 'public.reports'::regclass) then
    alter table public.reports add constraint reports_chat_message_id_fkey
      foreign key (chat_message_id) references public.chat_messages (id) on delete set null;
  end if;
end;
$$;

create index if not exists reports_status_created_idx on public.reports (status, created_at desc);
create index if not exists reports_resolved_by_idx on public.reports (resolved_by);
create index if not exists reports_room_message_id_idx on public.reports (room_message_id);
create index if not exists reports_chat_message_id_idx on public.reports (chat_message_id);

-- =================================================================
-- 3. Suspension helper + guards
-- =================================================================
-- end of the person's current suspension; null when not suspended (the newest row wins)
create or replace function private.suspended_until(p_user uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select l.until
  from (
    select s.until from private.suspensions s
    where s.user_id = p_user
    order by s.id desc
    limit 1
  ) l
  where l.until > now();
$$;

create or replace function private.is_suspended(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.suspended_until(p_user) is not null;
$$;

-- my own suspension end, for the "พักอยู่ถึง…" line (the reason stays with the team)
create or replace function public.my_suspended_until()
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select private.suspended_until((select auth.uid()));
$$;

-- Suspended people can't rewrite what others see of them: the welcome card quotes the bio
-- or first prompt into rooms. Colour, face, settings and the last_seen_at heartbeat still save.
-- Runs as the caller on purpose (like profiles_before_write).
create or replace function private.profiles_guard_suspension()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated')
    and (new.name, new.bio, new.prompts, new.tags) is distinct from (old.name, old.bio, old.prompts, old.tags)
    and private.is_suspended(old.id)
    and not public.is_admin() then
    raise exception 'suspended';
  end if;
  return new;
end;
$$;

create or replace trigger profiles_guard_suspension
  before update on public.profiles
  for each row execute function private.profiles_guard_suspension();

-- Same as init, plus: no welcome card while suspended. It's security definer, so the room_messages
-- policy doesn't stop it. Checked before room_welcomes is marked, so the card still comes later.
create or replace function private.post_room_welcome(p_room text, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p record;
  who text;
  hook text;
begin
  select name, bio, prompts, onboarded into p from public.profiles where id = p_user;
  if not found or not p.onboarded or private.is_suspended(p_user) then
    return;
  end if;

  insert into private.room_welcomes (room_id, user_id) values (p_room, p_user)
  on conflict do nothing;
  if not found then
    return;
  end if;

  who := coalesce(nullif(btrim(p.name), ''), 'เพื่อนใหม่');
  hook := coalesce(nullif(btrim(p.prompts -> 0 ->> 'text'), ''), nullif(btrim(p.bio), ''));

  insert into public.room_messages (room_id, user_id, kind, body)
  values (
    p_room, p_user, 'welcome',
    'ยินดีต้อนรับ ' || who || ' (มาครั้งแรก) ' ||
    case
      when hook is null then 'มาทักทายกันหน่อยนะ'
      else who || 'บอกว่า "' || left(hook, 140) || '" ใครอยากทักทายบ้าง?'
    end
  );
end;
$$;

-- reports I filed in the last hour. Security definer: users can't select reports themselves.
create or replace function private.my_recent_reports()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.reports
  where reporter = (select auth.uid()) and created_at > now() - interval '1 hour';
$$;

-- send_moshi / respond_moshi run as the owner and skip RLS, so chats are guarded by trigger.
-- System lines (user_id null) still go through: a suspended person can answer a request.
create or replace function private.reject_suspended_chat_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_user uuid;
begin
  if tg_table_name = 'chats' then
    v_user := new.requested_by;
  else
    v_user := new.user_id;
  end if;
  if private.is_suspended(v_user) then
    raise exception 'suspended';
  end if;
  return new;
end;
$$;

create or replace trigger chats_reject_suspended
  before insert on public.chats
  for each row execute function private.reject_suspended_chat_write();

create or replace trigger chat_messages_reject_suspended
  before insert on public.chat_messages
  for each row execute function private.reject_suspended_chat_write();

-- reports: users file 'open' reports only; the message copy comes from the server.
-- Runs as the caller on purpose: RLS means a chat message can only be reported by
-- someone in that chat. Admin updates get who/when stamped here.
create or replace function private.reports_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_author uuid;
  v_body text;
  v_context text;
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if private.my_recent_reports() >= 20 then
      raise exception 'report_rate_limited';
    end if;
    new.status := 'open';
    new.resolved_by := null;
    new.resolved_at := null;
    new.resolution_note := null;
    new.message_body := null;
    new.message_context := null;

    if new.room_message_id is not null then
      select m.user_id, m.body, r.name into v_author, v_body, v_context
      from public.room_messages m
      join public.rooms r on r.id = m.room_id
      where m.id = new.room_message_id;
      if not found then
        raise exception 'message_not_found';
      end if;
    elsif new.chat_message_id is not null then
      select m.user_id, m.body, 'แชทส่วนตัว' into v_author, v_body, v_context
      from public.chat_messages m
      where m.id = new.chat_message_id;
      if not found then
        raise exception 'message_not_found';
      end if;
    end if;

    if v_body is not null then
      new.message_body := v_body;
      new.message_context := v_context;
      new.target_user := coalesce(v_author, new.target_user);
    end if;
  elsif new.status is distinct from old.status
    or new.resolution_note is distinct from old.resolution_note then
    new.resolved_by := case when new.status = 'open' then null else (select auth.uid()) end;
    new.resolved_at := case
      when new.status = 'open' then null
      when new.status is distinct from old.status or old.resolved_at is null then now()
      else old.resolved_at
    end;
  end if;
  return new;
end;
$$;

create or replace trigger reports_before_write
  before insert or update on public.reports
  for each row execute function private.reports_before_write();

-- =================================================================
-- 4. Row level security
-- =================================================================
-- admins read the queue and move its status (column grant below limits the update);
-- nobody closes a report about themselves
drop policy if exists reports_admin_select on public.reports;
create policy reports_admin_select on public.reports for select to authenticated
  using ((select public.is_admin()));
drop policy if exists reports_admin_update on public.reports;
create policy reports_admin_update on public.reports for update to authenticated
  using ((select public.is_admin()) and target_user is distinct from (select auth.uid()))
  with check ((select public.is_admin()) and target_user is distinct from (select auth.uid()));

-- an earlier draft let admins read every block; no screen needs the who-blocked-whom graph
drop policy if exists blocks_admin_select on public.blocks;

-- a profile goes away only with its auth user (on delete cascade). Deleting and re-inserting it
-- would wipe the blocks against the person, their welcome history and the target of reports about them.
drop policy if exists profiles_delete on public.profiles;
revoke delete on public.profiles from authenticated;

-- suspended people can read but not post
drop policy if exists room_messages_not_suspended on public.room_messages;
create policy room_messages_not_suspended on public.room_messages
  as restrictive for insert to authenticated
  with check (not (select private.is_suspended((select auth.uid()))));

drop policy if exists chat_messages_not_suspended on public.chat_messages;
create policy chat_messages_not_suspended on public.chat_messages
  as restrictive for insert to authenticated
  with check (not (select private.is_suspended((select auth.uid()))));

drop policy if exists intents_not_suspended on public.intents;
create policy intents_not_suspended on public.intents
  as restrictive for insert to authenticated
  with check (not (select private.is_suspended((select auth.uid()))));

-- editing a live post counts as posting; pausing / closing one is still fine
drop policy if exists intents_update_not_suspended on public.intents;
create policy intents_update_not_suspended on public.intents
  as restrictive for update to authenticated
  using (true)
  with check (status <> 'active' or not (select private.is_suspended((select auth.uid()))));

drop policy if exists daily_answers_not_suspended on public.daily_answers;
create policy daily_answers_not_suspended on public.daily_answers
  as restrictive for insert to authenticated
  with check (not (select private.is_suspended((select auth.uid()))));

drop policy if exists daily_answers_update_not_suspended on public.daily_answers;
create policy daily_answers_update_not_suspended on public.daily_answers
  as restrictive for update to authenticated
  using (true)
  with check (not (select private.is_suspended((select auth.uid()))));

-- =================================================================
-- 5. Admin RPCs (each checks public.is_admin() itself)
-- Errors are raised with a short key as the message:
--   not_admin, invalid_status, report_not_found, own_report, invalid_days, cannot_suspend_admin,
--   user_not_found, message_not_found
-- Users get: suspended (send_moshi / chat insert / profile edit),
--   message_not_found and report_rate_limited (report insert)
-- =================================================================
drop function if exists public.admin_list_reports(text, integer);
create function public.admin_list_reports(p_status text default 'open', p_limit integer default 50)
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
      -- users can only post 'text': a 'system' line with an author is a staff removal
      when r.room_message_id is not null then rm.kind = 'system' and rm.user_id is not null
      when r.chat_message_id is not null then false
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

create or replace function public.admin_resolve_report(p_report uuid, p_status text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('open', 'resolved', 'dismissed') then
    raise exception 'invalid_status';
  end if;
  if exists (select 1 from public.reports where id = p_report and target_user = (select auth.uid())) then
    raise exception 'own_report';
  end if;

  -- a null note keeps the old one; an empty note clears it
  update public.reports r
  set status = p_status,
      resolution_note = case
        when p_note is null then r.resolution_note
        else left(nullif(btrim(p_note), ''), 2000)
      end,
      resolved_by = case when p_status = 'open' then null else (select auth.uid()) end,
      resolved_at = case when p_status = 'open' then null else now() end
  where r.id = p_report;
  if not found then
    raise exception 'report_not_found';
  end if;
end;
$$;

-- p_days 0 lifts the suspension. Returns the new suspended_until (null when lifted).
-- Every call is logged in private.suspensions with the admin and the reason.
create or replace function public.admin_suspend_user(p_user uuid, p_days integer, p_reason text default null)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_until timestamptz;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if p_days is null or p_days not between 0 and 3650 then
    raise exception 'invalid_days';
  end if;
  -- lifting stays possible for someone suspended before they joined the team
  if p_days > 0 and exists (select 1 from private.app_admins a where a.user_id = p_user) then
    raise exception 'cannot_suspend_admin';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_user) then
    raise exception 'user_not_found';
  end if;

  v_until := case when p_days = 0 then null else now() + make_interval(days => p_days) end;
  insert into private.suspensions (user_id, until, reason, by_admin)
  values (p_user, v_until, left(nullif(btrim(p_reason), ''), 300), (select auth.uid()));

  -- their live "กำลังหา" posts stop being joinable; they can switch them back on afterwards
  if p_days > 0 then
    update public.intents set status = 'paused' where user_id = p_user and status = 'active';
  end if;
  return v_until;
end;
$$;

-- soft delete: the line stays in place (and in the report) as a staff notice
create or replace function public.admin_delete_room_message(p_message uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  update public.room_messages
  set body = '[ข้อความนี้ถูกลบโดยทีมงาน]', kind = 'system'
  where id = p_message;
  if not found then
    raise exception 'message_not_found';
  end if;
  delete from public.room_message_sames where message_id = p_message;
end;
$$;

-- one row: open reports, all profiles, profiles seen in 24h, text messages (rooms + chats) in 24h
drop function if exists public.admin_stats();
create function public.admin_stats()
returns table (open_reports integer, users integer, active_24h integer, messages_24h integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  return query
  select
    (select count(*)::integer from public.reports r where r.status = 'open'),
    (select count(*)::integer from public.profiles p),
    (select count(*)::integer from public.profiles p where p.last_seen_at > now() - interval '24 hours'),
    (
      (select count(*) from public.room_messages m
        where m.kind = 'text' and m.created_at > now() - interval '24 hours')
      + (select count(*) from public.chat_messages m
        where m.kind = 'text' and m.created_at > now() - interval '24 hours')
    )::integer;
end;
$$;

-- =================================================================
-- 6. Grants (RLS still applies on top of these)
-- =================================================================
grant select on public.reports to authenticated;
grant update (status, resolution_note) on public.reports to authenticated;

revoke all on function
  public.is_admin(),
  private.suspended_until(uuid),
  private.is_suspended(uuid),
  public.my_suspended_until(),
  private.my_recent_reports(),
  private.profiles_guard_suspension(),
  private.post_room_welcome(text, uuid),
  private.reject_suspended_chat_write(),
  private.reports_before_write(),
  public.admin_list_reports(text, integer),
  public.admin_resolve_report(uuid, text, text),
  public.admin_suspend_user(uuid, integer, text),
  public.admin_delete_room_message(uuid),
  public.admin_stats()
from public, anon;

revoke all on function
  private.suspended_until(uuid),
  private.profiles_guard_suspension(),
  private.post_room_welcome(text, uuid),
  private.reject_suspended_chat_write(),
  private.reports_before_write()
from authenticated;

-- policies and caller-run triggers use is_admin / is_suspended / my_recent_reports as the signed-in user
grant execute on function
  public.is_admin(),
  private.is_suspended(uuid),
  public.my_suspended_until(),
  private.my_recent_reports(),
  public.admin_list_reports(text, integer),
  public.admin_resolve_report(uuid, text, text),
  public.admin_suspend_user(uuid, integer, text),
  public.admin_delete_room_message(uuid),
  public.admin_stats()
to authenticated, service_role;
grant execute on function private.suspended_until(uuid) to service_role;

-- =================================================================
-- 7. First admin (run once by hand in the SQL editor, with the real email)
-- =================================================================
-- insert into private.app_admins (user_id)
-- select id from auth.users where email = '<YOUR_EMAIL>'
-- on conflict (user_id) do nothing;
