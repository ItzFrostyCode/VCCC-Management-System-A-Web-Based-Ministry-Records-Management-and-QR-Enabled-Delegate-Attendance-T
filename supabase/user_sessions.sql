create table public.user_sessions (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  device_info text null,
  login_time timestamp with time zone not null default now(),
  active_flag boolean not null default true,
  constraint user_sessions_pkey primary key (id),
  constraint user_sessions_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create unique INDEX IF not exists single_active_session_per_user on public.user_sessions using btree (user_id) TABLESPACE pg_default
where
  (active_flag = true);