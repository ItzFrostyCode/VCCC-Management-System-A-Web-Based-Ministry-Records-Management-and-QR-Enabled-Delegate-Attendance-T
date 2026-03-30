create table public.disciples (
  id uuid not null default gen_random_uuid (),
  full_name text not null,
  is_deleted boolean not null default false,
  created_at timestamp with time zone not null default now(),
  church_id uuid null,
  disciple_image_url text null,
  constraint disciples_pkey primary key (id),
  constraint disciples_church_id_fkey foreign KEY (church_id) references churches (id) on delete set null
) TABLESPACE pg_default;