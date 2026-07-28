BEGIN;
SELECT plan(22);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000040',
    'authenticated', 'authenticated', 'claim-active@example.invalid', '', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000041',
    'authenticated', 'authenticated', 'claim-inactive@example.invalid', '', now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, display_name, timezone, locale)
VALUES
  ('00000000-0000-0000-0000-000000000040', 'claim-active', 'Africa/Cairo', 'ar'),
  ('00000000-0000-0000-0000-000000000041', 'claim-inactive', 'Africa/Cairo', 'ar')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.reading_plans (
  id, user_id, start_page, current_unread_page, daily_pages, sessions_per_day
)
VALUES
  (
    '10000000-0000-0000-0000-000000000040',
    '00000000-0000-0000-0000-000000000040',
    1, 17, 6, 6
  ),
  (
    '10000000-0000-0000-0000-000000000041',
    '00000000-0000-0000-0000-000000000041',
    1, 29, 1, 1
  );

INSERT INTO public.khatmas (id, user_id, reading_plan_id, cycle_number, start_page)
VALUES
  (
    '20000000-0000-0000-0000-000000000040',
    '00000000-0000-0000-0000-000000000040',
    '10000000-0000-0000-0000-000000000040',
    1, 1
  ),
  (
    '20000000-0000-0000-0000-000000000041',
    '00000000-0000-0000-0000-000000000041',
    '10000000-0000-0000-0000-000000000041',
    1, 1
  );

INSERT INTO public.daily_assignments (
  id, user_id, reading_plan_id, khatma_id, local_date, timezone, target_pages
)
VALUES
  (
    '30000000-0000-0000-0000-000000000040',
    '00000000-0000-0000-0000-000000000040',
    '10000000-0000-0000-0000-000000000040',
    '20000000-0000-0000-0000-000000000040',
    current_date, 'Africa/Cairo', 6
  ),
  (
    '30000000-0000-0000-0000-000000000041',
    '00000000-0000-0000-0000-000000000041',
    '10000000-0000-0000-0000-000000000041',
    '20000000-0000-0000-0000-000000000041',
    current_date, 'Africa/Cairo', 1
  );

INSERT INTO public.reading_sessions (
  id, user_id, daily_assignment_id, session_order, start_page, end_page,
  scheduled_for, status
)
VALUES
  ('40000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000040', '30000000-0000-0000-0000-000000000040', 1, 17, 17, now() - interval '5 minutes', 'pending'),
  ('40000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000040', '30000000-0000-0000-0000-000000000040', 2, 18, 18, now() - interval '4 minutes', 'pending'),
  ('40000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000040', '30000000-0000-0000-0000-000000000040', 3, 19, 19, now() - interval '3 minutes', 'pending'),
  ('40000000-0000-0000-0000-000000000043', '00000000-0000-0000-0000-000000000040', '30000000-0000-0000-0000-000000000040', 4, 20, 20, now() - interval '2 minutes', 'pending'),
  ('40000000-0000-0000-0000-000000000044', '00000000-0000-0000-0000-000000000040', '30000000-0000-0000-0000-000000000040', 5, 21, 21, now() - interval '1 minute', 'pending'),
  ('40000000-0000-0000-0000-000000000045', '00000000-0000-0000-0000-000000000040', '30000000-0000-0000-0000-000000000040', 6, 22, 22, now() - interval '1 minute', 'completed'),
  ('40000000-0000-0000-0000-000000000046', '00000000-0000-0000-0000-000000000041', '30000000-0000-0000-0000-000000000041', 1, 29, 29, now() - interval '1 minute', 'pending');

INSERT INTO public.push_subscriptions (
  id, user_id, endpoint, p256dh_key, auth_key, active, revoked_at
)
VALUES
  (
    '60000000-0000-0000-0000-000000000040',
    '00000000-0000-0000-0000-000000000040',
    'https://push.example/claim-active', repeat('a', 40), repeat('b', 8),
    true, NULL
  ),
  (
    '60000000-0000-0000-0000-000000000041',
    '00000000-0000-0000-0000-000000000041',
    'https://push.example/claim-inactive', repeat('c', 40), repeat('d', 8),
    false, now()
  );

INSERT INTO public.notification_deliveries (
  id, user_id, reading_session_id, push_subscription_id, scheduled_for,
  status, attempt_count, last_error_code
)
VALUES
  ('70000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000040', '40000000-0000-0000-0000-000000000040', '60000000-0000-0000-0000-000000000040', now() - interval '5 minutes', 'pending', 0, NULL),
  ('70000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000040', '40000000-0000-0000-0000-000000000042', '60000000-0000-0000-0000-000000000040', now() - interval '3 minutes', 'failed', 1, 'PUSH_TRANSIENT_FAILURE'),
  ('70000000-0000-0000-0000-000000000043', '00000000-0000-0000-0000-000000000040', '40000000-0000-0000-0000-000000000043', '60000000-0000-0000-0000-000000000040', now() - interval '2 minutes', 'failed', 3, 'PUSH_TRANSIENT_FAILURE'),
  ('70000000-0000-0000-0000-000000000044', '00000000-0000-0000-0000-000000000040', '40000000-0000-0000-0000-000000000044', '60000000-0000-0000-0000-000000000040', now() - interval '1 minute', 'sent', 1, NULL);

