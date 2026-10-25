-- moshimoshi · initial schema
-- Tables, triggers, RPCs, RLS, grants and realtime for the friend-finding app.
-- Re-runnable: tables/indexes use IF NOT EXISTS; functions, triggers and policies are replaced.
-- Internal helpers live in schema `private` (not exposed through the Data API).
-- No message content filtering anywhere (founder decision) — only length checks.

-- =================================================================
-- 0. Extensions & schemas
-- =================================================================
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- =================================================================
-- 1. Tables
-- =================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 40),
  color text not null default 'peach'
    check (color in ('peach', 'butter', 'mint', 'lavender', 'sky', 'pink', 'cream')),
  face text check (face in ('smile', 'happy', 'wink', 'sleepy', 'talk', 'wow')),
  accessory text check (accessory in ('none', 'headset', 'leaf', 'bow', 'cap')),
  province text not null default 'กรุงเทพฯ' check (char_length(province) <= 60),
  bio text not null default '' check (char_length(bio) <= 300),
  birth_year int check (birth_year between 1900 and 2100),
  -- every client loads profiles in bulk: keep each one small
  tags text[] not null default '{}' check (cardinality(tags) <= 80 and pg_column_size(tags) <= 2000),
  loves text[] not null default '{}' check (cardinality(loves) <= 3),
  prompts jsonb not null default '[]' check (
    case when jsonb_typeof(prompts) = 'array'
      then jsonb_array_length(prompts) <= 5 and pg_column_size(prompts) <= 4000
      else false
    end
  ),
  chat_style text[] not null default '{}' check (cardinality(chat_style) <= 10),
  online text[] not null default '{}'
    check (online <@ array['morning', 'afternoon', 'evening', 'late']),
  languages text[] not null default '{ไทย}' check (cardinality(languages) <= 10),
  is_host boolean not null default false,
  onboarded boolean not null default false,
  moshi_policy text not null default 'everyone'
    check (moshi_policy in ('everyone', 'rooms', 'chatted')),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id text primary key check (id ~ '^[a-z0-9-]{1,40}$'),
  name text not null,
  icon text not null default 'Sofa',
  color text not null default 'cream'
    check (color in ('peach', 'butter', 'mint', 'lavender', 'sky', 'pink', 'cream')),
  tagline text not null default '',
  vibe text not null default '',
  tags text[] not null default '{}',
  prime_time text not null default '',
  is_lobby boolean not null default false,
  sort int not null default 0
);

create table if not exists public.room_members (
  room_id text not null references public.rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'host')),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.rooms (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade, -- null = system / welcome
  body text not null check (char_length(body) between 1 and 1000),
  kind text not null default 'text' check (kind in ('text', 'welcome', 'system')),
  created_at timestamptz not null default now()
);

