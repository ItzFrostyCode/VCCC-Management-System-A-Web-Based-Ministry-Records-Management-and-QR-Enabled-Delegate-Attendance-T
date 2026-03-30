create table public.districts (
  id uuid not null default gen_random_uuid (),
  district_name text not null,
  theme_color text null,
  leader_pastor_id uuid null,
  notes text null,
  is_deleted boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint districts_pkey primary key (id),
  constraint districts_district_name_key unique (district_name),
  constraint fk_districts_leader foreign KEY (leader_pastor_id) references pastors (id) on delete set null
) TABLESPACE pg_default;