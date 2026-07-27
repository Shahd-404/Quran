-- pgTAP tests for ensure_current_reading_assignment
-- Requires pgTAP to be installed in the target database.

SELECT plan(9);

-- Test user id
SELECT set_config('jwt.claims.sub', '00000000-0000-0000-0000-000000000001', true);
DO $$ BEGIN
	-- Cleanup any pre-existing test rows for idempotency
	DELETE FROM public.reading_progress_events WHERE user_id = '00000000-0000-0000-000000000001';
	DELETE FROM public.reading_sessions WHERE user_id = '00000000-0000-0000-000000000001';
	DELETE FROM public.daily_assignments WHERE user_id = '00000000-0000-0000-000000000001';
	DELETE FROM public.khatmas WHERE user_id = '00000000-0000-0000-000000000001';
	DELETE FROM public.plan_schedule_times WHERE plan_id IN (SELECT id FROM public.reading_plans WHERE user_id = '00000000-0000-0000-0000-000000000001');
	DELETE FROM public.reading_plans WHERE user_id = '00000000-0000-0000-0000-000000000001';
	DELETE FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000001';
END $$;

-- Create profile
INSERT INTO public.profiles(id, display_name, timezone) VALUES ('00000000-0000-0000-0000-000000000001','test-user','Africa/Cairo') ON CONFLICT DO NOTHING;

-- Create a reading plan: start_page=1, current_unread_page=1, daily_pages=3, sessions_per_day=3
INSERT INTO public.reading_plans(id, user_id, start_page, current_unread_page, daily_pages, sessions_per_day, timezone, effective_from)
VALUES ('11111111-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001',1,1,3,3,'Africa/Cairo',CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- plan schedule times (3 sessions)
INSERT INTO public.plan_schedule_times(plan_id, session_order, scheduled_time)
VALUES
('11111111-0000-0000-0000-000000000001',1,'08:00'),
('11111111-0000-0000-0000-000000000001',2,'13:00'),
('11111111-0000-0000-0000-000000000001',3,'18:00')
ON CONFLICT DO NOTHING;

-- create khatma for the plan
INSERT INTO public.khatmas(id, user_id, reading_plan_id, cycle_number, status, start_page)
VALUES ('22222222-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001',1,'active',1)
ON CONFLICT DO NOTHING;

-- 1) First call creates one assignment
SELECT * FROM public.ensure_current_reading_assignment() AS t(assignment_id uuid, local_date date, created_now boolean, carried_over boolean, target_pages smallint, session_count smallint);
SELECT is((SELECT count(*) FROM public.daily_assignments WHERE user_id='00000000-0000-0000-0000-000000000001' AND local_date = (now() AT TIME ZONE 'Africa/Cairo')::date), 1, 'first call creates one assignment');

-- 2) 3 pages create 3 sessions
SELECT is((SELECT count(*) FROM public.reading_sessions rs JOIN public.daily_assignments da ON rs.daily_assignment_id = da.id WHERE da.user_id='00000000-0000-0000-0000-000000000001' AND da.local_date = (now() AT TIME ZONE 'Africa/Cairo')::date), 3, '3 pages -> 3 sessions');

-- 3) Distribution 5 pages across 3 sessions => 2,2,1
-- Cleanup and set up plan with daily_pages=5 sessions_per_day=3
DELETE FROM public.reading_sessions WHERE daily_assignment_id IN (SELECT id FROM public.daily_assignments WHERE user_id='00000000-0000-0000-0000-000000000001');
DELETE FROM public.daily_assignments WHERE user_id='00000000-0000-0000-0000-000000000001';
UPDATE public.reading_plans SET daily_pages = 5, sessions_per_day = 3, current_unread_page = 1 WHERE id = '11111111-0000-0000-0000-000000000001';

