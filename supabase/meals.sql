create table public.meals (
  id uuid not null default gen_random_uuid (),
  conference_id uuid not null,
  day_id uuid not null,
  slot_id uuid not null,
  name text null,
  notes text null,
  created_at timestamp with time zone not null default now(),
  constraint meals_pkey primary key (id),
  constraint meals_conference_id_day_id_slot_id_key unique (conference_id, day_id, slot_id),
  constraint meals_conference_id_fkey foreign KEY (conference_id) references conferences (id) on delete CASCADE,
  constraint meals_day_id_fkey foreign KEY (day_id) references conference_days (id) on delete CASCADE,
  constraint meals_slot_id_fkey foreign KEY (slot_id) references time_slots (id) on delete CASCADE
) TABLESPACE pg_default;