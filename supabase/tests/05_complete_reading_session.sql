BEGIN;

SELECT plan(24);

INSERT INTO public.profiles(id, display_name, timezone)
VALUES
  ('00000000-0000-0000-0000-000000000010', 'completion-owner', 'Africa/Cairo'),
  ('00000000-0000-0000-0000-000000000011', 'completion-foreigner', 'Africa/Cairo')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.reading_plans(
  id, user_id, start_page, current_unread_page, daily_pages,
  sessions_per_day, timezone, effective_from
)
VALUES (
  '10000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000010',
  17, 17, 4, 2, 'Africa/Cairo', CURRENT_DATE
);

INSERT INTO public.khatmas(
  id, user_id, reading_plan_id, cycle_number, status, start_page
)
VALUES (
  '20000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000010',
  '10000000-0000-0000-0000-000000000010',
  1, 'active', 17
);

INSERT INTO public.daily_assignments(
  id, user_id, reading_plan_id, khatma_id, local_date,
  timezone, target_pages, status
)
VALUES (
  '30000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000010',
  '10000000-0000-0000-0000-000000000010',
  '20000000-0000-0000-0000-000000000010',
  CURRENT_DATE, 'Africa/Cairo', 4, 'pending'
);

INSERT INTO public.reading_sessions(
  id, user_id, daily_assignment_id, session_order,
  start_page, end_page, scheduled_for, status, first_opened_at, last_opened_page
)
VALUES
  (
    '40000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000010',
    '30000000-0000-0000-0000-000000000010',
    1, 17, 18, now(), 'pending', NULL, NULL
  ),
  (
    '40000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000010',
    '30000000-0000-0000-0000-000000000010',
    2, 19, 20, now(), 'in_progress', '2026-01-01T00:00:00Z', 19
  );

SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '{}', true);
SELECT throws_ok(
  $$SELECT * FROM public.complete_reading_session('40000000-0000-0000-0000-000000000010')$$,
  'UNAUTHENTICATED',
  'unauthenticated execution is rejected'
);

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000011","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT * FROM public.complete_reading_session('40000000-0000-0000-0000-000000000010')$$,
  'SESSION_NOT_FOUND',
  'a foreign session uses a not-found-style error'
);

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000010', true);
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000010","role":"authenticated"}', true);

CREATE TEMP TABLE first_late_completion AS
SELECT * FROM public.complete_reading_session(
  '40000000-0000-0000-0000-000000000011'
);

SELECT is(
  (SELECT rs.status::text FROM public.reading_sessions AS rs WHERE rs.id = '40000000-0000-0000-0000-000000000011'),
  'completed',
  'an in-progress session is completed'
);
SELECT ok(
  (SELECT rs.completed_at IS NOT NULL FROM public.reading_sessions AS rs WHERE rs.id = '40000000-0000-0000-0000-000000000011'),
  'completion stores completed_at'
);
SELECT is(
  (SELECT rs.first_opened_at FROM public.reading_sessions AS rs WHERE rs.id = '40000000-0000-0000-0000-000000000011'),
  '2026-01-01T00:00:00Z'::timestamptz,
  'completion preserves first_opened_at'
);
SELECT is(
  (SELECT rs.last_opened_page FROM public.reading_sessions AS rs WHERE rs.id = '40000000-0000-0000-0000-000000000011'),
  19::smallint,
  'completion preserves last_opened_page'
);
SELECT is(
  (SELECT da.status::text FROM public.daily_assignments AS da WHERE da.id = '30000000-0000-0000-0000-000000000010'),
  'in_progress',
  'the assignment remains in progress while a session remains'
);
SELECT is(
  (SELECT rp.current_unread_page FROM public.reading_plans AS rp WHERE rp.id = '10000000-0000-0000-0000-000000000010'),
  17::smallint,
  'out-of-order completion does not skip the unread gap'
);
SELECT is(
  (SELECT count(*) FROM public.reading_progress_events AS rpe WHERE rpe.reading_session_id = '40000000-0000-0000-0000-000000000011'),
  1::bigint,
  'the first completion creates exactly one progress event'
);

CREATE TEMP TABLE first_early_completion AS
SELECT * FROM public.complete_reading_session(
  '40000000-0000-0000-0000-000000000010'
);

