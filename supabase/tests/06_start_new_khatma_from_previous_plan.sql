BEGIN;

SELECT plan(32);

INSERT INTO public.profiles(id, display_name, timezone)
VALUES
  ('00000000-0000-0000-0000-000000000020', 'new-khatma-owner', 'Africa/Cairo'),
  ('00000000-0000-0000-0000-000000000021', 'no-completed-plan', 'Africa/Cairo'),
  ('00000000-0000-0000-0000-000000000022', 'missing-completed-khatma', 'Africa/Cairo'),
  ('00000000-0000-0000-0000-000000000023', 'bad-previous-schedule', 'Africa/Cairo'),
  ('00000000-0000-0000-0000-000000000024', 'bad-previous-timezone', 'Africa/Cairo'),
  ('00000000-0000-0000-0000-000000000025', 'active-khatma-only', 'Africa/Cairo')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.reading_plans(
  id, user_id, status, start_page, current_unread_page, daily_pages,
  sessions_per_day, timezone, effective_from, completed_at, created_at
)
VALUES
  (
    '10000000-0000-0000-0000-000000000020',
    '00000000-0000-0000-0000-000000000020',
    'completed', 17, 604, 3, 1, 'Africa/Cairo', '2026-01-01',
    '2026-02-01T10:00:00Z', '2026-01-01T10:00:00Z'
  ),
  (
    '10000000-0000-0000-0000-000000000021',
    '00000000-0000-0000-0000-000000000020',
    'completed', 101, 604, 6, 2, 'Africa/Cairo', '2026-03-01',
    '2026-07-25T10:00:00Z', '2026-03-01T10:00:00Z'
  ),
  (
    '10000000-0000-0000-0000-000000000022',
    '00000000-0000-0000-0000-000000000022',
    'completed', 1, 604, 2, 1, 'Africa/Cairo', '2026-01-01',
    '2026-07-24T10:00:00Z', '2026-01-01T10:00:00Z'
  ),
  (
    '10000000-0000-0000-0000-000000000023',
    '00000000-0000-0000-0000-000000000023',
    'completed', 1, 604, 4, 2, 'Africa/Cairo', '2026-01-01',
    '2026-07-24T10:00:00Z', '2026-01-01T10:00:00Z'
  ),
  (
    '10000000-0000-0000-0000-000000000024',
    '00000000-0000-0000-0000-000000000024',
    'completed', 1, 604, 1, 1, 'Invalid/Timezone', '2026-01-01',
    '2026-07-24T10:00:00Z', '2026-01-01T10:00:00Z'
  ),
  (
    '10000000-0000-0000-0000-000000000025',
    '00000000-0000-0000-0000-000000000025',
    'completed', 1, 604, 1, 1, 'Africa/Cairo', '2026-01-01',
    '2026-07-24T10:00:00Z', '2026-01-01T10:00:00Z'
  );

INSERT INTO public.plan_schedule_times(
  id, plan_id, session_order, scheduled_time
)
VALUES
  (
    '11000000-0000-0000-0000-000000000020',
    '10000000-0000-0000-0000-000000000020', 1, '08:00'
  ),
  (
    '11000000-0000-0000-0000-000000000021',
    '10000000-0000-0000-0000-000000000021', 1, '06:00'
  ),
  (
    '11000000-0000-0000-0000-000000000022',
    '10000000-0000-0000-0000-000000000021', 2, '18:30'
  ),
  (
    '11000000-0000-0000-0000-000000000023',
    '10000000-0000-0000-0000-000000000022', 1, '09:00'
  ),
  (
    '11000000-0000-0000-0000-000000000024',
    '10000000-0000-0000-0000-000000000023', 1, '09:00'
  ),
  (
    '11000000-0000-0000-0000-000000000025',
    '10000000-0000-0000-0000-000000000024', 1, '09:00'
  ),
  (
    '11000000-0000-0000-0000-000000000026',
    '10000000-0000-0000-0000-000000000025', 1, '09:00'
  );