create table if not exists public.room_message_sames (
  message_id uuid not null references public.room_messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.rooms (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  starts_at timestamptz not null,
  duration_min int not null default 60 check (duration_min between 5 and 600),
  host_id uuid references public.profiles (id) on delete set null,
  host_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.session_rsvps (
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

create table if not exists public.daily_questions (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.rooms (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  day date not null default ((now() at time zone 'Asia/Bangkok')::date),
  created_at timestamptz not null default now(),
  unique (room_id, day)
);

create table if not exists public.daily_answers (
  question_id uuid not null references public.daily_questions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now(),
  primary key (question_id, user_id)
);

create table if not exists public.daily_answer_sames (
  question_id uuid not null,
  answer_user_id uuid not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (question_id, answer_user_id, user_id),
  foreign key (question_id, answer_user_id)
    references public.daily_answers (question_id, user_id) on delete cascade
);

create table if not exists public.intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  template text not null
    check (template in ('play', 'talk', 'lang', 'event', 'newbie', 'study', 'moved', 'listen')),
  role text not null check (role in ('peer', 'seek', 'offer', 'swap', 'host')),
  tag_id text not null,
  body text not null check (char_length(body) between 1 and 200),
  when_kind text not null check (when_kind in ('tonight', 'weekend', 'anytime', 'dated')),
  when_label text check (char_length(when_label) <= 60),
  mode text not null check (mode in ('online', 'offline')),
  province text check (char_length(province) <= 60),
  slots int check (slots between 1 and 50),
  give text check (char_length(give) <= 100),
  want text check (char_length(want) <= 100),
  room_id text references public.rooms (id) on delete set null,
  status text not null default 'active'
    check (status in ('active', 'paused', 'fulfilled', 'expired')),
  expires_at timestamptz, -- filled by trigger from when_kind when left null
  created_at timestamptz not null default now()
);

create table if not exists public.intent_joins (
  intent_id uuid not null references public.intents (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (intent_id, user_id)
);

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'ended')),
  icebreaker text check (char_length(icebreaker) <= 300),
  created_at timestamptz not null default now()
);

create table if not exists public.chat_members (
  chat_id uuid not null references public.chats (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz,
  consent_media boolean not null default false,
  primary key (chat_id, user_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade, -- null = system
  body text not null check (char_length(body) between 1 and 2000),
  kind text not null default 'text' check (kind in ('text', 'system', 'welcome')),
  created_at timestamptz not null default now()
);

create table if not exists public.chat_message_sames (
  message_id uuid not null references public.chat_messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table if not exists public.blocks (
  blocker uuid not null references public.profiles (id) on delete cascade,
  blocked uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid default auth.uid() references public.profiles (id) on delete set null,
  target_user uuid references public.profiles (id) on delete set null,
  reason text not null check (char_length(reason) between 1 and 100),
  details text check (char_length(details) <= 2000),
  created_at timestamptz not null default now()
);

-- questions the daily job picks "คำถามวันนี้" from (see private.post_daily_questions)
create table if not exists private.daily_question_pool (
  id bigint generated always as identity primary key,
  room_id text not null references public.rooms (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  unique (room_id, body)
);

-- the weekly "รอบคุย" timetable the daily job turns into sessions (see private.plan_sessions)
create table if not exists private.session_plan (
  id bigint generated always as identity primary key,
  room_id text not null references public.rooms (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  weekday int not null check (weekday between 0 and 6), -- 0 = Sunday (Asia/Bangkok)
  at_time time not null,
  duration_min int not null default 60 check (duration_min between 5 and 600),
  host_name text,
  unique (room_id, weekday, at_time)
);

-- who already got a welcome card in a room (so leaving + rejoining doesn't repeat it)
create table if not exists private.room_welcomes (
  room_id text not null references public.rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

-- =================================================================
-- 2. Indexes (hot paths + foreign keys used by cascades / policies)
-- =================================================================
create index if not exists room_messages_room_created_idx on public.room_messages (room_id, created_at desc);
create index if not exists room_messages_user_id_idx on public.room_messages (user_id);
create index if not exists room_members_user_id_idx on public.room_members (user_id);
create index if not exists room_message_sames_user_id_idx on public.room_message_sames (user_id);
create index if not exists sessions_starts_at_idx on public.sessions (starts_at);
create index if not exists sessions_room_id_idx on public.sessions (room_id);
create index if not exists sessions_host_id_idx on public.sessions (host_id);
create index if not exists session_rsvps_user_id_idx on public.session_rsvps (user_id);
create index if not exists daily_answers_user_id_idx on public.daily_answers (user_id);
create index if not exists daily_answer_sames_user_id_idx on public.daily_answer_sames (user_id);
create index if not exists intents_status_created_idx on public.intents (status, created_at desc);
create index if not exists intents_user_id_idx on public.intents (user_id, status);
create index if not exists intents_room_id_idx on public.intents (room_id);
create index if not exists intent_joins_user_id_idx on public.intent_joins (user_id);
create index if not exists chats_requested_by_idx on public.chats (requested_by, created_at desc);
create index if not exists chat_members_user_id_idx on public.chat_members (user_id);
create index if not exists chat_messages_chat_created_idx on public.chat_messages (chat_id, created_at);
create index if not exists chat_messages_user_id_idx on public.chat_messages (user_id);
create index if not exists chat_message_sames_user_id_idx on public.chat_message_sames (user_id);
create index if not exists blocks_blocked_idx on public.blocks (blocked);
create index if not exists reports_reporter_idx on public.reports (reporter);
create index if not exists reports_target_user_idx on public.reports (target_user);
create index if not exists room_welcomes_user_id_idx on private.room_welcomes (user_id);
create index if not exists profiles_last_seen_idx on public.profiles (last_seen_at desc);
create index if not exists daily_question_pool_room_idx on private.daily_question_pool (room_id);
create index if not exists session_plan_room_idx on private.session_plan (room_id);

-- =================================================================
-- 3. Helper functions (security definer → policies never recurse)
-- =================================================================
create or replace function private.is_blocked(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker = a and blocked = b) or (blocker = b and blocked = a)
  );
$$;

-- for policies: only ever asks about the caller, so it can't be used to probe who blocked whom
create or replace function private.is_blocked_with(other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker = (select auth.uid()) and blocked = other)
       or (blocker = other and blocked = (select auth.uid()))
  );
$$;

create or replace function private.is_chat_member(p_chat uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.chat_members
    where chat_id = p_chat and user_id = (select auth.uid())
  );
$$;

-- member of an active chat, and nobody in it has blocked the other
create or replace function private.can_post_in_chat(p_chat uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.chats c
    join public.chat_members mine on mine.chat_id = c.id and mine.user_id = (select auth.uid())
    join public.chat_members other on other.chat_id = c.id and other.user_id <> mine.user_id
    where c.id = p_chat
      and c.status = 'active'
      and not private.is_blocked(mine.user_id, other.user_id)
  );
$$;

-- Posts the welcome card the first time an onboarded person lands in a room.
-- The row carries the newcomer's id (kind 'welcome'), so block filters apply to it and the
-- room chat UI takes the name from the profile. Body starts with "ยินดีต้อนรับ <name> (".
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
  if not found or not p.onboarded then
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

-- Marks overdue intents expired. Called by pg_cron when available (see end of file).
create or replace function private.expire_intents()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  update public.intents set status = 'expired'
  where status in ('active', 'paused') and expires_at <= now();
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Today's question per room from the pool (questions not asked in the last 30 days first).
-- Called by pg_cron at 00:05 Bangkok time when available (see end of file).
create or replace function private.post_daily_questions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Asia/Bangkok')::date;
  n integer;
begin
  insert into public.daily_questions (room_id, body, day)
  select distinct on (p.room_id) p.room_id, p.body, today
  from private.daily_question_pool p
  order by
    p.room_id,
    exists (
      select 1 from public.daily_questions q
      where q.room_id = p.room_id and q.body = p.body and q.day > today - 30
    ),
    random()
  on conflict (room_id, day) do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Sessions for today and the next `days` days from the weekly plan (skips ones already there).
create or replace function private.plan_sessions(days integer default 7)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Asia/Bangkok')::date;
  n integer;
begin
  insert into public.sessions (room_id, title, starts_at, duration_min, host_id, host_name)
  select sp.room_id, sp.title, (d.day + sp.at_time) at time zone 'Asia/Bangkok', sp.duration_min, null, sp.host_name
  from (
    select g::date as day
    from generate_series(today::timestamp, (today + greatest(days, 0))::timestamp, interval '1 day') as g
  ) d
  join private.session_plan sp on sp.weekday = extract(dow from d.day)::int
  where not exists (
    select 1 from public.sessions x
    where x.room_id = sp.room_id
      and x.title = sp.title
      and x.starts_at = (d.day + sp.at_time) at time zone 'Asia/Bangkok'
  );
  get diagnostics n = row_count;
  return n;
end;
$$;

-- =================================================================
-- 4. Trigger functions + triggers
-- =================================================================

-- new auth user → profile row
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- first name from the sign-up data at most (never the email: other people can read names);
  -- an empty name shows as "เพื่อนใหม่" until onboarding asks for one
  insert into public.profiles (id, name)
  values (
    new.id,
    left(split_part(btrim(coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      ''
    )), ' ', 1), 40)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- updated_at + signed-in users can't make themselves hosts, rewrite identity columns,
-- look online forever, or skip the 20+ rule.
-- Runs as the caller on purpose: current_user is 'authenticated' for API requests.
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

    -- 20+ only. Just the year is stored, so the client keeps the month-level check.
    -- An upsert's insert half is skipped when the row exists: its update half sees the merged row.
    if tg_op = 'UPDATE' or not exists (select 1 from public.profiles where id = new.id) then
      if new.birth_year is not null
        and new.birth_year > extract(year from now() at time zone 'Asia/Bangkok')::int - 20 then
        raise exception 'too_young' using errcode = '23514';
      end if;
      if new.onboarded and new.birth_year is null then
        if tg_op = 'INSERT' then
          raise exception 'age_required' using errcode = '23514';
        elsif not old.onboarded or old.birth_year is not null then
          raise exception 'age_required' using errcode = '23514';
        end if;
      end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace trigger profiles_before_write
  before insert or update on public.profiles
  for each row execute function private.profiles_before_write();

-- created_at belongs to the server: API callers can't backdate or future-date rows
-- (a message dated 2099 would stay "newest" and keep an unread badge on forever).
-- Runs as the caller on purpose; rows written by security definer functions keep their default.
create or replace function private.stamp_created_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.created_at := now();
    else
      new.created_at := old.created_at;
    end if;
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'room_messages', 'room_message_sames', 'session_rsvps', 'daily_answers', 'daily_answer_sames',
    'intents', 'intent_joins', 'chat_messages', 'chat_message_sames', 'blocks', 'reports'
  ] loop
    execute format(
      'create or replace trigger %I before insert or update on public.%I for each row execute function private.stamp_created_at()',
      t || '_stamp', t
    );
  end loop;
end;
$$;

-- finishing onboarding → welcome cards in the rooms already joined
create or replace function private.profiles_after_onboard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in select room_id from public.room_members where user_id = new.id loop
    perform private.post_room_welcome(r.room_id, new.id);
  end loop;
  return null;
end;
$$;

create or replace trigger profiles_after_onboard
  after update of onboarded on public.profiles
  for each row
  when (new.onboarded and not old.onboarded)
  execute function private.profiles_after_onboard();

-- joining a room → welcome card (first time only)
create or replace function private.room_members_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.post_room_welcome(new.room_id, new.user_id);
  return null;
end;
$$;

create or replace trigger room_members_after_insert
  after insert on public.room_members
  for each row execute function private.room_members_after_insert();

-- intents: default expiry from when_kind + max 3 active per person
create or replace function private.intents_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  local_now timestamp := now() at time zone 'Asia/Bangkok';
  today_6am timestamp := date_trunc('day', now() at time zone 'Asia/Bangkok') + interval '6 hours';
  active_count int;
begin
  if new.expires_at is null or (new.status = 'active' and new.expires_at <= now()) then
    new.expires_at := case new.when_kind
      -- tonight → next 06:00 Bangkok time
      when 'tonight' then
        (case when local_now >= today_6am then today_6am + interval '1 day' else today_6am end)
          at time zone 'Asia/Bangkok'
      -- weekend → Monday 06:00 after the coming weekend
      when 'weekend' then
        (date_trunc('week', local_now) + interval '7 days 6 hours') at time zone 'Asia/Bangkok'
      when 'dated' then now() + interval '7 days'
      else now() + interval '14 days'
    end;
  end if;
  -- a client-chosen expiry can't keep a post open for good
  if new.expires_at > now() + interval '30 days' then
    new.expires_at := now() + interval '30 days';
  end if;

  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    perform pg_advisory_xact_lock(hashtextextended('intents:' || new.user_id::text, 0));
    update public.intents set status = 'expired'
    where user_id = new.user_id and status = 'active' and expires_at <= now();
    select count(*) into active_count
    from public.intents
    where user_id = new.user_id and status = 'active' and id <> new.id;
    if active_count >= 3 then
      raise exception 'intent_limit';
    end if;
  end if;

  return new;
end;
$$;

create or replace trigger intents_before_write
  before insert or update on public.intents
  for each row execute function private.intents_before_write();

-- "ฉันด้วย": intent must be open, not mine, not blocked, and have a free slot
create or replace function private.intent_joins_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  it record;
  taken int;
begin
  select user_id, status, slots, expires_at into it
  from public.intents where id = new.intent_id
  for update;
  if not found then
    raise exception 'intent_not_found';
  end if;
  if it.user_id = new.user_id then
    raise exception 'own_intent';
  end if;
  if it.status <> 'active' or it.expires_at <= now() then
    raise exception 'intent_closed';
  end if;
  if private.is_blocked(new.user_id, it.user_id) then
    raise exception 'blocked';
  end if;
  if it.slots is not null then
    select count(*) into taken from public.intent_joins where intent_id = new.intent_id;
    if taken >= it.slots then
      raise exception 'intent_full';
    end if;
  end if;
  return new;
end;
$$;

create or replace trigger intent_joins_before_insert
  before insert on public.intent_joins
  for each row execute function private.intent_joins_before_insert();

-- exactly two people per chat
create or replace function private.chat_members_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.chat_members where chat_id = new.chat_id) >= 2 then
    raise exception 'chat_full';
  end if;
  return new;
end;
$$;

create or replace trigger chat_members_before_insert
  before insert on public.chat_members
  for each row execute function private.chat_members_before_insert();

-- =================================================================
-- 5. RPCs (the only way to start / answer a 1:1 chat)
-- Errors are raised with a short key as the message:
--   not_authenticated, cannot_moshi_self, opener_invalid, target_not_found, blocked,
--   moshi_not_allowed, moshi_declined, moshi_rate_limited,
--   chat_not_found, not_allowed, chat_not_pending
-- =================================================================
create or replace function public.send_moshi(target uuid, opener text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_body text := btrim(coalesce(opener, ''));
  v_policy text;
  v_chat uuid;
  v_status text;
  v_requested_by uuid;
begin
  if v_me is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if target is null or target = v_me then
    raise exception 'cannot_moshi_self';
  end if;
  if char_length(v_body) not between 1 and 2000 then
    raise exception 'opener_invalid';
  end if;

  select moshi_policy into v_policy from public.profiles where id = target;
  if not found then
    raise exception 'target_not_found';
  end if;
  if private.is_blocked(v_me, target) then
    raise exception 'blocked';
  end if;

  -- one moshi at a time per pair, so two people tapping at once end up in one chat
  perform pg_advisory_xact_lock(
    hashtextextended('moshi:' || least(v_me, target)::text || greatest(v_me, target)::text, 0)
  );

  -- locked: a decline committing meanwhile (respond_moshi) must not be overwritten below
  select c.id, c.status, c.requested_by
    into v_chat, v_status, v_requested_by
  from public.chats c
  join public.chat_members a on a.chat_id = c.id and a.user_id = v_me
  join public.chat_members b on b.chat_id = c.id and b.user_id = target
  order by c.created_at desc
  limit 1
  for update of c;

  if v_chat is null then
    if v_policy = 'chatted'
      or (v_policy = 'rooms' and not exists (
        select 1
        from public.room_members a
        join public.room_members b on b.room_id = a.room_id and b.user_id = target
        join public.rooms r on r.id = a.room_id and not r.is_lobby
        where a.user_id = v_me
      ))
    then
      raise exception 'moshi_not_allowed';
    end if;
    if (select count(*) from public.chats
        where requested_by = v_me and created_at > now() - interval '1 day') >= 30 then
      raise exception 'moshi_rate_limited';
    end if;

    insert into public.chats (requested_by) values (v_me) returning id into v_chat;
    insert into public.chat_members (chat_id, user_id) values (v_chat, v_me), (v_chat, target);
  elsif v_status = 'pending' and v_requested_by = v_me then
    return v_chat; -- still waiting for them; don't stack openers
  elsif v_status = 'pending' then
    update public.chats set status = 'active' where id = v_chat; -- they moshi'd first: answering back accepts
  elsif v_status = 'ended' then
    if v_requested_by = v_me then
      raise exception 'moshi_declined';
    end if;
    -- I had closed their request earlier and now reach out myself
    update public.chats set status = 'pending', requested_by = v_me where id = v_chat;
  end if;

  insert into public.chat_messages (chat_id, user_id, body) values (v_chat, v_me, v_body);
  update public.chat_members set last_read_at = now() where chat_id = v_chat and user_id = v_me;
  return v_chat;
end;
$$;

create or replace function public.respond_moshi(p_chat uuid, accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_accept boolean := coalesce(accept, false);
  v_chat public.chats%rowtype;
begin
  if v_me is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into v_chat from public.chats where id = p_chat for update;
  if not found or not exists (
    select 1 from public.chat_members where chat_id = p_chat and user_id = v_me
  ) then
    raise exception 'chat_not_found';
  end if;
  if v_chat.requested_by = v_me then
    raise exception 'not_allowed';
  end if;
  if v_chat.status <> 'pending' then
    raise exception 'chat_not_pending';
  end if;
  if v_accept and private.is_blocked(v_me, v_chat.requested_by) then
    raise exception 'blocked';
  end if;

  update public.chats
  set status = case when v_accept then 'active' else 'ended' end
  where id = p_chat;

  insert into public.chat_messages (chat_id, user_id, kind, body)
  values (
    p_chat, null, 'system',
    case
      when v_accept then 'ตอบรับโมชิแล้ว เริ่มคุยกันได้เลย!'
      else 'แชทนี้ปิดแล้ว ไม่เป็นไรนะ ยังมีเพื่อนอีกหลายคนในห้องให้ทักทาย'
    end
  );
  update public.chat_members set last_read_at = now() where chat_id = p_chat and user_id = v_me;
end;
$$;

create or replace function public.mark_chat_read(p_chat uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.chat_members
  set last_read_at = now()
  where chat_id = p_chat and user_id = (select auth.uid());
$$;

-- =================================================================
-- 6. Row level security
-- =================================================================
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_messages enable row level security;
alter table public.room_message_sames enable row level security;
alter table public.sessions enable row level security;
alter table public.session_rsvps enable row level security;
alter table public.daily_questions enable row level security;
alter table public.daily_answers enable row level security;
alter table public.daily_answer_sames enable row level security;
alter table public.intents enable row level security;
alter table public.intent_joins enable row level security;
alter table public.chats enable row level security;
alter table public.chat_members enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_message_sames enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table private.room_welcomes enable row level security; -- no policies: internal only
alter table private.daily_question_pool enable row level security; -- no policies: internal only
alter table private.session_plan enable row level security; -- no policies: internal only

-- profiles: everyone signed in, except people in a block relation with me
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or not private.is_blocked_with(id));
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles for delete to authenticated
  using (id = (select auth.uid()));

-- rooms: public previews (anon too); managed by admins only
drop policy if exists rooms_select on public.rooms;
create policy rooms_select on public.rooms for select to anon, authenticated using (true);

-- room_members: join/leave myself, as a plain member
drop policy if exists room_members_select on public.room_members;
create policy room_members_select on public.room_members for select to authenticated using (true);
drop policy if exists room_members_insert on public.room_members;
create policy room_members_insert on public.room_members for insert to authenticated
  with check (user_id = (select auth.uid()) and role = 'member');
drop policy if exists room_members_delete on public.room_members;
create policy room_members_delete on public.room_members for delete to authenticated
  using (user_id = (select auth.uid()));

-- room_messages: read all, post/delete my own text lines (welcome/system come from triggers)
drop policy if exists room_messages_select on public.room_messages;
create policy room_messages_select on public.room_messages for select to authenticated using (true);
drop policy if exists room_messages_insert on public.room_messages;
create policy room_messages_insert on public.room_messages for insert to authenticated
  with check (user_id = (select auth.uid()) and kind = 'text');
drop policy if exists room_messages_delete on public.room_messages;
create policy room_messages_delete on public.room_messages for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists room_message_sames_select on public.room_message_sames;
create policy room_message_sames_select on public.room_message_sames for select to authenticated using (true);
drop policy if exists room_message_sames_insert on public.room_message_sames;
create policy room_message_sames_insert on public.room_message_sames for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists room_message_sames_delete on public.room_message_sames;
create policy room_message_sames_delete on public.room_message_sames for delete to authenticated
  using (user_id = (select auth.uid()));

-- sessions: read only for users
drop policy if exists sessions_select on public.sessions;
create policy sessions_select on public.sessions for select to authenticated using (true);

drop policy if exists session_rsvps_select on public.session_rsvps;
create policy session_rsvps_select on public.session_rsvps for select to authenticated using (true);
drop policy if exists session_rsvps_insert on public.session_rsvps;
create policy session_rsvps_insert on public.session_rsvps for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists session_rsvps_delete on public.session_rsvps;
create policy session_rsvps_delete on public.session_rsvps for delete to authenticated
  using (user_id = (select auth.uid()));

-- daily questions / answers
drop policy if exists daily_questions_select on public.daily_questions;
create policy daily_questions_select on public.daily_questions for select to authenticated using (true);

drop policy if exists daily_answers_select on public.daily_answers;
create policy daily_answers_select on public.daily_answers for select to authenticated using (true);
drop policy if exists daily_answers_insert on public.daily_answers;
create policy daily_answers_insert on public.daily_answers for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists daily_answers_update on public.daily_answers;
create policy daily_answers_update on public.daily_answers for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists daily_answers_delete on public.daily_answers;
create policy daily_answers_delete on public.daily_answers for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists daily_answer_sames_select on public.daily_answer_sames;
create policy daily_answer_sames_select on public.daily_answer_sames for select to authenticated using (true);
drop policy if exists daily_answer_sames_insert on public.daily_answer_sames;
create policy daily_answer_sames_insert on public.daily_answer_sames for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists daily_answer_sames_delete on public.daily_answer_sames;
create policy daily_answer_sames_delete on public.daily_answer_sames for delete to authenticated
  using (user_id = (select auth.uid()));

-- intents ("กำลังหา") + joins ("ฉันด้วย")
drop policy if exists intents_select on public.intents;
create policy intents_select on public.intents for select to authenticated using (true);
drop policy if exists intents_insert on public.intents;
create policy intents_insert on public.intents for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists intents_update on public.intents;
create policy intents_update on public.intents for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists intents_delete on public.intents;
create policy intents_delete on public.intents for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists intent_joins_select on public.intent_joins;
create policy intent_joins_select on public.intent_joins for select to authenticated using (true);
drop policy if exists intent_joins_insert on public.intent_joins;
create policy intent_joins_insert on public.intent_joins for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists intent_joins_delete on public.intent_joins;
create policy intent_joins_delete on public.intent_joins for delete to authenticated
  using (user_id = (select auth.uid()));

-- chats: members only; created/answered through the RPCs above
drop policy if exists chats_select on public.chats;
create policy chats_select on public.chats for select to authenticated
  using (private.is_chat_member(id));

drop policy if exists chat_members_select on public.chat_members;
create policy chat_members_select on public.chat_members for select to authenticated
  using (private.is_chat_member(chat_id));
drop policy if exists chat_members_update on public.chat_members; -- column grant limits it to last_read_at / consent_media
create policy chat_members_update on public.chat_members for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists chat_messages_select on public.chat_messages;
create policy chat_messages_select on public.chat_messages for select to authenticated
  using (private.is_chat_member(chat_id));
drop policy if exists chat_messages_insert on public.chat_messages;
create policy chat_messages_insert on public.chat_messages for insert to authenticated
  with check (user_id = (select auth.uid()) and kind = 'text' and private.can_post_in_chat(chat_id));
drop policy if exists chat_messages_delete on public.chat_messages;
create policy chat_messages_delete on public.chat_messages for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists chat_message_sames_select on public.chat_message_sames;
create policy chat_message_sames_select on public.chat_message_sames for select to authenticated
  using (exists (
    select 1 from public.chat_messages m
    where m.id = message_id and private.is_chat_member(m.chat_id)
  ));
drop policy if exists chat_message_sames_insert on public.chat_message_sames;
create policy chat_message_sames_insert on public.chat_message_sames for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.chat_messages m
      where m.id = message_id and private.can_post_in_chat(m.chat_id) -- active chat, no block
    )
  );
drop policy if exists chat_message_sames_delete on public.chat_message_sames;
create policy chat_message_sames_delete on public.chat_message_sames for delete to authenticated
  using (user_id = (select auth.uid()));

-- blocks: only the blocker sees / manages their own list
drop policy if exists blocks_select on public.blocks;
create policy blocks_select on public.blocks for select to authenticated
  using (blocker = (select auth.uid()));
drop policy if exists blocks_insert on public.blocks;
create policy blocks_insert on public.blocks for insert to authenticated
  with check (blocker = (select auth.uid()));
drop policy if exists blocks_delete on public.blocks;
create policy blocks_delete on public.blocks for delete to authenticated
  using (blocker = (select auth.uid()));

-- reports: write-only (insert without .select() — nobody can read them back)
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert to authenticated
  with check (reporter = (select auth.uid()));

-- =================================================================
-- 7. Views
-- =================================================================
-- member / online counts per room (online = seen in the last 5 minutes)
create or replace view public.room_stats
with (security_invoker = on)
as
select
  r.id as room_id,
  count(m.user_id)::int as members,
  (count(m.user_id) filter (where p.last_seen_at > now() - interval '5 minutes'))::int as online
from public.rooms r
left join public.room_members m on m.room_id = r.id
left join public.profiles p on p.id = m.user_id
group by r.id;

-- =================================================================
-- 8. Grants (RLS still applies on top of these)
-- =================================================================
revoke all on table
  public.profiles, public.rooms, public.room_members, public.room_messages,
  public.room_message_sames, public.sessions, public.session_rsvps, public.daily_questions,
  public.daily_answers, public.daily_answer_sames, public.intents, public.intent_joins,
  public.chats, public.chat_members, public.chat_messages, public.chat_message_sames,
  public.blocks, public.reports, public.room_stats
from anon, authenticated;
revoke all on table private.room_welcomes, private.daily_question_pool, private.session_plan
from public, anon, authenticated;

grant select on public.rooms to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, delete on public.room_members to authenticated;
grant select, insert, delete on public.room_messages to authenticated;
grant select, insert, delete on public.room_message_sames to authenticated;
grant select on public.sessions to authenticated;
grant select, insert, delete on public.session_rsvps to authenticated;
grant select on public.daily_questions to authenticated;
grant select, insert, update, delete on public.daily_answers to authenticated;
grant select, insert, delete on public.daily_answer_sames to authenticated;
grant select, insert, update, delete on public.intents to authenticated;
grant select, insert, delete on public.intent_joins to authenticated;
grant select on public.chats to authenticated;
grant select on public.chat_members to authenticated;
grant update (last_read_at, consent_media) on public.chat_members to authenticated;
grant select, insert, delete on public.chat_messages to authenticated;
grant select, insert, delete on public.chat_message_sames to authenticated;
grant select, insert, delete on public.blocks to authenticated;
grant insert on public.reports to authenticated;
grant select on public.room_stats to authenticated;

grant all on table
  public.profiles, public.rooms, public.room_members, public.room_messages,
  public.room_message_sames, public.sessions, public.session_rsvps, public.daily_questions,
  public.daily_answers, public.daily_answer_sames, public.intents, public.intent_joins,
  public.chats, public.chat_members, public.chat_messages, public.chat_message_sames,
  public.blocks, public.reports, public.room_stats, private.room_welcomes,
  private.daily_question_pool, private.session_plan
to service_role;

revoke all on function
  private.is_blocked(uuid, uuid),
  private.is_blocked_with(uuid),
  private.is_chat_member(uuid),
  private.can_post_in_chat(uuid),
  private.post_room_welcome(text, uuid),
  private.expire_intents(),
  private.post_daily_questions(),
  private.plan_sessions(integer),
  private.handle_new_user(),
  private.profiles_before_write(),
  private.stamp_created_at(),
  private.profiles_after_onboard(),
  private.room_members_after_insert(),
  private.intents_before_write(),
  private.intent_joins_before_insert(),
  private.chat_members_before_insert(),
  public.send_moshi(uuid, text),
  public.respond_moshi(uuid, boolean),
  public.mark_chat_read(uuid)
from public, anon;

-- policies call these as the signed-in user. The two-argument is_blocked stays with the
-- security definer functions and triggers (they run as the owner).
grant execute on function
  private.is_blocked_with(uuid),
  private.is_chat_member(uuid),
  private.can_post_in_chat(uuid)
to authenticated, service_role;
revoke execute on function private.is_blocked(uuid, uuid) from authenticated;
grant execute on function private.is_blocked(uuid, uuid) to service_role;

revoke all on function
  private.post_room_welcome(text, uuid), private.expire_intents(),
  private.post_daily_questions(), private.plan_sessions(integer), private.stamp_created_at()
from authenticated;
grant execute on function
  private.post_room_welcome(text, uuid), private.expire_intents(),
  private.post_daily_questions(), private.plan_sessions(integer)
to service_role;

grant execute on function
  public.send_moshi(uuid, text),
  public.respond_moshi(uuid, boolean),
  public.mark_chat_read(uuid)
to authenticated, service_role;

-- =================================================================
-- 9. Realtime
-- =================================================================
do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array[
    'room_messages', 'room_message_sames', 'chat_messages', 'chats',
    'chat_members', 'intents', 'intent_joins', 'daily_answers'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;

-- =================================================================
-- 10. Housekeeping
-- =================================================================
-- profiles for accounts that existed before this migration
insert into public.profiles (id, name)
select
  u.id,
  left(split_part(btrim(coalesce(
    nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
    ''
  )), ' ', 1), 40)
from auth.users u
on conflict (id) do nothing;

-- scheduled jobs when pg_cron is enabled (enable it under Database → Extensions, then re-run
-- this block): expire overdue intents every 15 minutes; at 00:05 Bangkok (17:05 UTC) post
-- today's questions and plan the sessions for the coming week
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('moshi-expire-intents', '*/15 * * * *', 'select private.expire_intents()');
    perform cron.schedule('moshi-daily-questions', '5 17 * * *', 'select private.post_daily_questions()');
    perform cron.schedule('moshi-plan-sessions', '6 17 * * *', 'select private.plan_sessions(7)');
  end if;
end;
$$;
