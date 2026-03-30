create table public.attendance (
  id uuid not null default gen_random_uuid (),
  conference_id uuid not null,
  day_id uuid not null,
  slot_id uuid not null,
  delegate_id uuid not null,
  delegate_type text not null,
  scanned_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  constraint attendance_pkey primary key (id),
  constraint attendance_conference_id_day_id_slot_id_delegate_id_delegat_key unique (
    conference_id,
    day_id,
    slot_id,
    delegate_id,
    delegate_type
  ),
  constraint attendance_conference_id_fkey foreign KEY (conference_id) references conferences (id) on delete CASCADE,
  constraint attendance_day_id_fkey foreign KEY (day_id) references conference_days (id) on delete CASCADE,
  constraint attendance_slot_id_fkey foreign KEY (slot_id) references time_slots (id) on delete CASCADE,
  constraint chk_delegate_type check (
    (
      delegate_type = any (
        array['PASTOR'::text, 'WIFE'::text, 'DISCIPLE'::text]
      )
    )
  )
) TABLESPACE pg_default;