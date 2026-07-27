BEGIN;

SELECT plan(18);

SELECT ok(
  pg_catalog.to_regclass(
    'public.idx_progress_user_completed_id'
  ) IS NOT NULL,
  'history pagination has a user and descending completion index'
);
SELECT ok(
  pg_catalog.to_regclass(
    'public.idx_progress_khatma_completed_id'
  ) IS NOT NULL,
  'khatma timelines have a chronological index'
);
SELECT ok(
  pg_catalog.to_regclass(
    'public.idx_khatmas_user_completed_id'
  ) IS NOT NULL,
  'khatma archives have a user and completion index'
);

SELECT ok(
  pg_catalog.has_function_privilege(
    'authenticated',
    'public.get_reading_history_summary()',
    'EXECUTE'
  ),
  'authenticated users can read their history summary'
);
SELECT ok(
  pg_catalog.has_function_privilege(
    'authenticated',
    'public.get_khatma_history_archive()',
    'EXECUTE'
  ),
  'authenticated users can read their khatma archive'
);
SELECT ok(
  pg_catalog.has_function_privilege(
    'authenticated',
    'public.get_khatma_history_details(uuid)',
    'EXECUTE'
  ),
  'authenticated users can read owned khatma details'
);
SELECT ok(
  NOT pg_catalog.has_function_privilege(
    'anon',
    'public.get_reading_history_summary()',
    'EXECUTE'
  ),
  'anonymous users cannot read history summaries'
);
SELECT ok(
  NOT pg_catalog.has_function_privilege(
    'anon',
    'public.get_khatma_history_archive()',
    'EXECUTE'
  ),
  'anonymous users cannot read khatma archives'
);
SELECT ok(
  NOT pg_catalog.has_function_privilege(
    'anon',
    'public.get_khatma_history_details(uuid)',
    'EXECUTE'
  ),
  'anonymous users cannot read khatma details'
);

INSERT INTO public.profiles(id, display_name, timezone)
VALUES
  (
    '00000000-0000-0000-0000-000000000040',
    'history-owner',
    'Africa/Cairo'
  ),
  (
    '00000000-0000-0000-0000-000000000041',
    'history-other',
    'Africa/Cairo'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.reading_plans(
  id, user_id, status, start_page, current_unread_page, daily_pages,
  sessions_per_day, timezone, effective_from, completed_at
)
VALUES
  (
    '10000000-0000-0000-0000-000000000040',
    '00000000-0000-0000-0000-000000000040',
    'completed', 17, 604, 3, 1, 'Africa/Cairo',
    '2026-07-01', '2026-07-20T10:00:00Z'
  ),
  (
    '10000000-0000-0000-0000-000000000041',
    '00000000-0000-0000-0000-000000000040',
    'active', 1, 3, 2, 1, 'Africa/Cairo',
    '2026-07-21', NULL
  ),
  (
    '10000000-0000-0000-0000-000000000042',
    '00000000-0000-0000-0000-000000000041',
    'active', 1, 2, 1, 1, 'Africa/Cairo',
    '2026-07-21', NULL
  );

INSERT INTO public.khatmas(
  id, user_id, reading_plan_id, cycle_number, status, start_page,
  started_at, completed_at
)
VALUES
  (
    '20000000-0000-0000-0000-000000000040',
    '00000000-0000-0000-0000-000000000040',
    '10000000-0000-0000-0000-000000000040',
    1, 'completed', 17,
    '2026-01-01T00:00:00Z', '2026-07-20T10:00:00Z'
  ),
  (
    '20000000-0000-0000-0000-000000000041',
    '00000000-0000-0000-0000-000000000040',
    '10000000-0000-0000-0000-000000000041',
    2, 'active', 1,
    '2026-07-21T00:00:00Z', NULL
  ),
  (
    '20000000-0000-0000-0000-000000000042',
    '00000000-0000-0000-0000-000000000041',
    '10000000-0000-0000-0000-000000000042',
    1, 'active', 1,
    '2026-07-21T00:00:00Z', NULL
  );

INSERT INTO public.daily_assignments(
  id, user_id, reading_plan_id, khatma_id, local_date,
  timezone, target_pages, status, completed_at
)
VALUES
  (
    '30000000-0000-0000-0000-000000000040',
    '00000000-0000-0000-0000-000000000040',
    '10000000-0000-0000-0000-000000000040',
    '20000000-0000-0000-0000-000000000040',
    '2026-07-20', 'Africa/Cairo', 3, 'completed',
    '2026-07-20T10:00:00Z'
  ),
  (
    '30000000-0000-0000-0000-000000000041',
    '00000000-0000-0000-0000-000000000040',
    '10000000-0000-0000-0000-000000000041',
    '20000000-0000-0000-0000-000000000041',
    '2026-07-21', 'Africa/Cairo', 2, 'completed',
    '2026-07-21T10:00:00Z'
  ),
  (
    '30000000-0000-0000-0000-000000000042',
    '00000000-0000-0000-0000-000000000041',
    '10000000-0000-0000-0000-000000000042',
    '20000000-0000-0000-0000-000000000042',
    '2026-07-21', 'Africa/Cairo', 1, 'completed',
    '2026-07-21T11:00:00Z'
  );

INSERT INTO public.reading_sessions(
  id, user_id, daily_assignment_id, session_order,
  start_page, end_page, scheduled_for, status, completed_at
)
VALUES
  (
    '40000000-0000-0000-0000-000000000040',
    '00000000-0000-0000-0000-000000000040',
    '30000000-0000-0000-0000-000000000040',
    1, 17, 19, '2026-07-20T08:00:00Z',
    'completed', '2026-07-20T10:00:00Z'
  ),
  (
    '40000000-0000-0000-0000-000000000041',
    '00000000-0000-0000-0000-000000000040',
    '30000000-0000-0000-0000-000000000041',
    1, 1, 2, '2026-07-21T08:00:00Z',
    'completed', '2026-07-21T10:00:00Z'
  ),
  (
    '40000000-0000-0000-0000-000000000042',
    '00000000-0000-0000-0000-000000000041',
    '30000000-0000-0000-0000-000000000042',
    1, 1, 1, '2026-07-21T09:00:00Z',
    'completed', '2026-07-21T11:00:00Z'
  );

INSERT INTO public.reading_progress_events(
  id, user_id, reading_plan_id, khatma_id, daily_assignment_id,
  reading_session_id, start_page, end_page, completed_at
)
VALUES
  (
    '50000000-0000-0000-0000-000000000040',
    '00000000-0000-0000-0000-000000000040',
    '10000000-0000-0000-0000-000000000040',
    '20000000-0000-0000-0000-000000000040',
    '30000000-0000-0000-0000-000000000040',
    '40000000-0000-0000-0000-000000000040',
    17, 19, '2026-07-20T10:00:00Z'
  ),
  (
    '50000000-0000-0000-0000-000000000041',
    '00000000-0000-0000-0000-000000000040',
    '10000000-0000-0000-0000-000000000041',
    '20000000-0000-0000-0000-000000000041',
    '30000000-0000-0000-0000-000000000041',
    '40000000-0000-0000-0000-000000000041',
    1, 2, '2026-07-21T10:00:00Z'
  ),
  (
    '50000000-0000-0000-0000-000000000042',
    '00000000-0000-0000-0000-000000000041',
    '10000000-0000-0000-0000-000000000042',
    '20000000-0000-0000-0000-000000000042',
    '30000000-0000-0000-0000-000000000042',
    '40000000-0000-0000-0000-000000000042',
    1, 1, '2026-07-21T11:00:00Z'
  );

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000040',
  true
);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000040","role":"authenticated"}',
  true
);

