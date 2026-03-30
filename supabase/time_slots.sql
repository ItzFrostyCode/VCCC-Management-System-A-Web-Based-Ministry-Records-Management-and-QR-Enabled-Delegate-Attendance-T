create table public.time_slots (
  id uuid not null default gen_random_uuid (),
  conference_id uuid not null,
  name text not null,
  start_time time without time zone not null,
  end_time time without time zone not null,
  created_at timestamp with time zone not null default now(),
  constraint time_slots_pkey primary key (id),
  constraint time_slots_conference_id_name_key unique (conference_id, name),
  constraint time_slots_conference_id_fkey foreign KEY (conference_id) references conferences (id) on delete CASCADE
) TABLESPACE pg_default;