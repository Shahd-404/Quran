-- pgTAP-style tests for create_reading_plan
-- These tests assume pgTAP is available in the local Supabase test environment.

SELECT plan(13);

-- 1. Unauthenticated calls must be rejected.
DO $$
BEGIN
  PERFORM public.create_reading_plan(1, 1, '[{"sessionOrder":1,"scheduledTime":"08:00"}]'::jsonb, 'Africa/Cairo', '2026-07-25');
  RAISE NOTICE 'ERROR_EXPECTED: unauthenticated call should fail';
EXCEPTION WHEN others THEN
  IF SQLERRM LIKE '%UNAUTHENTICATED%' THEN
    PERFORM ok(true, 'unauthenticated calls are rejected');
  ELSE
    PERFORM ok(false, 'unauthenticated calls should return UNAUTHENTICATED');
  END IF;
END$$;

-- 2. Anonymous role must not execute function.
DO $$
BEGIN
  PERFORM has_function_privilege('anon', 'public.create_reading_plan(smallint, smallint, jsonb, text, date)', 'EXECUTE');
  PERFORM ok(false, 'anon should not have execute privilege');
EXCEPTION WHEN others THEN
  PERFORM ok(true, 'anon cannot execute create_reading_plan');
END$$;

-- Helper: create a profile for a test user.
CREATE TEMP TABLE tmp_users (id uuid PRIMARY KEY);
INSERT INTO tmp_users(id) VALUES (gen_random_uuid());
INSERT INTO public.profiles(id, display_name, timezone, locale, created_at, updated_at)
VALUES ((SELECT id FROM tmp_users), 'test user', 'Africa/Cairo', 'ar', now(), now());

-- 3. Valid plan creates one active plan, correct schedules, active khatma, and returns ids.
DO $$
DECLARE
  p_id uuid;
  k_id uuid;
  count_plans int;
  count_schedules int;
  count_khatmas int;
  plan_user uuid := (SELECT id FROM tmp_users LIMIT 1);
  sessions jsonb := '[{"sessionOrder":1,"scheduledTime":"08:00"},{"sessionOrder":2,"scheduledTime":"12:00"}]'::jsonb;
BEGIN
  SET LOCAL role = CURRENT_USER;
  PERFORM pg_catalog.set_config('request.jwt.claims', '{"sub":"' || plan_user || '"}', false);
  SELECT plan_id, khatma_id INTO p_id, k_id FROM public.create_reading_plan(1, 2, sessions, 'Africa/Cairo', '2026-07-25');
  SELECT count(*) INTO count_plans FROM public.reading_plans WHERE id = p_id AND user_id = plan_user AND status = 'active';
  SELECT count(*) INTO count_schedules FROM public.plan_schedule_times WHERE plan_id = p_id;
  SELECT count(*) INTO count_khatmas FROM public.khatmas WHERE id = k_id AND user_id = plan_user AND status = 'active';
  PERFORM ok(count_plans = 1, 'one active reading plan created');
  PERFORM ok(count_schedules = 2, 'two schedule rows created');
  PERFORM ok(count_khatmas = 1, 'one active khatma created');
END$$;

-- 4. Second active plan is rejected.
DO $$
DECLARE
  plan_user uuid := (SELECT id FROM tmp_users LIMIT 1);
BEGIN
  SET LOCAL role = CURRENT_USER;
  PERFORM pg_catalog.set_config('request.jwt.claims', '{"sub":"' || plan_user || '"}', false);
  BEGIN
    PERFORM public.create_reading_plan(2, 1, '[{"sessionOrder":1,"scheduledTime":"08:00"}]'::jsonb, 'Africa/Cairo', '2026-07-26');
    PERFORM ok(false, 'second active plan should be rejected');
  EXCEPTION WHEN others THEN
    PERFORM ok(SQLERRM LIKE '%ACTIVE_PLAN_EXISTS%', 'ACTIVE_PLAN_EXISTS returned for second active plan');
  END;
END$$;

-- 5. Invalid input creates no partial records.
DO $$
DECLARE
  plan_user uuid := (SELECT id FROM tmp_users LIMIT 1);
  before_plans int;
  before_khatmas int;
