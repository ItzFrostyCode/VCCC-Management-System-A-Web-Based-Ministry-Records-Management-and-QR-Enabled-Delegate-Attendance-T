create table public.church_locations (
  id uuid not null default extensions.uuid_generate_v4 (),
  church_id uuid not null,
  address text not null,
  start_date date not null,
  end_date date null,
  precision_flag text null default 'exact'::text,
  notes text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint church_locations_pkey primary key (id),
  constraint church_locations_church_id_fkey foreign KEY (church_id) references churches (id) on delete CASCADE,
  constraint church_locations_precision_flag_check check (
    (
      precision_flag = any (
        array[
          'exact'::text,
          'month'::text,
          'year'::text,
          'unknown'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;