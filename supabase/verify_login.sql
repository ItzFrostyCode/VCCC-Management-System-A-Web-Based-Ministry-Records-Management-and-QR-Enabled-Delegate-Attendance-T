-- ──────────────────────────────────────────────────────────────
-- RPC: verify_login  (v2 — handles both pgcrypto and plain-text passwords)
-- ──────────────────────────────────────────────────────────────
-- Two-pass check:
--   Pass 1: pgcrypto crypt()     → matches if create_user_account hashes with crypt()
--   Pass 2: plain-text equality  → matches if passwords were stored as-is (migration)
-- Once you confirm which pass succeeds you know the hashing method in use.
-- ──────────────────────────────────────────────────────────────
create or replace function public.verify_login(
  p_username text,
  p_password text
)
returns table (
  id         uuid,
  username   text,
  full_name  text,
  role       text,
  scope      text,
  is_active  boolean
)
language plpgsql
security definer
as $$
declare
  v_user public.users%rowtype;
begin
  -- Fetch the user row by username (active only)
  select * into v_user
  from public.users u
  where u.username = p_username
    and u.is_active = true
  limit 1;

  -- No user found at all
  if not found then
    return;
  end if;

  -- Pass 1: pgcrypto hash check (works if create_user_account uses crypt())
  begin
    if v_user.password_hash = crypt(p_password, v_user.password_hash) then
      return query select
        v_user.id, v_user.username, v_user.full_name,
        v_user.role, v_user.scope, v_user.is_active;
      return;
    end if;
  exception when others then
    -- crypt() threw (e.g. invalid salt because password was stored as plain text)
    -- fall through to Pass 2
    null;
  end;

  -- Pass 2: plain-text equality (fallback for un-hashed passwords)
  if v_user.password_hash = p_password then
    return query select
      v_user.id, v_user.username, v_user.full_name,
      v_user.role, v_user.scope, v_user.is_active;
    return;
  end if;

  -- Neither matched — return empty (caller raises "Invalid username or password")
  return;
end;
$$;

-- Permissions
revoke all on function public.verify_login(text, text) from public;
grant execute on function public.verify_login(text, text) to anon, authenticated;
