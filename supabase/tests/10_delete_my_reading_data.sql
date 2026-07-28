BEGIN;
SELECT plan(22);

INSERT INTO public.profiles(id, display_name, timezone, locale)
VALUES
  ('00000000-0000-0000-0000-000000000030', 'delete-owner', 'Africa/Cairo', 'ar'),
  ('00000000-0000-0000-0000-000000000031', 'other-owner', 'Africa/Cairo', 'ar')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.reading_plans(id, user_id, start_page, current_unread_page, daily_pages, sessions_per_day)
VALUES
  ('10000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000030', 1, 1, 1, 1),
  ('10000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000031', 1, 1, 1, 1);

INSERT INTO public.plan_schedule_times(id, plan_id, session_order, scheduled_time)
VALUES
  ('11000000-0000-0000-0000-000000000030', '10000000-0000-0000-0000-000000000030', 1, '08:00'),
  ('11000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-000000000031', 1, '09:00');

INSERT INTO public.khatmas(id, user_id, reading_plan_id, cycle_number, start_page)
VALUES
  ('20000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000030', '10000000-0000-0000-0000-000000000030', 1, 1),
  ('20000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-000000000031', 1, 1);

INSERT INTO public.daily_assignments(id, user_id, reading_plan_id, khatma_id, local_date, timezone, target_pages)
VALUES
  ('30000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000030', '10000000-0000-0000-0000-000000000030', '20000000-0000-0000-0000-000000000030', '2026-07-28', 'Africa/Cairo', 1),
  ('30000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000031', '2026-07-28', 'Africa/Cairo', 1);

INSERT INTO public.reading_sessions(id, user_id, daily_assignment_id, session_order, start_page, end_page, scheduled_for)
VALUES
  ('40000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000030', '30000000-0000-0000-0000-000000000030', 1, 1, 1, now()),
  ('40000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000031', '30000000-0000-0000-0000-000000000031', 1, 1, 1, now());

INSERT INTO public.reading_progress_events(id, user_id, reading_plan_id, khatma_id, daily_assignment_id, reading_session_id, start_page, end_page, completed_at)
VALUES
  ('50000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000030', '10000000-0000-0000-0000-000000000030', '20000000-0000-0000-0000-000000000030', '30000000-0000-0000-0000-000000000030', '40000000-0000-0000-0000-000000000030', 1, 1, now()),
  ('50000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-000000000031', '20000000-0000-0000-0000-000000000031', '30000000-0000-0000-0000-000000000031', '40000000-0000-0000-0000-000000000031', 1, 1, now());

INSERT INTO public.push_subscriptions(id, user_id, endpoint, p256dh_key, auth_key)
VALUES
  ('60000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000030', 'https://push.example/a', repeat('a', 40), repeat('b', 8)),
  ('60000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000031', 'https://push.example/b', repeat('c', 40), repeat('d', 8));

INSERT INTO public.notification_deliveries(id, user_id, reading_session_id, push_subscription_id, scheduled_for)
VALUES
  ('70000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000030', '40000000-0000-0000-0000-000000000030', '60000000-0000-0000-0000-000000000030', now()),
  ('70000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000031', '40000000-0000-0000-0000-000000000031', '60000000-0000-0000-0000-000000000031', now());

SELECT set_config('request.jwt.claim.sub', '', true);
SELECT throws_ok(
  $$SELECT public.delete_my_reading_data('حذف بياناتي')$$,
  'UNAUTHENTICATED',
  'unauthenticated calls are rejected'
);

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000030', true);
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000030","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT public.delete_my_reading_data('حذف بيانات')$$,
  'INVALID_CONFIRMATION',
  'the exact confirmation is required'
);
SELECT is((SELECT count(*) FROM public.reading_plans WHERE user_id = '00000000-0000-0000-0000-000000000030'), 1::bigint, 'wrong confirmation changes nothing');

CREATE FUNCTION public.test_block_reading_plan_delete() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$ BEGIN RAISE EXCEPTION 'test failure'; END $$;
CREATE TRIGGER test_block_reading_plan_delete BEFORE DELETE ON public.reading_plans
FOR EACH ROW EXECUTE FUNCTION public.test_block_reading_plan_delete();
SELECT throws_ok(
  $$SELECT public.delete_my_reading_data('حذف بياناتي')$$,
  'DELETE_FAILED',
  'database failures return a stable error'
);
SELECT is((SELECT count(*) FROM public.push_subscriptions WHERE user_id = '00000000-0000-0000-0000-000000000030'), 1::bigint, 'failure rolls back earlier subscription deletion');
SELECT is((SELECT count(*) FROM public.reading_sessions WHERE user_id = '00000000-0000-0000-0000-000000000030'), 1::bigint, 'failure rolls back session deletion');
DROP TRIGGER test_block_reading_plan_delete ON public.reading_plans;
DROP FUNCTION public.test_block_reading_plan_delete();

SELECT is((public.delete_my_reading_data('حذف بياناتي')->>'success')::boolean, true, 'owned deletion succeeds');
SELECT is((SELECT count(*) FROM public.notification_deliveries WHERE user_id = '00000000-0000-0000-0000-000000000030'), 0::bigint, 'deliveries are removed');
SELECT is((SELECT count(*) FROM public.push_subscriptions WHERE user_id = '00000000-0000-0000-0000-000000000030'), 0::bigint, 'subscriptions are removed');
SELECT is((SELECT count(*) FROM public.reading_progress_events WHERE user_id = '00000000-0000-0000-0000-000000000030'), 0::bigint, 'progress events are removed');
SELECT is((SELECT count(*) FROM public.reading_sessions WHERE user_id = '00000000-0000-0000-0000-000000000030'), 0::bigint, 'sessions are removed');
SELECT is((SELECT count(*) FROM public.daily_assignments WHERE user_id = '00000000-0000-0000-0000-000000000030'), 0::bigint, 'assignments are removed');
SELECT is((SELECT count(*) FROM public.plan_schedule_times WHERE plan_id = '10000000-0000-0000-0000-000000000030'), 0::bigint, 'schedule times are removed');
SELECT is((SELECT count(*) FROM public.khatmas WHERE user_id = '00000000-0000-0000-0000-000000000030'), 0::bigint, 'khatmas are removed');
SELECT is((SELECT count(*) FROM public.reading_plans WHERE user_id = '00000000-0000-0000-0000-000000000030'), 0::bigint, 'plans are removed');
SELECT is((SELECT count(*) FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000030'), 1::bigint, 'profile is preserved');
SELECT is((SELECT display_name FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000030'), 'delete-owner', 'profile attributes are preserved');
SELECT is((SELECT count(*) FROM public.reading_plans WHERE user_id = '00000000-0000-0000-0000-000000000031'), 1::bigint, 'other user plan remains');
SELECT is((SELECT count(*) FROM public.notification_deliveries WHERE user_id = '00000000-0000-0000-0000-000000000031'), 1::bigint, 'other user delivery remains');
SELECT is((public.delete_my_reading_data('حذف بياناتي')->>'success')::boolean, true, 'repeated deletion is idempotent');
SELECT ok(has_function_privilege('authenticated', 'public.delete_my_reading_data(text)', 'EXECUTE'), 'authenticated role can execute');
SELECT ok(NOT has_function_privilege('anon', 'public.delete_my_reading_data(text)', 'EXECUTE'), 'anon cannot execute');

SELECT * FROM finish();
ROLLBACK;
