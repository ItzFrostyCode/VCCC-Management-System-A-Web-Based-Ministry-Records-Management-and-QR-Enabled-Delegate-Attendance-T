create table public.conferences (
  id uuid not null default gen_random_uuid (),
  title text not null,
  theme text null,
  location text null,
  start_date date null,
  end_date date null,
  is_deleted boolean not null default false,
  created_at timestamp with time zone not null default now(),
  constraint conferences_pkey primary key (id)
) TABLESPACE pg_default;