create table public.assignments (
  id uuid not null default gen_random_uuid (),
  pastor_id uuid not null,
  church_id uuid not null,
  event_type text not null default 'regular'::text,
  status_code text not null default 'active'::text,
  start_date date not null,
  end_date date null,
  notes text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  is_primary boolean null default true,
  precision_flag text null default 'exact'::text,
  handover_id uuid null,
  role_code text null,
  constraint assignments_pkey primary key (id),
  constraint assignments_handover_id_fkey foreign KEY (handover_id) references assignments (id),
  constraint assignments_pastor_id_fkey foreign KEY (pastor_id) references pastors (id) on delete RESTRICT,
  constraint assignments_church_id_fkey foreign KEY (church_id) references churches (id) on delete RESTRICT,
  constraint assignments_precision_flag_check check (
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
  ),
  constraint check_valid_dates check (
    (
      (end_date is null)
      or (start_date <= end_date)
    )
  ),
  constraint chk_assignment_status check (
    (
      status_code = any (
        array[
          'active'::text,
          'redirection'::text,
          'transferred'::text,
          'pullout'::text,
          'ended'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create unique INDEX IF not exists ux_active_assignment_per_pastor on public.assignments using btree (pastor_id) TABLESPACE pg_default
where
  (
    (status_code = 'active'::text)
    and (end_date is null)
  );

create unique INDEX IF not exists ux_active_assignment_per_church on public.assignments using btree (church_id) TABLESPACE pg_default
where
  (
    (status_code = 'active'::text)
    and (end_date is null)
  );

create unique INDEX IF not exists idx_unique_active_primary_assignment on public.assignments using btree (pastor_id) TABLESPACE pg_default
where
  (
    (end_date is null)
    and (is_primary = true)
  );