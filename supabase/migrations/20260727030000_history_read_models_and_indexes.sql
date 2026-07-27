CREATE INDEX IF NOT EXISTS idx_progress_user_completed_id
ON public.reading_progress_events (
  user_id,
  completed_at DESC,
  id DESC
);

CREATE INDEX IF NOT EXISTS idx_progress_khatma_completed_id
ON public.reading_progress_events (
  khatma_id,
  completed_at ASC,
  id ASC
);

CREATE INDEX IF NOT EXISTS idx_khatmas_user_completed_id
ON public.khatmas (
  user_id,
  completed_at DESC,
  id DESC
);

CREATE OR REPLACE FUNCTION public.get_reading_history_summary()
RETURNS TABLE (
  total_completed_pages bigint,
  total_completed_sessions bigint,
  total_completed_khatmas bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
  SELECT
    COALESCE(
      pg_catalog.sum(
        (rpe.end_page - rpe.start_page + 1)::bigint
      ),
      0::numeric
    )::bigint AS total_completed_pages,
    pg_catalog.count(rpe.id)::bigint AS total_completed_sessions,
    (
      SELECT pg_catalog.count(k.id)::bigint
      FROM public.khatmas AS k
      WHERE k.user_id = auth.uid()
        AND k.status = 'completed'
    ) AS total_completed_khatmas
  FROM public.reading_progress_events AS rpe
  WHERE rpe.user_id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.get_khatma_history_archive()
RETURNS TABLE (
  khatma_id uuid,
  reading_plan_id uuid,
  cycle_number integer,
  khatma_status text,
  start_page smallint,
  started_at timestamptz,
  completed_at timestamptz,
  timezone text,
  current_unread_page smallint,
  completed_pages bigint,
  completed_sessions bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
  SELECT
    k.id AS khatma_id,
    k.reading_plan_id,
    k.cycle_number,
    k.status::text AS khatma_status,
    k.start_page,
    k.started_at,
    k.completed_at,
    COALESCE(
      rp.timezone,
      pg_catalog.max(da.timezone),
      'Africa/Cairo'
    ) AS timezone,
    rp.current_unread_page,
    COALESCE(
      pg_catalog.sum(
        (rpe.end_page - rpe.start_page + 1)::bigint
      ),
      0::numeric
    )::bigint AS completed_pages,
    pg_catalog.count(rpe.id)::bigint AS completed_sessions
  FROM public.khatmas AS k
  LEFT JOIN public.reading_plans AS rp
    ON rp.id = k.reading_plan_id
    AND rp.user_id = auth.uid()
  LEFT JOIN public.reading_progress_events AS rpe
    ON rpe.khatma_id = k.id
    AND rpe.user_id = auth.uid()
  LEFT JOIN public.daily_assignments AS da
    ON da.id = rpe.daily_assignment_id
    AND da.user_id = auth.uid()
  WHERE k.user_id = auth.uid()
    AND k.status IN ('active', 'completed')
  GROUP BY
    k.id,
    k.reading_plan_id,
    k.cycle_number,
    k.status,
    k.start_page,
    k.started_at,
    k.completed_at,
    rp.timezone,
    rp.current_unread_page
  ORDER BY
    CASE WHEN k.status = 'active' THEN 0 ELSE 1 END,
    k.completed_at DESC NULLS FIRST,
    k.id DESC
  LIMIT 100;
$function$;

CREATE OR REPLACE FUNCTION public.get_khatma_history_details(
  p_khatma_id uuid
)
RETURNS TABLE (
  khatma_id uuid,
  reading_plan_id uuid,
  cycle_number integer,
  khatma_status text,
  start_page smallint,
  started_at timestamptz,
  completed_at timestamptz,
  timezone text,
  current_unread_page smallint,
  completed_pages bigint,
  completed_sessions bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
  SELECT
    k.id AS khatma_id,
    k.reading_plan_id,
    k.cycle_number,
    k.status::text AS khatma_status,
    k.start_page,
    k.started_at,
    k.completed_at,
    COALESCE(
      rp.timezone,
      pg_catalog.max(da.timezone),
      'Africa/Cairo'
    ) AS timezone,
    rp.current_unread_page,
    COALESCE(
      pg_catalog.sum(
        (rpe.end_page - rpe.start_page + 1)::bigint
      ),
      0::numeric
    )::bigint AS completed_pages,
    pg_catalog.count(rpe.id)::bigint AS completed_sessions
  FROM public.khatmas AS k
  LEFT JOIN public.reading_plans AS rp
    ON rp.id = k.reading_plan_id
    AND rp.user_id = auth.uid()
  LEFT JOIN public.reading_progress_events AS rpe
    ON rpe.khatma_id = k.id
    AND rpe.user_id = auth.uid()
  LEFT JOIN public.daily_assignments AS da
    ON da.id = rpe.daily_assignment_id
    AND da.user_id = auth.uid()
  WHERE k.id = p_khatma_id
    AND k.user_id = auth.uid()
    AND k.status IN ('active', 'completed')
  GROUP BY
    k.id,
    k.reading_plan_id,
    k.cycle_number,
    k.status,
    k.start_page,
    k.started_at,
    k.completed_at,
    rp.timezone,
    rp.current_unread_page;
$function$;

REVOKE ALL
ON FUNCTION public.get_reading_history_summary()
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.get_reading_history_summary()
FROM anon;

GRANT EXECUTE
ON FUNCTION public.get_reading_history_summary()
TO authenticated;

REVOKE ALL
ON FUNCTION public.get_khatma_history_archive()
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.get_khatma_history_archive()
FROM anon;

GRANT EXECUTE
ON FUNCTION public.get_khatma_history_archive()
TO authenticated;

REVOKE ALL
ON FUNCTION public.get_khatma_history_details(uuid)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.get_khatma_history_details(uuid)
FROM anon;

GRANT EXECUTE
ON FUNCTION public.get_khatma_history_details(uuid)
TO authenticated;
