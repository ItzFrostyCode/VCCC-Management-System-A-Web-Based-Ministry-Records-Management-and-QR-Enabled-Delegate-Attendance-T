create table public.meal_attendance (
  id uuid not null default gen_random_uuid (),
  meal_id uuid not null,
  delegate_type text not null,
  delegate_id uuid not null,
  scanned_at timestamp with time zone not null default now(),
  constraint meal_attendance_pkey primary key (id),
  constraint uq_attendance_per_meal unique (meal_id, delegate_type, delegate_id),
  constraint meal_attendance_delegate_type_check check (
    (
      delegate_type = any (
        array['PASTOR'::text, 'WIFE'::text, 'DISCIPLE'::text]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_attendance_meal_id on public.meal_attendance using btree (meal_id) TABLESPACE pg_default;

create index IF not exists idx_attendance_delegate_id on public.meal_attendance using btree (delegate_id) TABLESPACE pg_default;