SELECT * FROM public.ensure_current_reading_assignment();
WITH da AS (SELECT id FROM public.daily_assignments WHERE user_id='00000000-0000-0000-0000-000000000001' ORDER BY created_at DESC LIMIT 1)
SELECT is((SELECT start_page FROM public.reading_sessions WHERE daily_assignment_id = (SELECT id FROM da) AND session_order = 1), 1, 'session1 starts at 1');
SELECT is((SELECT end_page FROM public.reading_sessions WHERE daily_assignment_id = (SELECT id FROM da) AND session_order = 1), 2, 'session1 ends at 2');
SELECT is((SELECT start_page FROM public.reading_sessions WHERE daily_assignment_id = (SELECT id FROM da) AND session_order = 2), 3, 'session2 starts at 3');
SELECT is((SELECT end_page FROM public.reading_sessions WHERE daily_assignment_id = (SELECT id FROM da) AND session_order = 2), 4, 'session2 ends at 4');
SELECT is((SELECT start_page FROM public.reading_sessions WHERE daily_assignment_id = (SELECT id FROM da) AND session_order = 3), 5, 'session3 starts at 5');
SELECT is((SELECT end_page FROM public.reading_sessions WHERE daily_assignment_id = (SELECT id FROM da) AND session_order = 3), 5, 'session3 ends at 5');

-- 4) Repeated call creates no duplicates
SELECT set_config('jwt.claims.sub', '00000000-0000-0000-0000-000000000001', true);
SELECT * FROM public.ensure_current_reading_assignment();
SELECT is((SELECT count(*) FROM public.daily_assignments WHERE user_id='00000000-0000-0000-0000-000000000001' AND local_date = (now() AT TIME ZONE 'Africa/Cairo')::date), 1, 'repeated call creates no duplicate assignment');

-- 5) Oldest incomplete assignment is carried over
-- Insert an older pending assignment
DELETE FROM public.reading_sessions WHERE user_id='00000000-0000-0000-0000-000000000001';
DELETE FROM public.daily_assignments WHERE user_id='00000000-0000-0000-0000-000000000001';
INSERT INTO public.daily_assignments(id, user_id, reading_plan_id, khatma_id, local_date, timezone, target_pages, status, created_at)
VALUES ('33333333-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001',(now() - interval '2 days')::date,'Africa/Cairo',3,'pending', now() - interval '2 days');
INSERT INTO public.reading_sessions(user_id, daily_assignment_id, session_order, start_page, end_page, scheduled_for)
VALUES ('00000000-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000001',1,1,3,now());

SELECT * FROM public.ensure_current_reading_assignment();
SELECT is((SELECT assignment_id FROM public.ensure_current_reading_assignment() LIMIT 1)::text IS NOT NULL, true, 'ensure returns an assignment id when carry-over exists');

-- 6) Final pages never exceed 604
-- Set current_unread to 603 and daily_pages to 5 => v_remaining = 604-603+1 =2
UPDATE public.reading_plans SET current_unread_page = 603, daily_pages = 5 WHERE id = '11111111-0000-0000-0000-000000000001';
DELETE FROM public.daily_assignments WHERE user_id='00000000-0000-0000-0000-000000000001';
DELETE FROM public.reading_sessions WHERE user_id='00000000-0000-0000-0000-000000000001';
SELECT * FROM public.ensure_current_reading_assignment();
SELECT is((SELECT target_pages FROM public.daily_assignments WHERE user_id='00000000-0000-0000-0000-000000000001' ORDER BY created_at DESC LIMIT 1), 2, 'assigned pages limited by 604');

-- 7) current_unread_page remains unchanged by the RPC
SELECT is((SELECT current_unread_page FROM public.reading_plans WHERE id = '11111111-0000-0000-0000-000000000001'), 603, 'current_unread_page unchanged');

-- 8) Unauthenticated execution rejected
SELECT set_config('jwt.claims.sub', '', true);
SELECT throws_ok('SELECT public.ensure_current_reading_assignment();', 'UNAUTHENTICATED', 'unauthenticated execution is rejected');

SELECT * FROM finish();
