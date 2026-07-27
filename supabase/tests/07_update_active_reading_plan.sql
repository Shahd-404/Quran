BEGIN;

SELECT plan(41);

INSERT INTO public.profiles(id, display_name, timezone)
VALUES
  ('00000000-0000-0000-0000-000000000030', 'plan-settings-owner', 'Africa/Cairo'),
  ('00000000-0000-0000-0000-000000000031', 'plan-settings-no-plan', 'Africa/Cairo')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.reading_plans(
  id, user_id, status, start_page, current_unread_page, daily_pages,
  sessions_per_day, timezone, effective_from
)
VALUES (
  '10000000-0000-0000-0000-000000000030',
  '00000000-0000-0000-0000-000000000030',
  'active', 10, 10, 4, 2, 'Africa/Cairo',
  (now() AT TIME ZONE 'Africa/Cairo')::date - 10
);

INSERT INTO public.plan_schedule_times(
  id, plan_id, session_order, scheduled_time
)
VALUES
  (
    '11000000-0000-0000-0000-000000000030',
    '10000000-0000-0000-0000-000000000030',
    1, '08:00'
  ),
  (
    '11000000-0000-0000-0000-000000000031',
    '10000000-0000-0000-0000-000000000030',
    2, '18:00'
  );

INSERT INTO public.khatmas(
  id, user_id, reading_plan_id, cycle_number, status, start_page
)
VALUES (
  '20000000-0000-0000-0000-000000000030',
  '00000000-0000-0000-0000-000000000030',
  '10000000-0000-0000-0000-000000000030',
  3, 'active', 10
);

INSERT INTO public.daily_assignments(
  id, user_id, reading_plan_id, khatma_id, local_date,
  timezone, target_pages, status
)
VALUES (
  '30000000-0000-0000-0000-000000000030',
  '00000000-0000-0000-0000-000000000030',
  '10000000-0000-0000-0000-000000000030',
  '20000000-0000-0000-0000-000000000030',
  (now() AT TIME ZONE 'Africa/Cairo')::date - 1,
  'Africa/Cairo', 4, 'in_progress'
);

INSERT INTO public.reading_sessions(
  id, user_id, daily_assignment_id, session_order,
  start_page, end_page, scheduled_for, status,
  first_opened_at, last_opened_page
)
VALUES
  (
    '40000000-0000-0000-0000-000000000030',
    '00000000-0000-0000-0000-000000000030',
    '30000000-0000-0000-0000-000000000030',
    1, 10, 11,
    (((now() AT TIME ZONE 'Africa/Cairo')::date - 1) + '08:00'::time)
      AT TIME ZONE 'Africa/Cairo',
    'completed', '2026-07-26T08:05:00Z', 11
  ),
  (
    '40000000-0000-0000-0000-000000000031',
    '00000000-0000-0000-0000-000000000030',
    '30000000-0000-0000-0000-000000000030',
    2, 12, 13,
    (((now() AT TIME ZONE 'Africa/Cairo')::date - 1) + '18:00'::time)
      AT TIME ZONE 'Africa/Cairo',
    'in_progress', '2026-07-26T18:05:00Z', 12
  );

SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '{}', true);
SELECT throws_ok(
  $$
    SELECT *
    FROM public.update_active_reading_plan(
      6,
      '[{"sessionOrder":1,"scheduledTime":"06:00"}]'::jsonb
    )
  $$,
  'UNAUTHENTICATED',
  'unauthenticated execution is rejected'
);

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000099', true);
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000099","role":"authenticated"}', true);
SELECT throws_ok(
  $$
    SELECT *
    FROM public.update_active_reading_plan(
      6,
      '[{"sessionOrder":1,"scheduledTime":"06:00"}]'::jsonb
    )
  $$,
  'PROFILE_NOT_FOUND',
  'a profile is required'
);

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000031', true);
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000031","role":"authenticated"}', true);
SELECT throws_ok(
  $$
    SELECT *
    FROM public.update_active_reading_plan(
      6,
      '[{"sessionOrder":1,"scheduledTime":"06:00"}]'::jsonb
    )
  $$,
  'ACTIVE_PLAN_NOT_FOUND',
  'an active plan is required'
);

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000030', true);
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000030","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.update_active_reading_plan(0, '[{"sessionOrder":1,"scheduledTime":"06:00"}]'::jsonb)$$,
  'INVALID_DAILY_PAGES',
  'zero daily pages is rejected'
);
SELECT throws_ok(
  $$SELECT * FROM public.update_active_reading_plan(605, '[{"sessionOrder":1,"scheduledTime":"06:00"}]'::jsonb)$$,
  'INVALID_DAILY_PAGES',
  'daily pages above 604 are rejected'
);
SELECT throws_ok(
  $$SELECT * FROM public.update_active_reading_plan(6, '[]'::jsonb)$$,
  'INVALID_SESSIONS',
  'an empty session list is rejected'
);
SELECT throws_ok(
  $$
    SELECT *
    FROM public.update_active_reading_plan(
      1,
      '[
        {"sessionOrder":1,"scheduledTime":"06:00"},
        {"sessionOrder":2,"scheduledTime":"18:00"}
      ]'::jsonb
    )
  $$,
  'INVALID_SESSIONS',
  'sessions cannot exceed daily pages'
);
SELECT throws_ok(
  $$
    SELECT *
    FROM public.update_active_reading_plan(
      6,
      '[{"sessionOrder":2,"scheduledTime":"06:00"}]'::jsonb
    )
  $$,
  'INVALID_SESSIONS',
  'session orders must be consecutive from one'
);
SELECT throws_ok(
  $$
    SELECT *
    FROM public.update_active_reading_plan(
      6,
      '[
        {"sessionOrder":1,"scheduledTime":"18:00"},
        {"sessionOrder":2,"scheduledTime":"06:00"}
      ]'::jsonb
    )
  $$,
  'INVALID_SCHEDULE',
  'schedule times must be chronological'
);
SELECT throws_ok(
  $$
    SELECT *
    FROM public.update_active_reading_plan(
      6,
      '[{"sessionOrder":1,"scheduledTime":"25:00"}]'::jsonb
    )
  $$,
  'INVALID_SCHEDULE',
  'invalid schedule times are rejected'
);

SELECT throws_ok(
  $$
    SELECT *
    FROM public.update_active_reading_plan(
      7,
      '[
        {"sessionOrder":1,"scheduledTime":"06:00"},
        {"sessionOrder":2,"scheduledTime":"08:00"},
        {"sessionOrder":3,"scheduledTime":"10:00"},
        {"sessionOrder":4,"scheduledTime":"12:00"},
        {"sessionOrder":5,"scheduledTime":"14:00"},
        {"sessionOrder":6,"scheduledTime":"16:00"},
        {"sessionOrder":7,"scheduledTime":"18:00"}
      ]'::jsonb
    )
  $$,
  'INVALID_SESSIONS',
  'more than six sessions are rejected'
);
SELECT throws_ok(
  $$
    SELECT *
    FROM public.update_active_reading_plan(
      6,
      '[
        {"sessionOrder":1,"scheduledTime":"08:00"},
        {"sessionOrder":2,"scheduledTime":"08:00"}
      ]'::jsonb
    )
  $$,
  'INVALID_SCHEDULE',
  'duplicate schedule times are rejected'
);

CREATE FUNCTION public.fail_plan_schedule_insert_for_test()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF NEW.scheduled_time = '23:00'::time THEN
    RAISE EXCEPTION 'forced schedule insert failure'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER fail_plan_schedule_insert_for_test
BEFORE INSERT ON public.plan_schedule_times
FOR EACH ROW
EXECUTE FUNCTION public.fail_plan_schedule_insert_for_test();

SELECT throws_ok(
  $$
    SELECT *
    FROM public.update_active_reading_plan(
      5,
      '[
        {"sessionOrder":1,"scheduledTime":"09:00"},
        {"sessionOrder":2,"scheduledTime":"23:00"}
      ]'::jsonb
    )
  $$,
  'PLAN_UPDATE_CONFLICT',
  'a failed schedule insert reports a stable conflict'
);
SELECT is(
  (
    SELECT rp.daily_pages::text || ':' || rp.sessions_per_day::text
    FROM public.reading_plans AS rp
    WHERE rp.id = '10000000-0000-0000-0000-000000000030'
  ),
  '4:2',
  'a failed schedule insert rolls back the plan update'
);
SELECT results_eq(
  $$
    SELECT pst.session_order, pst.scheduled_time
    FROM public.plan_schedule_times AS pst
    WHERE pst.plan_id = '10000000-0000-0000-0000-000000000030'
    ORDER BY pst.session_order
  $$,
  $$
    VALUES
      (1::smallint, '08:00'::time),
      (2::smallint, '18:00'::time)
  $$,
  'a failed schedule insert restores the old schedule'
);