SELECT is(
  (
    SELECT rhs.total_completed_pages
    FROM public.get_reading_history_summary() AS rhs
  ),
  5::bigint,
  'summary pages come only from the owner progress events'
);
SELECT is(
  (
    SELECT rhs.total_completed_sessions
    FROM public.get_reading_history_summary() AS rhs
  ),
  2::bigint,
  'summary sessions come only from owner progress events'
);
SELECT is(
  (
    SELECT rhs.total_completed_khatmas
    FROM public.get_reading_history_summary() AS rhs
  ),
  1::bigint,
  'summary khatmas include only the owner completed khatmas'
);
SELECT is(
  (
    SELECT pg_catalog.count(*)
    FROM public.get_khatma_history_archive() AS kha
  ),
  2::bigint,
  'archive returns the owner active and completed khatmas'
);
SELECT is(
  (
    SELECT pg_catalog.count(*)
    FROM public.get_khatma_history_archive() AS kha
    WHERE kha.khatma_id =
      '20000000-0000-0000-0000-000000000042'
  ),
  0::bigint,
  'archive excludes another user khatma'
);
SELECT is(
  (
    SELECT khd.completed_pages
    FROM public.get_khatma_history_details(
      '20000000-0000-0000-0000-000000000041'
    ) AS khd
  ),
  2::bigint,
  'owned khatma details aggregate only its pages'
);
SELECT is(
  (
    SELECT khd.completed_sessions
    FROM public.get_khatma_history_details(
      '20000000-0000-0000-0000-000000000041'
    ) AS khd
  ),
  1::bigint,
  'owned khatma details aggregate only its sessions'
);
SELECT is(
  (
    SELECT pg_catalog.count(*)
    FROM public.get_khatma_history_details(
      '20000000-0000-0000-0000-000000000042'
    ) AS khd
  ),
  0::bigint,
  'foreign khatma details are indistinguishable from not found'
);
SELECT results_eq(
  $$
    SELECT rpe.id
    FROM public.reading_progress_events AS rpe
    WHERE rpe.user_id =
      '00000000-0000-0000-0000-000000000040'
    ORDER BY rpe.completed_at DESC, rpe.id DESC
  $$,
  $$
    VALUES
      ('50000000-0000-0000-0000-000000000041'::uuid),
      ('50000000-0000-0000-0000-000000000040'::uuid)
  $$,
  'history events have stable completion and id ordering'
);

SELECT * FROM finish();

ROLLBACK;
