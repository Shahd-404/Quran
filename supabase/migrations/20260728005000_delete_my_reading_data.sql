CREATE OR REPLACE FUNCTION public.delete_my_reading_data(p_confirmation text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_deliveries integer := 0;
  v_subscriptions integer := 0;
  v_events integer := 0;
  v_sessions integer := 0;
  v_assignments integer := 0;
  v_schedules integer := 0;
  v_khatmas integer := 0;
  v_plans integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'UNAUTHENTICATED';
  END IF;

  IF p_confirmation IS DISTINCT FROM 'حذف بياناتي' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'INVALID_CONFIRMATION';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 581347)
  );

  BEGIN
    DELETE FROM public.notification_deliveries WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_deliveries = ROW_COUNT;

    DELETE FROM public.push_subscriptions WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_subscriptions = ROW_COUNT;

    DELETE FROM public.reading_progress_events WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_events = ROW_COUNT;

    DELETE FROM public.reading_sessions WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_sessions = ROW_COUNT;

    DELETE FROM public.daily_assignments WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_assignments = ROW_COUNT;

    DELETE FROM public.plan_schedule_times AS pst
    USING public.reading_plans AS rp
    WHERE pst.plan_id = rp.id
      AND rp.user_id = v_user_id;
    GET DIAGNOSTICS v_schedules = ROW_COUNT;

    DELETE FROM public.khatmas WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_khatmas = ROW_COUNT;

    DELETE FROM public.reading_plans WHERE user_id = v_user_id;
    GET DIAGNOSTICS v_plans = ROW_COUNT;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'DELETE_FAILED';
  END;

  RETURN jsonb_build_object(
    'success', true,
    'deleted', jsonb_build_object(
      'notification_deliveries', v_deliveries,
      'push_subscriptions', v_subscriptions,
      'reading_progress_events', v_events,
      'reading_sessions', v_sessions,
      'daily_assignments', v_assignments,
      'plan_schedule_times', v_schedules,
      'khatmas', v_khatmas,
      'reading_plans', v_plans
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_reading_data(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_reading_data(text) TO authenticated;
