create table public.training_log (
  id uuid not null default extensions.uuid_generate_v4 (),
  pastor_id uuid not null,
  course_name text not null,
  status_code text not null,
  completion_date date null,
  precision_flag text null default 'exact'::text,
  blocker_flag boolean null default false,
  notes text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint training_log_pkey primary key (id),
  constraint training_log_pastor_id_fkey foreign KEY (pastor_id) references pastors (id) on delete CASCADE,
  constraint training_log_precision_flag_check check (
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
  constraint training_log_status_code_check check (
    (
      status_code = any (
        array[
          'Completed'::text,
          'Failed'::text,
          'In-Progress'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;