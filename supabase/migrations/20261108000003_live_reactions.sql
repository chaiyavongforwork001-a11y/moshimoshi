-- moshimoshi · "เหมือนกัน!" reaches the other person, wherever it can be tapped
--
-- 1) prompt_sames: "เหมือนกัน!" on a story in someone's profile used to stay on the tapper's
--    phone. Now it's a row the story's owner can see. Only the tapper and the owner can read it.
--    The primary key is a plain uuid on purpose: realtime sends delete events to every
--    subscriber with the key alone, and an opaque id says nothing about who reacted to whom.
--    prompt_key names one exact story (promptKey() in src/data/tags.ts): the prompt, one of the
--    six listed prompt ids or "own-" plus a fingerprint of a question the owner wrote, then "~"
--    and a fingerprint of the answer, so a rewritten or re-added story starts fresh. The format
--    is checked here because the owner's app files reactions under these keys; a new prompt id
--    needs this check widened. Each person keeps at most 10 story reactions per profile: the
--    11th replaces their oldest (left behind by rewritten stories), so nobody can flood a profile.
-- 2) chat_message_sames moves to an opaque uuid primary key (message_id + user_id stay unique)
--    before it goes live, for the same reason: with the old key, every delete event would have
--    told every signed-in user who un-reacted in which private chat.
-- 3) No reactions across a block (stories, daily answers, room messages; chats already check it),
--    and none from a suspended account (all one-tap reactions, like posting).
-- 4) chat_message_sames, daily_answer_sames and prompt_sames join the realtime publication. RLS
--    decides who receives each insert; delete events carry only opaque ids, or keys of daily
--    answer reactions that everyone signed in can read anyway.
--
-- Re-runnable.

-- ------------------------------------------------------------------ 1. story reactions
create table if not exists public.prompt_sames (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  prompt_key text not null
    constraint prompt_sames_key_format
    check (prompt_key ~ '^(own-[0-9a-z]{1,7}|hooked|weekend|allnight|recommend|queue|invite)~[0-9a-z]{1,7}$'),
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, prompt_key, user_id),
  check (profile_id <> user_id)
);

create index if not exists prompt_sames_user_id_idx on public.prompt_sames (user_id);

create or replace trigger prompt_sames_stamp
  before insert or update on public.prompt_sames
  for each row execute function private.stamp_created_at();

-- at most 10 story reactions per person per profile: a new one replaces their oldest
create or replace function private.prompt_sames_keep_recent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- one reactor's rows on one profile change one insert at a time
  perform pg_advisory_xact_lock(hashtextextended('prompt_sames:' || new.profile_id::text || ':' || new.user_id::text, 0));
  if exists (
    select 1 from public.prompt_sames
    where profile_id = new.profile_id and prompt_key = new.prompt_key and user_id = new.user_id
  ) then
    return new; -- a repeat: the unique key makes it a no-op
  end if;
  delete from public.prompt_sames
  where id in (
    select id from public.prompt_sames
    where profile_id = new.profile_id and user_id = new.user_id
    order by created_at desc, id desc
    offset 9
  );
  return new;
end;
$$;

revoke all on function private.prompt_sames_keep_recent() from public, anon, authenticated;

create or replace trigger prompt_sames_keep_recent
  before insert on public.prompt_sames
  for each row execute function private.prompt_sames_keep_recent();

alter table public.prompt_sames enable row level security;

drop policy if exists prompt_sames_select on public.prompt_sames;
create policy prompt_sames_select on public.prompt_sames for select to authenticated
  using (user_id = (select auth.uid()) or profile_id = (select auth.uid()));
drop policy if exists prompt_sames_insert on public.prompt_sames;
create policy prompt_sames_insert on public.prompt_sames for insert to authenticated
  with check (user_id = (select auth.uid()) and not private.is_blocked_with(profile_id));
drop policy if exists prompt_sames_delete on public.prompt_sames;
create policy prompt_sames_delete on public.prompt_sames for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.prompt_sames from anon, authenticated;
grant select, insert, delete on public.prompt_sames to authenticated;
grant all on table public.prompt_sames to service_role;

-- ------------------------------------------------------------------ 2. chat reactions: an opaque key
alter table public.chat_message_sames add column if not exists id uuid not null default gen_random_uuid();

do $$
declare
  pk text;
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.chat_message_sames'::regclass and conname = 'chat_message_sames_message_id_user_id_key'
  ) then
    alter table public.chat_message_sames
      add constraint chat_message_sames_message_id_user_id_key unique (message_id, user_id);
  end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.conrelid = 'public.chat_message_sames'::regclass and c.contype = 'p' and a.attname = 'id'
  ) then
    select conname into pk from pg_constraint
    where conrelid = 'public.chat_message_sames'::regclass and contype = 'p';
    if pk is not null then
      execute format('alter table public.chat_message_sames drop constraint %I', pk);
    end if;
    alter table public.chat_message_sames add constraint chat_message_sames_pkey primary key (id);
  end if;
end;
$$;

-- ------------------------------------------------------------------ 3. blocks and suspensions
drop policy if exists daily_answer_sames_insert on public.daily_answer_sames;
create policy daily_answer_sames_insert on public.daily_answer_sames for insert to authenticated
  with check (user_id = (select auth.uid()) and not private.is_blocked_with(answer_user_id));

drop policy if exists room_message_sames_insert on public.room_message_sames;
create policy room_message_sames_insert on public.room_message_sames for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and not exists (
      select 1 from public.room_messages m
      where m.id = message_id and m.user_id is not null and private.is_blocked_with(m.user_id)
    )
  );

do $$
declare
  t text;
begin
  foreach t in array array['prompt_sames', 'room_message_sames', 'daily_answer_sames', 'chat_message_sames', 'intent_joins'] loop
    execute format('drop policy if exists %I on public.%I', t || '_not_suspended', t);
    execute format(
      'create policy %I on public.%I as restrictive for insert to authenticated '
      'with check (not (select private.is_suspended((select auth.uid()))))',
      t || '_not_suspended', t
    );
  end loop;
end;
$$;

-- ------------------------------------------------------------------ 4. live
do $$
declare
  t text;
begin
  foreach t in array array['chat_message_sames', 'daily_answer_sames', 'prompt_sames'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;

notify pgrst, 'reload schema';
