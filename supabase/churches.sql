create table public.churches (
  id uuid not null default gen_random_uuid (),
  district_id uuid null,
  church_name text not null,
  church_address text not null,
  church_scope text not null default 'local'::text,
  notes text null,
  is_deleted boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint churches_pkey primary key (id),
  constraint churches_district_id_church_name_key unique (district_id, church_name),
  constraint churches_district_id_fkey foreign KEY (district_id) references districts (id) on delete set null,
  constraint chk_church_scope check (
    (
      church_scope = any (array['local'::text, 'international'::text])
    )
  )
) TABLESPACE pg_default;