SELECT is(
  (SELECT rs.status::text FROM public.reading_sessions AS rs WHERE rs.id = '40000000-0000-0000-0000-000000000010'),
  'completed',
  'a pending session can be completed without opening it first'
);
SELECT is(
  (SELECT rp.current_unread_page FROM public.reading_plans AS rp WHERE rp.id = '10000000-0000-0000-0000-000000000010'),
  21::smallint,
  'closing the gap advances through the later completed range'
);
SELECT is(
  (SELECT da.status::text FROM public.daily_assignments AS da WHERE da.id = '30000000-0000-0000-0000-000000000010'),
  'completed',
  'the final assignment session completes the assignment'
);
SELECT ok(
  (SELECT da.completed_at IS NOT NULL FROM public.daily_assignments AS da WHERE da.id = '30000000-0000-0000-0000-000000000010'),
  'a completed assignment stores completed_at'
);
SELECT is(
  (SELECT rpe.start_page FROM public.reading_progress_events AS rpe WHERE rpe.reading_session_id = '40000000-0000-0000-0000-000000000010'),
  17::smallint,
  'the progress event derives its page range from the session'
);

CREATE TEMP TABLE repeated_completion AS
SELECT * FROM public.complete_reading_session(
  '40000000-0000-0000-0000-000000000010'
);

SELECT is(
  (SELECT rc.already_completed FROM repeated_completion AS rc),
  true,
  'repeated completion returns idempotent success'
);
SELECT is(
  (SELECT count(*) FROM public.reading_progress_events AS rpe WHERE rpe.reading_session_id = '40000000-0000-0000-0000-000000000010'),
  1::bigint,
  'repeated completion does not duplicate the progress event'
);
SELECT is(
  (SELECT rs.completed_at FROM public.reading_sessions AS rs WHERE rs.id = '40000000-0000-0000-0000-000000000010'),
  (SELECT rpe.completed_at FROM public.reading_progress_events AS rpe WHERE rpe.reading_session_id = '40000000-0000-0000-0000-000000000010'),
  'repeated completion does not overwrite completed_at'
);

INSERT INTO public.reading_plans(
  id, user_id, start_page, current_unread_page, daily_pages,
  sessions_per_day, timezone, effective_from, status
)
VALUES (
  '10000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000010',
  604, 604, 1, 1, 'Africa/Cairo', CURRENT_DATE + 1, 'paused'
);

UPDATE public.reading_plans AS rp
SET status = 'replaced'
WHERE rp.id = '10000000-0000-0000-0000-000000000010';
UPDATE public.reading_plans AS rp
SET status = 'active'
WHERE rp.id = '10000000-0000-0000-0000-000000000012';
UPDATE public.khatmas AS k
SET status = 'abandoned', abandoned_at = now()
WHERE k.id = '20000000-0000-0000-0000-000000000010';

INSERT INTO public.khatmas(
  id, user_id, reading_plan_id, cycle_number, status, start_page
)
VALUES (
  '20000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000010',
  '10000000-0000-0000-0000-000000000012',
  2, 'active', 604
);

INSERT INTO public.daily_assignments(
  id, user_id, reading_plan_id, khatma_id, local_date,
  timezone, target_pages, status
)
VALUES (
  '30000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000010',
  '10000000-0000-0000-0000-000000000012',
  '20000000-0000-0000-0000-000000000012',
  CURRENT_DATE + 1, 'Africa/Cairo', 1, 'pending'
);

INSERT INTO public.reading_sessions(
  id, user_id, daily_assignment_id, session_order,
  start_page, end_page, scheduled_for, status
)
VALUES (
  '40000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000010',
  '30000000-0000-0000-0000-000000000012',
  1, 604, 604, now(), 'pending'
);

CREATE TEMP TABLE page_604_completion AS
SELECT * FROM public.complete_reading_session(
  '40000000-0000-0000-0000-000000000012'
);

SELECT is(
  (SELECT rp.current_unread_page FROM public.reading_plans AS rp WHERE rp.id = '10000000-0000-0000-0000-000000000012'),
  604::smallint,
  'current_unread_page never exceeds 604'
);
SELECT is(
  (SELECT k.status::text FROM public.khatmas AS k WHERE k.id = '20000000-0000-0000-0000-000000000012'),
  'completed',
  'completing page 604 completes the khatma'
);
SELECT ok(
  (SELECT k.completed_at IS NOT NULL FROM public.khatmas AS k WHERE k.id = '20000000-0000-0000-0000-000000000012'),
  'khatma completion stores completed_at'
);
SELECT is(
  (SELECT rp.status::text FROM public.reading_plans AS rp WHERE rp.id = '10000000-0000-0000-0000-000000000012'),
  'completed',
  'completing page 604 completes the plan'
);
SELECT ok(
  (SELECT rp.completed_at IS NOT NULL FROM public.reading_plans AS rp WHERE rp.id = '10000000-0000-0000-0000-000000000012'),
  'plan completion stores completed_at'
);
SELECT is(
  (SELECT count(*) FROM public.khatmas AS k WHERE k.user_id = '00000000-0000-0000-0000-000000000010'),
  2::bigint,
  'completion does not create a new khatma'
);
SELECT is(
  (SELECT p.plan_completed FROM page_604_completion AS p),
  true,
  'the RPC reports page 604 plan completion'
);

SELECT * FROM finish();

ROLLBACK;
