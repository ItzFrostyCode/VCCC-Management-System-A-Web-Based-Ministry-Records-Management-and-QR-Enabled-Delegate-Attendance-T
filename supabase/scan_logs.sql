create table public.scan_logs (
  id uuid not null default gen_random_uuid (),
  conference_id uuid null,
  day_id uuid null,
  slot_id uuid null,
  delegate_id uuid null,
  delegate_type text null,
  status text not null,
  message text null,
  timestamp timestamp with time zone not null default now(),
  constraint scan_logs_pkey primary key (id),
  constraint scan_logs_conference_id_fkey foreign KEY (conference_id) references conferences (id) on delete CASCADE,
  constraint scan_logs_day_id_fkey foreign KEY (day_id) references conference_days (id) on delete CASCADE,
  constraint scan_logs_slot_id_fkey foreign KEY (slot_id) references time_slots (id) on delete CASCADE,
  constraint chk_scan_status check (
    (
      status = any (
        array[
          'SUCCESS'::text,
          'ALREADY_SCANNED'::text,
          'INVALID_TIME'::text,
          'INVALID_DELEGATE'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;