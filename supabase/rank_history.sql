create table public.rank_history (
  id uuid not null default extensions.uuid_generate_v4 (),
  pastor_id uuid not null,
  rank_code text not null,
  effective_date date null,
  precision_flag text null default 'exact'::text,
  notes text null,
  source text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint rank_history_pkey primary key (id),
  constraint rank_history_pastor_id_fkey foreign KEY (pastor_id) references pastors (id) on delete CASCADE,
  constraint rank_history_precision_flag_check check (
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