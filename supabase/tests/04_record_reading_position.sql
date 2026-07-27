BEGIN;

SELECT plan(15);

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

INSERT INTO public.profiles(id, display_name, timezone)
VALUES ('00000000-0000-0000-0000-000000000002', 'reader-test', 'Africa/Cairo')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.reading_plans(
  id,
  user_id,
  start_page,
  current_unread_page,
  daily_pages,
  sessions_per_day,
  timezone,
  effective_from
)
VALUES (
  '11111111-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  10,
  10,
  3,
  1,
  'Africa/Cairo',
  CURRENT_DATE
);

INSERT INTO public.khatmas(
  id,
  user_id,
  reading_plan_id,
  cycle_number,
  status,
  start_page
)
VALUES (
  '22222222-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  '11111111-0000-0000-0000-000000000002',
  1,
  'active',
  10
);

INSERT INTO public.daily_assignments(
  id,
  user_id,
  reading_plan_id,
  khatma_id,
  local_date,
  timezone,
  target_pages,
  status
)
VALUES (
  '33333333-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  '11111111-0000-0000-0000-000000000002',
  '22222222-0000-0000-0000-000000000002',
  CURRENT_DATE,
  'Africa/Cairo',
  3,
  'pending'
);

INSERT INTO public.reading_sessions(
  id,
  user_id,
  daily_assignment_id,
  session_order,
  start_page,
  end_page,
  scheduled_for
)
VALUES (
  '44444444-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  '33333333-0000-0000-0000-000000000002',
  1,
  10,
  12,
  now()
);

SELECT * FROM public.record_reading_position(
  '44444444-0000-0000-0000-000000000002',
  11
);

SELECT is(
  (SELECT rs.status::text FROM public.reading_sessions AS rs WHERE rs.id = '44444444-0000-0000-0000-000000000002'),
  'in_progress',
  'pending session becomes in_progress'
);
SELECT ok(
  (SELECT rs.first_opened_at IS NOT NULL FROM public.reading_sessions AS rs WHERE rs.id = '44444444-0000-0000-0000-000000000002'),
  'first_opened_at is set'
);
SELECT is(
  (SELECT rs.last_opened_page FROM public.reading_sessions AS rs WHERE rs.id = '44444444-0000-0000-0000-000000000002'),
  11::smallint,
  'last_opened_page is set'
);
SELECT ok(
  (SELECT rs.last_opened_at IS NOT NULL FROM public.reading_sessions AS rs WHERE rs.id = '44444444-0000-0000-0000-000000000002'),
  'last_opened_at is set'
);

UPDATE public.reading_sessions AS rs
SET first_opened_at = '2026-01-01T00:00:00Z'
WHERE rs.id = '44444444-0000-0000-0000-000000000002';

SELECT * FROM public.record_reading_position(
  '44444444-0000-0000-0000-000000000002',
  12
);

SELECT is(
  (SELECT rs.first_opened_at FROM public.reading_sessions AS rs WHERE rs.id = '44444444-0000-0000-0000-000000000002'),
  '2026-01-01T00:00:00Z'::timestamptz,
  'later calls preserve first_opened_at'
);
SELECT is(
  (SELECT rs.last_opened_page FROM public.reading_sessions AS rs WHERE rs.id = '44444444-0000-0000-0000-000000000002'),
  12::smallint,
  'later calls update last_opened_page'
);

UPDATE public.reading_sessions AS rs
SET
  status = 'completed',
  completed_at = '2026-01-02T00:00:00Z',
  last_opened_page = 12
WHERE rs.id = '44444444-0000-0000-0000-000000000002';

SELECT * FROM public.record_reading_position(
  '44444444-0000-0000-0000-000000000002',
  10
);

SELECT is(
  (SELECT rs.status::text FROM public.reading_sessions AS rs WHERE rs.id = '44444444-0000-0000-0000-000000000002'),
  'completed',
  'completed session is not reverted'
);
SELECT is(
  (SELECT rs.last_opened_page FROM public.reading_sessions AS rs WHERE rs.id = '44444444-0000-0000-0000-000000000002'),
  12::smallint,
  'completed session stays read-only'
);
SELECT is(
  (SELECT rs.completed_at FROM public.reading_sessions AS rs WHERE rs.id = '44444444-0000-0000-0000-000000000002'),
  '2026-01-02T00:00:00Z'::timestamptz,
  'completed_at is preserved'
);

UPDATE public.reading_sessions AS rs
SET status = 'in_progress', completed_at = NULL
WHERE rs.id = '44444444-0000-0000-0000-000000000002';

SELECT throws_ok(
  $$SELECT * FROM public.record_reading_position('44444444-0000-0000-0000-000000000002', 9)$$,
  'PAGE_OUT_OF_RANGE',
  'out-of-range page is rejected'
);
SELECT is(
  (SELECT rp.current_unread_page FROM public.reading_plans AS rp WHERE rp.id = '11111111-0000-0000-0000-000000000002'),
  10::smallint,
  'current_unread_page is unchanged'
);
SELECT is(
  (SELECT da.status::text FROM public.daily_assignments AS da WHERE da.id = '33333333-0000-0000-0000-000000000002'),
  'pending',
  'daily assignment status is unchanged'
);
SELECT is(
  (SELECT count(*) FROM public.reading_progress_events AS rpe WHERE rpe.user_id = '00000000-0000-0000-0000-000000000002'),
  0::bigint,
  'no reading progress event is created'
);

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT * FROM public.record_reading_position('44444444-0000-0000-0000-000000000002', 10)$$,
  'SESSION_NOT_FOUND',
  'another user cannot access the session'
);

SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '{}', true);
SELECT throws_ok(
  $$SELECT * FROM public.record_reading_position('44444444-0000-0000-0000-000000000002', 10)$$,
  'UNAUTHENTICATED',
  'unauthenticated execution is rejected'
);

SELECT * FROM finish();

ROLLBACK;
