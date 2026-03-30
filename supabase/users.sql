create table public.users (
  id uuid not null default gen_random_uuid (),
  username text not null,
  password_hash text not null,
  full_name text not null,
  role text not null,
  scope text null default 'FULL'::text,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint users_pkey primary key (id),
  constraint users_username_key unique (username),
  constraint chk_user_role check (
    (
      role = any (
        array['Admin'::text, 'Staff'::text, 'Scanner'::text]
      )
    )
  )
) TABLESPACE pg_default;