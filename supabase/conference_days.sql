create table public.conference_days (
  id uuid not null default gen_random_uuid (),
  conference_id uuid not null,
  day_index integer not null,
  date date not null,
  created_at timestamp with time zone not null default now(),
  constraint conference_days_pkey primary key (id),
  constraint conference_days_conference_id_day_index_key unique (conference_id, day_index),
  constraint conference_days_conference_id_fkey foreign KEY (conference_id) references conferences (id) on delete CASCADE
) TABLESPACE pg_default;