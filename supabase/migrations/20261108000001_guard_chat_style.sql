-- moshimoshi · suspension guard covers chat_style
-- People can now type their own chat style ("อื่นๆ"), and everyone reads it on their profile.
-- So it joins the things a suspended person can't rewrite. Runs as the caller on purpose,
-- like the version it replaces in 20261025000002_admin.sql.
create or replace function private.profiles_guard_suspension()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated')
    and (new.name, new.bio, new.prompts, new.tags, new.chat_style) is distinct from (old.name, old.bio, old.prompts, old.tags, old.chat_style)
    and private.is_suspended(old.id)
    and not public.is_admin() then
    raise exception 'suspended';
  end if;
  return new;
end;
$$;