DROP TRIGGER fail_plan_schedule_insert_for_test
ON public.plan_schedule_times;
DROP FUNCTION public.fail_plan_schedule_insert_for_test();

CREATE TEMP TABLE updated_plan_result AS
SELECT *
FROM public.update_active_reading_plan(
  6,
  '[
    {"sessionOrder":1,"scheduledTime":"06:00"},
    {"sessionOrder":2,"scheduledTime":"12:00"},
    {"sessionOrder":3,"scheduledTime":"20:00"}
  ]'::jsonb
);

SELECT is(
  (SELECT upr.plan_id FROM updated_plan_result AS upr),
  '10000000-0000-0000-0000-000000000030'::uuid,
  'the RPC returns the owned active plan'
);
SELECT is(
  (SELECT upr.daily_pages FROM updated_plan_result AS upr),
  6::smallint,
  'the RPC returns the new daily page count'
);
SELECT is(
  (SELECT upr.sessions_per_day FROM updated_plan_result AS upr),
  3::smallint,
  'the RPC returns the new session count'
);
SELECT ok(
  (SELECT upr.updated_at IS NOT NULL FROM updated_plan_result AS upr),
  'the RPC returns an update timestamp'
);
SELECT is(
  (
    SELECT rp.daily_pages
    FROM public.reading_plans AS rp
    WHERE rp.id = '10000000-0000-0000-0000-000000000030'
  ),
  6::smallint,
  'the active plan stores the new daily page count'
);
SELECT is(
  (
    SELECT rp.sessions_per_day
    FROM public.reading_plans AS rp
    WHERE rp.id = '10000000-0000-0000-0000-000000000030'
  ),
  3::smallint,
  'the active plan stores the new session count'
);
SELECT is(
  (
    SELECT rp.status::text || ':' || rp.start_page::text || ':' ||
      rp.current_unread_page::text
    FROM public.reading_plans AS rp
    WHERE rp.id = '10000000-0000-0000-0000-000000000030'
  ),
  'active:10:10',
  'status, start page, and unread page remain unchanged'
);
SELECT is(
  (
    SELECT rp.timezone || ':' || rp.effective_from::text
    FROM public.reading_plans AS rp
    WHERE rp.id = '10000000-0000-0000-0000-000000000030'
  ),
  'Africa/Cairo:' ||
    ((now() AT TIME ZONE 'Africa/Cairo')::date - 10)::text,
  'timezone and effective date remain unchanged'
);
SELECT results_eq(
  $$
    SELECT pst.session_order, pst.scheduled_time
    FROM public.plan_schedule_times AS pst
    WHERE pst.plan_id = '10000000-0000-0000-0000-000000000030'
    ORDER BY pst.session_order
  $$,
  $$
    VALUES
      (1::smallint, '06:00'::time),
      (2::smallint, '12:00'::time),
      (3::smallint, '20:00'::time)
  $$,
  'the active plan schedule is replaced exactly'
);
SELECT is(
  (
    SELECT count(*)
    FROM public.plan_schedule_times AS pst
    WHERE pst.plan_id = '10000000-0000-0000-0000-000000000030'
  ),
  3::bigint,
  'no duplicate schedule rows are created'
);
SELECT is(
  (
    SELECT k.status::text || ':' || k.start_page::text || ':' ||
      k.cycle_number::text
    FROM public.khatmas AS k
    WHERE k.id = '20000000-0000-0000-0000-000000000030'
  ),
  'active:10:3',
  'the active khatma remains unchanged'
);
SELECT is(
  (
    SELECT count(*)
    FROM public.daily_assignments AS da
    WHERE da.reading_plan_id = '10000000-0000-0000-0000-000000000030'
  ),
  1::bigint,
  'the save creates no assignment'
);
SELECT is(
  (
    SELECT da.target_pages::text || ':' || da.status::text || ':' ||
      da.local_date::text || ':' || da.timezone
    FROM public.daily_assignments AS da
    WHERE da.id = '30000000-0000-0000-0000-000000000030'
  ),
  '4:in_progress:' ||
    ((now() AT TIME ZONE 'Africa/Cairo')::date - 1)::text ||
    ':Africa/Cairo',
  'the existing assignment pages, state, date, and timezone remain unchanged'
);
SELECT ok(
  (
    SELECT da.completed_at IS NULL
    FROM public.daily_assignments AS da
    WHERE da.id = '30000000-0000-0000-0000-000000000030'
  ),
  'the existing assignment completion timestamp remains unchanged'
);
SELECT is(
  (
    SELECT count(*)
    FROM public.reading_sessions AS rs
    WHERE rs.daily_assignment_id = '30000000-0000-0000-0000-000000000030'
  ),
  2::bigint,
  'the existing assignment keeps the same session count'
);
SELECT is(
  (
    SELECT rs.start_page::text || ':' || rs.end_page::text || ':' ||
      (rs.scheduled_for AT TIME ZONE 'Africa/Cairo')::time::text || ':' ||
      rs.status::text || ':' || rs.last_opened_page::text
    FROM public.reading_sessions AS rs
    WHERE rs.id = '40000000-0000-0000-0000-000000000030'
  ),
  '10:11:08:00:00:completed:11',
  'the first existing session remains unchanged'
);
SELECT is(
  (
    SELECT rs.start_page::text || ':' || rs.end_page::text || ':' ||
      (rs.scheduled_for AT TIME ZONE 'Africa/Cairo')::time::text || ':' ||
      rs.status::text || ':' || rs.last_opened_page::text
    FROM public.reading_sessions AS rs
    WHERE rs.id = '40000000-0000-0000-0000-000000000031'
  ),
  '12:13:18:00:00:in_progress:12',
  'the second existing session remains unchanged'
);
SELECT is(
  (
    SELECT count(*)
    FROM public.reading_progress_events AS rpe
    WHERE rpe.user_id = '00000000-0000-0000-0000-000000000030'
  ),
  0::bigint,
  'saving settings creates no progress event'
);

