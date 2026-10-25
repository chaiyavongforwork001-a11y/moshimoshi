-- moshimoshi · founder becomes admin automatically
-- The founder's account is made an admin the moment it signs up (or now, if it already exists).

create or replace function private.grant_founder_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(new.email) = 'chaiyavongforwork001@gmail.com' then
    insert into private.app_admins (user_id) values (new.id) on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function private.grant_founder_admin() from public, anon, authenticated;

drop trigger if exists grant_founder_admin on auth.users;
create trigger grant_founder_admin
  after insert on auth.users
  for each row execute function private.grant_founder_admin();

insert into private.app_admins (user_id)
select id from auth.users where lower(email) = 'chaiyavongforwork001@gmail.com'
on conflict (user_id) do nothing;
