-- Infer the existing non-partial unique rule by its columns instead of relying
-- on PostgreSQL's truncated, implementation-generated constraint name.
CREATE OR REPLACE FUNCTION public.claim_due_reading_reminders(
  p_batch_size integer DEFAULT 100
)
RETURNS TABLE (
  delivery_id uuid,
  subscription_id uuid,
  endpoint text,
  p256dh_key text,
  auth_key text,
  reading_session_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH eligible AS MATERIALIZED (
    SELECT
      rs.id AS session_id,
      rs.user_id AS user_id,
      rs.scheduled_for AS scheduled_for,
      ps.id AS subscription_id
    FROM public.reading_sessions AS rs
    JOIN public.daily_assignments AS da
      ON da.id = rs.daily_assignment_id
     AND da.user_id = rs.user_id
    JOIN public.reading_plans AS rp
      ON rp.id = da.reading_plan_id
     AND rp.user_id = rs.user_id
    JOIN public.push_subscriptions AS ps
      ON ps.user_id = rs.user_id
    LEFT JOIN public.notification_deliveries AS existing_nd
      ON existing_nd.reading_session_id = rs.id
     AND existing_nd.push_subscription_id = ps.id
     AND existing_nd.notification_kind = 'session_due'
    WHERE rs.scheduled_for <= pg_catalog.now()
      AND rs.scheduled_for > pg_catalog.now() - interval '30 minutes'
      AND rs.status IN ('pending', 'in_progress')
      AND da.status IN ('pending', 'in_progress')
      AND rp.status = 'active'
      AND ps.active
      AND ps.revoked_at IS NULL
      AND (
        existing_nd.id IS NULL
        OR existing_nd.status = 'pending'
        OR (
          existing_nd.status = 'failed'
          AND existing_nd.attempt_count < 3
        )
      )
    ORDER BY rs.scheduled_for, rs.id, ps.id
    LIMIT LEAST(GREATEST(p_batch_size, 1), 200)
  ),
  inserted AS (
    INSERT INTO public.notification_deliveries AS inserted_nd (
      user_id,
      reading_session_id,
      push_subscription_id,
      scheduled_for,
      status,
      attempt_count,
      claimed_at
    )
    SELECT
      eligible.user_id,
      eligible.session_id,
      eligible.subscription_id,
      eligible.scheduled_for,
      'processing',
      1,
      pg_catalog.now()
    FROM eligible
    ON CONFLICT (
      reading_session_id,
      push_subscription_id,
      notification_kind
    )
    DO NOTHING
    RETURNING
      inserted_nd.id AS id,
      inserted_nd.reading_session_id AS reading_session_id,
      inserted_nd.push_subscription_id AS push_subscription_id
  ),
  claimable AS MATERIALIZED (
    SELECT nd.id AS id
    FROM public.notification_deliveries AS nd
    JOIN eligible
      ON eligible.session_id = nd.reading_session_id
     AND eligible.subscription_id = nd.push_subscription_id
    WHERE nd.notification_kind = 'session_due'
      AND (
        nd.status = 'pending'
        OR (nd.status = 'failed' AND nd.attempt_count < 3)
      )
    ORDER BY nd.scheduled_for, nd.id
    LIMIT LEAST(GREATEST(p_batch_size, 1), 200)
    FOR UPDATE OF nd SKIP LOCKED
  ),
  claimed_existing AS (
    UPDATE public.notification_deliveries AS nd
    SET
      status = 'processing',
      attempt_count = nd.attempt_count + 1,
      claimed_at = pg_catalog.now(),
      last_error_code = NULL
    FROM claimable
    WHERE nd.id = claimable.id
    RETURNING
      nd.id AS id,
      nd.reading_session_id AS reading_session_id,
      nd.push_subscription_id AS push_subscription_id
  ),
  claimed AS (
    SELECT
      claimed_existing.id AS id,
      claimed_existing.reading_session_id AS reading_session_id,
      claimed_existing.push_subscription_id AS push_subscription_id
    FROM claimed_existing
    UNION ALL
    SELECT
      inserted.id AS id,
      inserted.reading_session_id AS reading_session_id,
      inserted.push_subscription_id AS push_subscription_id
    FROM inserted
  )
  SELECT
    claimed.id AS delivery_id,
    ps.id AS subscription_id,
    ps.endpoint AS endpoint,
    ps.p256dh_key AS p256dh_key,
    ps.auth_key AS auth_key,
    claimed.reading_session_id AS reading_session_id
  FROM claimed
  JOIN public.push_subscriptions AS ps
    ON ps.id = claimed.push_subscription_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_due_reading_reminders(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_reading_reminders(integer)
  TO service_role;