UPDATE public.reading_sessions AS rs
SET status = 'completed', completed_at = now()
WHERE rs.daily_assignment_id = '30000000-0000-0000-0000-000000000030';
UPDATE public.daily_assignments AS da
SET status = 'completed', completed_at = now()
WHERE da.id = '30000000-0000-0000-0000-000000000030';
UPDATE public.reading_plans AS rp
SET current_unread_page = 14
WHERE rp.id = '10000000-0000-0000-0000-000000000030';

CREATE TEMP TABLE next_assignment_result AS
SELECT *
FROM public.ensure_current_reading_assignment();

SELECT is(
  (SELECT nar.created_now FROM next_assignment_result AS nar),
  true,
  'the next assignment is generated after the existing one is complete'
);
SELECT is(
  (SELECT nar.target_pages FROM next_assignment_result AS nar),
  6::smallint,
  'the next assignment uses the updated daily pages'
);
SELECT is(
  (SELECT nar.session_count FROM next_assignment_result AS nar),
  3::smallint,
  'the next assignment uses the updated session count'
);
SELECT results_eq(
  $$
    SELECT rs.session_order, rs.start_page, rs.end_page
    FROM public.reading_sessions AS rs
    WHERE rs.daily_assignment_id = (
      SELECT nar.assignment_id FROM next_assignment_result AS nar
    )
    ORDER BY rs.session_order
  $$,
  $$
    VALUES
      (1::smallint, 14::smallint, 15::smallint),
      (2::smallint, 16::smallint, 17::smallint),
      (3::smallint, 18::smallint, 19::smallint)
  $$,
  'the next assignment uses the updated deterministic distribution'
);
SELECT results_eq(
  $$
    SELECT
      rs.session_order,
      (rs.scheduled_for AT TIME ZONE 'Africa/Cairo')::time
    FROM public.reading_sessions AS rs
    WHERE rs.daily_assignment_id = (
      SELECT nar.assignment_id FROM next_assignment_result AS nar
    )
    ORDER BY rs.session_order
  $$,
  $$
    VALUES
      (1::smallint, '06:00'::time),
      (2::smallint, '12:00'::time),
      (3::smallint, '20:00'::time)
  $$,
  'the next assignment uses the updated schedule'
);
SELECT is(
  (
    SELECT count(*)
    FROM public.daily_assignments AS da
    WHERE da.reading_plan_id = '10000000-0000-0000-0000-000000000030'
  ),
  2::bigint,
  'the historical assignment remains alongside the new assignment'
);
SELECT ok(
  pg_catalog.has_function_privilege(
    'authenticated',
    'public.update_active_reading_plan(smallint,jsonb)',
    'EXECUTE'
  ),
  'authenticated users can execute the RPC'
);
SELECT ok(
  NOT pg_catalog.has_function_privilege(
    'anon',
    'public.update_active_reading_plan(smallint,jsonb)',
    'EXECUTE'
  ),
  'anonymous users cannot execute the RPC'
);

SELECT * FROM finish();

ROLLBACK;
