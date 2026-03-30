create table public.pastors (
  id uuid not null default gen_random_uuid (),
  full_name text not null,
  contact_number text null,
  birthdate date null,
  pastoring_start_date date null,
  pastor_image_url text null,
  wife_name text null,
  wife_birthdate date null,
  wife_image_url text null,
  notes text null,
  current_status_code text not null default 'undeployed'::text,
  is_deleted boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint pastors_pkey primary key (id),
  constraint chk_pastor_status check (
    (
      current_status_code = any (
        array[
          'active'::text,
          'redirection'::text,
          'transferred'::text,
          'pullout'::text,
          'undeployed'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;