CREATE TEMP TABLE claimed_deliveries AS
SELECT * FROM public.claim_due_reading_reminders(100);

SELECT is(
  (SELECT count(*) FROM claimed_deliveries),
  3::bigint,
  'pending, missing, and retryable failed deliveries are claimed'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM claimed_deliveries
    WHERE delivery_id = '70000000-0000-0000-0000-000000000040'
  ),
  'the exact existing pending delivery is returned'
);
SELECT is(
  (
    SELECT status::text FROM public.notification_deliveries
    WHERE id = '70000000-0000-0000-0000-000000000040'
  ),
  'processing',
  'the existing pending delivery moves to processing'
);
SELECT is(
  (
    SELECT attempt_count FROM public.notification_deliveries
    WHERE id = '70000000-0000-0000-0000-000000000040'
  ),
  1,
  'claiming the pending delivery records its first attempt'
);
SELECT is(
  (
    SELECT count(*) FROM public.notification_deliveries
    WHERE reading_session_id = '40000000-0000-0000-0000-000000000040'
      AND push_subscription_id = '60000000-0000-0000-0000-000000000040'
  ),
  1::bigint,
  'the unique delivery pair is not duplicated'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM claimed_deliveries
    WHERE reading_session_id = '40000000-0000-0000-0000-000000000041'
  ),
  'a missing delivery is inserted and returned'
);
SELECT is(
  (
    SELECT count(*) FROM public.notification_deliveries
    WHERE reading_session_id = '40000000-0000-0000-0000-000000000041'
  ),
  1::bigint,
  'the newly due session has exactly one delivery'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM claimed_deliveries
    WHERE delivery_id = '70000000-0000-0000-0000-000000000042'
  ),
  'a retryable failed delivery is claimed'
);
SELECT is(
  (
    SELECT attempt_count FROM public.notification_deliveries
    WHERE id = '70000000-0000-0000-0000-000000000042'
  ),
  2,
  'retry claim increments the attempt count'
);
SELECT is(
  (
    SELECT count(*) FROM public.claim_due_reading_reminders(100)
    WHERE delivery_id IN (SELECT delivery_id FROM claimed_deliveries)
  ),
  0::bigint,
  'a second worker cannot claim deliveries already in processing'
);
SELECT is(
  (SELECT count(*) FROM public.claim_due_reading_reminders(100)),
  0::bigint,
  'no remaining eligible work returns an empty successful result'
);
SELECT like(
  pg_get_functiondef('public.claim_due_reading_reminders(integer)'::regprocedure),
  '%FOR UPDATE OF nd SKIP LOCKED%',
  'claiming uses row locks with SKIP LOCKED'
);
SELECT is(
  (
    SELECT status::text FROM public.notification_deliveries
    WHERE id = '70000000-0000-0000-0000-000000000043'
  ),
  'failed',
  'a delivery at the three-attempt limit is not claimed'
);
SELECT is(
  (
    SELECT status::text FROM public.notification_deliveries
    WHERE id = '70000000-0000-0000-0000-000000000044'
  ),
  'sent',
  'a sent delivery is not claimed'
);
SELECT is(
  (
    SELECT count(*) FROM public.notification_deliveries
    WHERE reading_session_id = '40000000-0000-0000-0000-000000000045'
  ),
  0::bigint,
  'a completed session does not receive a delivery'
);
SELECT is(
  (
    SELECT count(*) FROM public.notification_deliveries
    WHERE reading_session_id = '40000000-0000-0000-0000-000000000046'
  ),
  0::bigint,
  'an inactive subscription does not receive a delivery'
);

SELECT lives_ok(
  $$SELECT public.finish_notification_delivery(
    '70000000-0000-0000-0000-000000000040', 'sent', NULL, false
  )$$,
  'a claimed pending delivery can be finished as sent'
);
SELECT is(
  (
    SELECT status::text FROM public.notification_deliveries
    WHERE id = '70000000-0000-0000-0000-000000000040'
  ),
  'sent',
  'finish transitions the claimed delivery to sent'
);
SELECT lives_ok(
  (
    SELECT pg_catalog.format(
      'SELECT public.finish_notification_delivery(%L, %L, %L, false)',
      delivery_id,
      'failed',
      'PUSH_TRANSIENT_FAILURE'
    )
    FROM claimed_deliveries
    WHERE reading_session_id = '40000000-0000-0000-0000-000000000041'
  ),
  'a newly inserted and claimed delivery can be finished as failed'
);
SELECT is(
  (
    SELECT status::text FROM public.notification_deliveries
    WHERE reading_session_id = '40000000-0000-0000-0000-000000000041'
  ),
  'failed',
  'finish transitions the newly inserted delivery to failed'
);
SELECT is(
  (
    SELECT current_unread_page FROM public.reading_plans
    WHERE id = '10000000-0000-0000-0000-000000000040'
  ),
  17,
  'claiming and finishing do not advance reading progress'
);
SELECT is(
  (
    SELECT status::text FROM public.reading_sessions
    WHERE id = '40000000-0000-0000-0000-000000000040'
  ),
  'pending',
  'claiming and finishing do not complete the reading session'
);

SELECT * FROM finish();
ROLLBACK;