BEGIN
  SELECT count(*) INTO before_plans FROM public.reading_plans WHERE user_id = plan_user;
  SELECT count(*) INTO before_khatmas FROM public.khatmas WHERE user_id = plan_user;
  SET LOCAL role = CURRENT_USER;
  PERFORM pg_catalog.set_config('request.jwt.claims', '{"sub":"' || plan_user || '"}', false);
  BEGIN
    PERFORM public.create_reading_plan(0, 1, '[{"sessionOrder":1,"scheduledTime":"08:00"}]'::jsonb, 'Africa/Cairo', '2026-07-25');
  EXCEPTION WHEN others THEN
    NULL;
  END;
  PERFORM ok((SELECT count(*) FROM public.reading_plans WHERE user_id = plan_user) = before_plans, 'invalid input created no new plan');
  PERFORM ok((SELECT count(*) FROM public.khatmas WHERE user_id = plan_user) = before_khatmas, 'invalid input created no new khatma');
END$$;

-- 6. Schedule orders and times are stored correctly.
DO $$
DECLARE
  plan_user uuid := gen_random_uuid();
  p_id uuid;
  rows int;
BEGIN
  INSERT INTO public.profiles(id, display_name, timezone, locale, created_at, updated_at)
  VALUES (plan_user, 'test user 2', 'Africa/Cairo', 'ar', now(), now());
  SET LOCAL role = CURRENT_USER;
  PERFORM pg_catalog.set_config('request.jwt.claims', '{"sub":"' || plan_user || '"}', false);
  SELECT plan_id INTO p_id FROM public.create_reading_plan(5, 2, '[{"sessionOrder":1,"scheduledTime":"08:00"},{"sessionOrder":2,"scheduledTime":"09:00"}]'::jsonb, 'Africa/Cairo', '2026-07-25');
  SELECT count(*) INTO rows FROM public.plan_schedule_times WHERE plan_id = p_id AND session_order = 1 AND scheduled_time = '08:00';
  PERFORM ok(rows = 1, 'first schedule row stored correctly');
  SELECT count(*) INTO rows FROM public.plan_schedule_times WHERE plan_id = p_id AND session_order = 2 AND scheduled_time = '09:00';
  PERFORM ok(rows = 1, 'second schedule row stored correctly');
END$$;

-- 7. Cycle number begins at 1 and increments for historical khatmas.
DO $$
DECLARE
  plan_user uuid := gen_random_uuid();
  first_khatma int;
  second_khatma int;
  first_id uuid;
  second_id uuid;
BEGIN
  INSERT INTO public.profiles(id, display_name, timezone, locale, created_at, updated_at)
  VALUES (plan_user, 'test user 3', 'Africa/Cairo', 'ar', now(), now());
  INSERT INTO public.khatmas(user_id, cycle_number, status, start_page)
  VALUES (plan_user, 1, 'completed', 1);
  SET LOCAL role = CURRENT_USER;
  PERFORM pg_catalog.set_config('request.jwt.claims', '{"sub":"' || plan_user || '"}', false);
  SELECT khatma_id INTO second_id FROM public.create_reading_plan(10, 2, '[{"sessionOrder":1,"scheduledTime":"08:00"}]'::jsonb, 'Africa/Cairo', '2026-07-25');
  SELECT cycle_number INTO second_khatma FROM public.khatmas WHERE id = second_id;
  PERFORM ok(second_khatma = 2, 'next khatma cycle number increments');
END$$;

-- 8. User ownership is derived from auth.uid().
DO $$
DECLARE
  plan_user uuid := gen_random_uuid();
  other_user uuid := gen_random_uuid();
  p_id uuid;
BEGIN
  INSERT INTO public.profiles(id, display_name, timezone, locale, created_at, updated_at)
  VALUES (plan_user, 'test user 4', 'Africa/Cairo', 'ar', now(), now()),
         (other_user, 'other user', 'Africa/Cairo', 'ar', now(), now());
  SET LOCAL role = CURRENT_USER;
  PERFORM pg_catalog.set_config('request.jwt.claims', '{"sub":"' || plan_user || '"}', false);
  SELECT plan_id INTO p_id FROM public.create_reading_plan(20, 1, '[{"sessionOrder":1,"scheduledTime":"08:00"}]'::jsonb, 'Africa/Cairo', '2026-07-25');
  PERFORM ok((SELECT user_id FROM public.reading_plans WHERE id = p_id) = plan_user, 'plan user_id derived from auth.uid()');
  PERFORM ok((SELECT user_id FROM public.khatmas WHERE id = (SELECT khatma_id FROM public.khatmas WHERE reading_plan_id = p_id LIMIT 1)) = plan_user, 'khatma user_id derived from auth.uid()');
END$$;

SELECT done_testing();
