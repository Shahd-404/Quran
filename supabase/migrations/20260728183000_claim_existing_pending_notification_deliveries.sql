-- Claim existing pending reminder deliveries as well as retryable failures and
-- newly due session/subscription pairs. Delivery rows are the locking boundary
-- so concurrent workers cannot claim the same Web Push operation.
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
      rs.user_id,
      rs.scheduled_for,
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
    LEFT JOIN public.notification_deliveries AS existing
      ON existing.reading_session_id = rs.id
     AND existing.push_subscription_id = ps.id
     AND existing.notification_kind = 'session_due'
    WHERE rs.scheduled_for <= pg_catalog.now()
      AND rs.scheduled_for > pg_catalog.now() - interval '30 minutes'
      AND rs.status IN ('pending', 'in_progress')
      AND da.status IN ('pending', 'in_progress')
      AND rp.status = 'active'
      AND ps.active
      AND ps.revoked_at IS NULL
      AND (
        existing.id IS NULL
        OR existing.status = 'pending'
        OR (existing.status = 'failed' AND existing.attempt_count < 3)
      )
    ORDER BY rs.scheduled_for, rs.id, ps.id
    LIMIT LEAST(GREATEST(p_batch_size, 1), 200)
  ),
  inserted AS (
    INSERT INTO public.notification_deliveries (
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
    ) DO NOTHING
    RETURNING id, reading_session_id, push_subscription_id
  ),
  claimable AS MATERIALIZED (
    SELECT nd.id
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
      nd.id,
      nd.reading_session_id,
      nd.push_subscription_id
  ),
  claimed AS (
    SELECT id, reading_session_id, push_subscription_id
    FROM claimed_existing
    UNION ALL
    SELECT id, reading_session_id, push_subscription_id
    FROM inserted
  )
  SELECT
    claimed.id,
    ps.id,
    ps.endpoint,
    ps.p256dh_key,
    ps.auth_key,
    claimed.reading_session_id
  FROM claimed
  JOIN public.push_subscriptions AS ps
    ON ps.id = claimed.push_subscription_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_due_reading_reminders(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_reading_reminders(integer)
  TO service_role;