INSERT INTO public.khatmas(
  id, user_id, reading_plan_id, cycle_number, status, start_page, completed_at
)
VALUES
  (
    '20000000-0000-0000-0000-000000000020',
    '00000000-0000-0000-0000-000000000020',
    '10000000-0000-0000-0000-000000000020',
    1, 'completed', 17, '2026-02-01T10:00:00Z'
  ),
  (
    '20000000-0000-0000-0000-000000000021',
    '00000000-0000-0000-0000-000000000020',
    '10000000-0000-0000-0000-000000000021',
    2, 'completed', 101, '2026-07-25T10:00:00Z'
  ),
  (
    '20000000-0000-0000-0000-000000000023',
    '00000000-0000-0000-0000-000000000023',
    '10000000-0000-0000-0000-000000000023',
    1, 'completed', 1, '2026-07-24T10:00:00Z'
  ),
  (
    '20000000-0000-0000-0000-000000000024',
    '00000000-0000-0000-0000-000000000024',
    '10000000-0000-0000-0000-000000000024',
    1, 'completed', 1, '2026-07-24T10:00:00Z'
  ),
  (
    '20000000-0000-0000-0000-000000000025',
    '00000000-0000-0000-0000-000000000025',
    '10000000-0000-0000-0000-000000000025',
    1, 'completed', 1, '2026-07-24T10:00:00Z'
  ),
  (
    '20000000-0000-0000-0000-000000000026',
    '00000000-0000-0000-0000-000000000025',
    '10000000-0000-0000-0000-000000000025',
    2, 'active', 1, NULL
  );

SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '{}', true);
SELECT throws_ok(
  $$SELECT * FROM public.start_new_khatma_from_previous_plan(CURRENT_DATE)$$,
  'UNAUTHENTICATED',
  'unauthenticated execution is rejected'
);

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000099', true);
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000099","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT * FROM public.start_new_khatma_from_previous_plan(CURRENT_DATE)$$,
  'PROFILE_NOT_FOUND',
  'a missing profile is rejected'
);

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000021', true);
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000021","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT * FROM public.start_new_khatma_from_previous_plan(CURRENT_DATE)$$,
  'COMPLETED_PLAN_NOT_FOUND',
  'a completed plan is required'
);

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000022', true);
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000022","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT * FROM public.start_new_khatma_from_previous_plan(CURRENT_DATE)$$,
  'COMPLETED_KHATMA_NOT_FOUND',
  'the completed plan must have a completed khatma'
);

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000023', true);
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000023","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT * FROM public.start_new_khatma_from_previous_plan(CURRENT_DATE)$$,
  'INVALID_PREVIOUS_PLAN_CONFIGURATION',
  'an incomplete previous schedule is rejected'
);

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000024', true);
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000024","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT * FROM public.start_new_khatma_from_previous_plan(CURRENT_DATE)$$,
  'INVALID_TIMEZONE',
  'an invalid saved timezone is rejected'
);

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000025', true);
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000025","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT * FROM public.start_new_khatma_from_previous_plan(CURRENT_DATE)$$,
  'ACTIVE_KHATMA_EXISTS',
  'an active khatma prevents creation even without an active plan'
);

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000020', true);
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000020","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT * FROM public.start_new_khatma_from_previous_plan(((now() AT TIME ZONE 'Africa/Cairo')::date - 1))$$,
  'INVALID_EFFECTIVE_DATE',
  'a past effective date is rejected in the saved timezone'
);

CREATE TEMP TABLE new_khatma_result AS
SELECT *
FROM public.start_new_khatma_from_previous_plan(
  (now() AT TIME ZONE 'Africa/Cairo')::date
);

