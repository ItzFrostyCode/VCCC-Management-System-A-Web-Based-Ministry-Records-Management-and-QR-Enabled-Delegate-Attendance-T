create table public.audit_logs (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  action text not null,
  details text null,
  device_info text null,
  ip_address text null,
  timestamp timestamp with time zone not null default now(),
  constraint audit_logs_pkey primary key (id),
  constraint audit_logs_user_id_fkey foreign KEY (user_id) references users (id) on delete set null
) TABLESPACE pg_default;