SELECT isnt(
  (SELECT nkr.plan_id FROM new_khatma_result AS nkr),
  '10000000-0000-0000-0000-000000000021'::uuid,
  'the new plan has a new id'
);
SELECT ok(
  (SELECT nkr.khatma_id IS NOT NULL FROM new_khatma_result AS nkr),
  'the RPC returns the new khatma id'
);
SELECT is(
  (SELECT nkr.cycle_number FROM new_khatma_result AS nkr),
  3,
  'the cycle number increments from the user maximum'
);
SELECT is(
  (SELECT nkr.effective_from FROM new_khatma_result AS nkr),
  (now() AT TIME ZONE 'Africa/Cairo')::date,
  'the RPC returns the requested effective date'
);
SELECT is(
  (
    SELECT rp.status::text
    FROM public.reading_plans AS rp
    WHERE rp.id = (SELECT nkr.plan_id FROM new_khatma_result AS nkr)
  ),
  'active',
  'the new plan is active'
);
SELECT is(
  (
    SELECT rp.start_page
    FROM public.reading_plans AS rp
    WHERE rp.id = (SELECT nkr.plan_id FROM new_khatma_result AS nkr)
  ),
  1::smallint,
  'the new plan starts at page 1'
);
SELECT is(
  (
    SELECT rp.current_unread_page
    FROM public.reading_plans AS rp
    WHERE rp.id = (SELECT nkr.plan_id FROM new_khatma_result AS nkr)
  ),
  1::smallint,
  'the new plan unread frontier starts at page 1'
);
SELECT is(
  (
    SELECT rp.daily_pages
    FROM public.reading_plans AS rp
    WHERE rp.id = (SELECT nkr.plan_id FROM new_khatma_result AS nkr)
  ),
  6::smallint,
  'daily pages are copied from the most recent completed plan'
);
SELECT is(
  (
    SELECT rp.sessions_per_day
    FROM public.reading_plans AS rp
    WHERE rp.id = (SELECT nkr.plan_id FROM new_khatma_result AS nkr)
  ),
  2::smallint,
  'sessions per day are copied'
);
SELECT is(
  (
    SELECT rp.timezone
    FROM public.reading_plans AS rp
    WHERE rp.id = (SELECT nkr.plan_id FROM new_khatma_result AS nkr)
  ),
  'Africa/Cairo',
  'the saved timezone is copied'
);
SELECT results_eq(
  $$
    SELECT pst.session_order, pst.scheduled_time
    FROM public.plan_schedule_times AS pst
    WHERE pst.plan_id = (SELECT nkr.plan_id FROM new_khatma_result AS nkr)
    ORDER BY pst.session_order
  $$,
  $$
    VALUES
      (1::smallint, '06:00'::time),
      (2::smallint, '18:30'::time)
  $$,
  'the complete ordered schedule is copied'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM public.plan_schedule_times AS old_pst
    INNER JOIN public.plan_schedule_times AS new_pst
      ON new_pst.id = old_pst.id
    WHERE old_pst.plan_id = '10000000-0000-0000-0000-000000000021'
      AND new_pst.plan_id = (SELECT nkr.plan_id FROM new_khatma_result AS nkr)
  ),
  'copied schedule rows receive new ids'
);
SELECT is(
  (
    SELECT k.status::text
    FROM public.khatmas AS k
    WHERE k.id = (SELECT nkr.khatma_id FROM new_khatma_result AS nkr)
  ),
  'active',
  'the new khatma is active'
);
SELECT is(
  (
    SELECT k.start_page
    FROM public.khatmas AS k
    WHERE k.id = (SELECT nkr.khatma_id FROM new_khatma_result AS nkr)
  ),
  1::smallint,
  'the new khatma starts at page 1'
);
SELECT is(
  (
    SELECT rp.status::text || ':' || rp.current_unread_page::text
    FROM public.reading_plans AS rp
    WHERE rp.id = '10000000-0000-0000-0000-000000000021'
  ),
  'completed:604',
  'the previous plan remains completed and unchanged'
);
SELECT is(
  (
    SELECT k.status::text || ':' || k.cycle_number::text
    FROM public.khatmas AS k
    WHERE k.id = '20000000-0000-0000-0000-000000000021'
  ),
  'completed:2',
  'the previous khatma remains completed and unchanged'
);
SELECT is(
  (
    SELECT pg_catalog.count(*)
    FROM public.daily_assignments AS da
    WHERE da.reading_plan_id = (SELECT nkr.plan_id FROM new_khatma_result AS nkr)
  ),
  0::bigint,
  'starting a khatma does not create a daily assignment'
);
SELECT is(
  (
    SELECT pg_catalog.count(*)
    FROM public.reading_plans AS rp
    WHERE rp.user_id = '00000000-0000-0000-0000-000000000020'
      AND rp.status = 'active'
  ),
  1::bigint,
  'the user has exactly one active plan'
);
SELECT is(
  (
    SELECT pg_catalog.count(*)
    FROM public.khatmas AS k
    WHERE k.user_id = '00000000-0000-0000-0000-000000000020'
      AND k.status = 'active'
  ),
  1::bigint,
  'the user has exactly one active khatma'
);
SELECT throws_ok(
  $$SELECT * FROM public.start_new_khatma_from_previous_plan((now() AT TIME ZONE 'Africa/Cairo')::date)$$,
  'ACTIVE_PLAN_EXISTS',
  'a repeated request is rejected before creating duplicates'
);
SELECT is(
  (
    SELECT pg_catalog.count(*)
    FROM public.reading_plans AS rp
    WHERE rp.user_id = '00000000-0000-0000-0000-000000000020'
  ),
  3::bigint,
  'a repeated request creates no extra plan'
);
SELECT is(
  (
    SELECT pg_catalog.max(k.cycle_number)
    FROM public.khatmas AS k
    WHERE k.user_id = '00000000-0000-0000-0000-000000000020'
  ),
  3,
  'a repeated request does not advance the cycle again'
);
SELECT ok(
  pg_catalog.has_function_privilege(
    'authenticated',
    'public.start_new_khatma_from_previous_plan(date)',
    'EXECUTE'
  ),
  'authenticated users can execute the RPC'
);
SELECT ok(
  NOT pg_catalog.has_function_privilege(
    'anon',
    'public.start_new_khatma_from_previous_plan(date)',
    'EXECUTE'
  ),
  'anonymous users have no execute grant'
);

SELECT * FROM finish();

ROLLBACK;
