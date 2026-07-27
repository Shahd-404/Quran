-- Initial Supabase migration for Wird (Task 1A)
-- Timestamped: 2026-07-25

-- Use explicit search_path in functions where required.

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enums
CREATE TYPE reading_plan_status AS ENUM ('active','paused','completed','replaced');
CREATE TYPE daily_assignment_status AS ENUM ('pending','in_progress','completed');
CREATE TYPE reading_session_status AS ENUM ('pending','in_progress','completed');
CREATE TYPE khatma_status AS ENUM ('active','completed','abandoned');

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NULL,
  timezone text NOT NULL DEFAULT 'Africa/Cairo',
  locale text NOT NULL DEFAULT 'ar',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure timezone and locale not empty
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_timezone_nonempty CHECK (char_length(timezone) > 0),
  ADD CONSTRAINT profiles_locale_nonempty CHECK (char_length(locale) > 0);

-- Reading plans
CREATE TABLE public.reading_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status reading_plan_status NOT NULL DEFAULT 'active',
  start_page smallint NOT NULL,
  current_unread_page smallint NOT NULL,
  daily_pages smallint NOT NULL,
  sessions_per_day smallint NOT NULL,
  timezone text NOT NULL DEFAULT 'Africa/Cairo',
  effective_from date NOT NULL DEFAULT (CURRENT_DATE),
  paused_at timestamptz NULL,
  completed_at timestamptz NULL,
  replaced_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reading_plans_start_page_range CHECK (start_page BETWEEN 1 AND 604),
  CONSTRAINT reading_plans_current_unread_page_range CHECK (current_unread_page BETWEEN 1 AND 604),
  CONSTRAINT reading_plans_daily_pages_range CHECK (daily_pages BETWEEN 1 AND 604),
  CONSTRAINT reading_plans_sessions_per_day_range CHECK (sessions_per_day BETWEEN 1 AND 6),
  CONSTRAINT reading_plans_sessions_le_pages CHECK (sessions_per_day <= daily_pages),
  CONSTRAINT reading_plans_timezone_nonempty CHECK (char_length(timezone) > 0)
);

-- Foreign key to profiles
ALTER TABLE public.reading_plans
  ADD CONSTRAINT fk_reading_plans_user FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Ensure a user has at most one active plan
CREATE UNIQUE INDEX idx_unique_active_plan_per_user ON public.reading_plans (user_id) WHERE (status = 'active');

CREATE INDEX idx_reading_plans_user_id ON public.reading_plans(user_id);
CREATE INDEX idx_reading_plans_status ON public.reading_plans(status);
CREATE INDEX idx_reading_plans_effective_from ON public.reading_plans(effective_from);

-- Plan schedule times
CREATE TABLE public.plan_schedule_times (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL,
  session_order smallint NOT NULL,
  scheduled_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plan_schedule_session_order_range CHECK (session_order BETWEEN 1 AND 6)
);

ALTER TABLE public.plan_schedule_times
  ADD CONSTRAINT fk_schedule_plan FOREIGN KEY (plan_id) REFERENCES public.reading_plans(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX idx_plan_schedule_unique_order ON public.plan_schedule_times(plan_id, session_order);
CREATE UNIQUE INDEX idx_plan_schedule_unique_time ON public.plan_schedule_times(plan_id, scheduled_time);
CREATE INDEX idx_plan_schedule_plan_id ON public.plan_schedule_times(plan_id);
CREATE INDEX idx_plan_schedule_order ON public.plan_schedule_times(plan_id, session_order);

-- Khatmas
CREATE TABLE public.khatmas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reading_plan_id uuid NULL,
  cycle_number integer NOT NULL,
  status khatma_status NOT NULL DEFAULT 'active',
  start_page smallint NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  abandoned_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT khatmas_cycle_positive CHECK (cycle_number > 0),
  CONSTRAINT khatmas_start_page_range CHECK (start_page BETWEEN 1 AND 604)
);

ALTER TABLE public.khatmas
  ADD CONSTRAINT fk_khatmas_user FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.khatmas
  ADD CONSTRAINT fk_khatmas_plan FOREIGN KEY (reading_plan_id) REFERENCES public.reading_plans(id) ON DELETE SET NULL;

-- Unique per user cycle number
CREATE UNIQUE INDEX idx_khatmas_user_cycle ON public.khatmas (user_id, cycle_number);
-- Ensure one active khatma per user
CREATE UNIQUE INDEX idx_khatmas_unique_active_per_user ON public.khatmas (user_id) WHERE (status = 'active');
CREATE INDEX idx_khatmas_user ON public.khatmas(user_id);
CREATE INDEX idx_khatmas_completed_at ON public.khatmas(completed_at);

-- Daily assignments
CREATE TABLE public.daily_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reading_plan_id uuid NOT NULL,
  khatma_id uuid NOT NULL,
  local_date date NOT NULL,
  timezone text NOT NULL,
  target_pages smallint NOT NULL,
  status daily_assignment_status NOT NULL DEFAULT 'pending',
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_assignments_target_pages_range CHECK (target_pages BETWEEN 1 AND 604),
  CONSTRAINT daily_assignments_timezone_nonempty CHECK (char_length(timezone) > 0)
);

ALTER TABLE public.daily_assignments
  ADD CONSTRAINT fk_daily_assignments_user FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.daily_assignments
  ADD CONSTRAINT fk_daily_assignments_plan FOREIGN KEY (reading_plan_id) REFERENCES public.reading_plans(id) ON DELETE CASCADE;

ALTER TABLE public.daily_assignments
  ADD CONSTRAINT fk_daily_assignments_khatma FOREIGN KEY (khatma_id) REFERENCES public.khatmas(id) ON DELETE CASCADE;

-- Ensure one daily assignment per plan and local_date
CREATE UNIQUE INDEX idx_daily_assignment_plan_date ON public.daily_assignments (reading_plan_id, local_date);
CREATE INDEX idx_daily_assignments_user_date ON public.daily_assignments(user_id, local_date);
CREATE INDEX idx_daily_assignments_plan_date_status ON public.daily_assignments(reading_plan_id, local_date, status);

-- To support ownership FK referencing, create composite unique constraints (id, user_id)
ALTER TABLE public.daily_assignments ADD CONSTRAINT uq_daily_assignments_id_user UNIQUE (id, user_id);
ALTER TABLE public.reading_plans ADD CONSTRAINT uq_reading_plans_id_user UNIQUE (id, user_id);
ALTER TABLE public.khatmas ADD CONSTRAINT uq_khatmas_id_user UNIQUE (id, user_id);

-- Reading sessions
CREATE TABLE public.reading_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  daily_assignment_id uuid NOT NULL,
  session_order smallint NOT NULL,
  start_page smallint NOT NULL,
  end_page smallint NOT NULL,
  scheduled_for timestamptz NOT NULL,
  status reading_session_status NOT NULL DEFAULT 'pending',
  last_opened_page smallint NULL,
  first_opened_at timestamptz NULL,
  last_opened_at timestamptz NULL,
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reading_sessions_order_range CHECK (session_order BETWEEN 1 AND 6),
  CONSTRAINT reading_sessions_start_page_range CHECK (start_page BETWEEN 1 AND 604),
  CONSTRAINT reading_sessions_end_page_range CHECK (end_page BETWEEN 1 AND 604),
  CONSTRAINT reading_sessions_end_gte_start CHECK (end_page >= start_page)
);

-- Ownership FK: ensure (daily_assignment_id, user_id) reference exists
ALTER TABLE public.reading_sessions
  ADD CONSTRAINT fk_reading_sessions_user FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.reading_sessions
  ADD CONSTRAINT fk_reading_sessions_assignment FOREIGN KEY (daily_assignment_id, user_id) REFERENCES public.daily_assignments(id, user_id) ON DELETE CASCADE;

CREATE UNIQUE INDEX idx_reading_sessions_assignment_order ON public.reading_sessions(daily_assignment_id, session_order);
CREATE INDEX idx_reading_sessions_user ON public.reading_sessions(user_id);
CREATE INDEX idx_reading_sessions_status ON public.reading_sessions(status);
CREATE INDEX idx_reading_sessions_scheduled_for ON public.reading_sessions(scheduled_for);

-- Prevent overlapping page ranges within the same daily assignment using a trigger
CREATE OR REPLACE FUNCTION public.check_session_page_overlap() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  overlap_count int;
BEGIN
  SELECT count(*) INTO overlap_count FROM public.reading_sessions rs
  WHERE rs.id <> NEW.id
    AND rs.daily_assignment_id = NEW.daily_assignment_id
    AND NOT (rs.end_page < NEW.start_page OR rs.start_page > NEW.end_page);

  IF overlap_count > 0 THEN
    RAISE EXCEPTION 'Session page range overlaps with existing session in the same daily assignment';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_session_page_overlap
  BEFORE INSERT OR UPDATE ON public.reading_sessions
  FOR EACH ROW EXECUTE FUNCTION public.check_session_page_overlap();

-- Ensure last_opened_page within range
CREATE OR REPLACE FUNCTION public.check_last_opened_within_range() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.last_opened_page IS NOT NULL THEN
    IF NOT (NEW.last_opened_page BETWEEN NEW.start_page AND NEW.end_page) THEN
      RAISE EXCEPTION 'last_opened_page must be within session page range';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_last_opened_within_range
  BEFORE INSERT OR UPDATE ON public.reading_sessions
  FOR EACH ROW EXECUTE FUNCTION public.check_last_opened_within_range();

-- Ensure composite unique (id,user) to support FK references
ALTER TABLE public.reading_sessions ADD CONSTRAINT uq_reading_sessions_id_user UNIQUE (id, user_id);

-- Reading progress events (append-only)
CREATE TABLE public.reading_progress_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reading_plan_id uuid NOT NULL,
  khatma_id uuid NOT NULL,
  daily_assignment_id uuid NOT NULL,
  reading_session_id uuid NOT NULL,
  start_page smallint NOT NULL,
  end_page smallint NOT NULL,
  completed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reading_progress_pages_range CHECK (start_page BETWEEN 1 AND 604 AND end_page BETWEEN 1 AND 604 AND end_page >= start_page)
);

ALTER TABLE public.reading_progress_events
  ADD CONSTRAINT fk_progress_user FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.reading_progress_events
  ADD CONSTRAINT fk_progress_plan FOREIGN KEY (reading_plan_id) REFERENCES public.reading_plans(id) ON DELETE CASCADE;
ALTER TABLE public.reading_progress_events
  ADD CONSTRAINT fk_progress_khatma FOREIGN KEY (khatma_id) REFERENCES public.khatmas(id) ON DELETE CASCADE;
ALTER TABLE public.reading_progress_events
  ADD CONSTRAINT fk_progress_assignment FOREIGN KEY (daily_assignment_id) REFERENCES public.daily_assignments(id) ON DELETE CASCADE;
ALTER TABLE public.reading_progress_events
  ADD CONSTRAINT fk_progress_session FOREIGN KEY (reading_session_id) REFERENCES public.reading_sessions(id) ON DELETE CASCADE;

-- Only one progress event per reading session
CREATE UNIQUE INDEX idx_progress_unique_session ON public.reading_progress_events (reading_session_id);
CREATE INDEX idx_progress_user ON public.reading_progress_events(user_id);
CREATE INDEX idx_progress_khatma ON public.reading_progress_events(khatma_id);
CREATE INDEX idx_progress_completed_at ON public.reading_progress_events(completed_at);

-- Push subscriptions
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh_key text NOT NULL,
  auth_key text NOT NULL,
  user_agent text NULL,
  device_label text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz NULL
);

ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT fk_push_user FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX idx_push_endpoint_unique ON public.push_subscriptions(endpoint);
CREATE INDEX idx_push_user ON public.push_subscriptions(user_id);
CREATE INDEX idx_push_revoked_at ON public.push_subscriptions(revoked_at);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at trigger to mutable tables
CREATE TRIGGER trg_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_column();
CREATE TRIGGER trg_updated_at_reading_plans BEFORE UPDATE ON public.reading_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_column();
CREATE TRIGGER trg_updated_at_plan_schedule_times BEFORE UPDATE ON public.plan_schedule_times FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_column();
CREATE TRIGGER trg_updated_at_khatmas BEFORE UPDATE ON public.khatmas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_column();
CREATE TRIGGER trg_updated_at_daily_assignments BEFORE UPDATE ON public.daily_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_column();
CREATE TRIGGER trg_updated_at_reading_sessions BEFORE UPDATE ON public.reading_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_column();
CREATE TRIGGER trg_updated_at_push_subscriptions BEFORE UPDATE ON public.push_subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_column();

-- New-auth-user trigger: create profile when auth.users inserted.
CREATE OR REPLACE FUNCTION public.create_profile_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    display_name,
    timezone,
    locale,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    CASE
      WHEN NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'display_name'), '') IS NOT NULL
        THEN BTRIM(NEW.raw_user_meta_data ->> 'display_name')
      ELSE NULL
    END,
    COALESCE(
      NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'timezone'), ''),
      'Africa/Cairo'
    ),
    COALESCE(
      NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'locale'), ''),
      'ar'
    ),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_profile_on_auth_user ON auth.users;

CREATE TRIGGER trg_create_profile_on_auth_user
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_profile_for_new_user();

-- Row Level Security: enable on application tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_schedule_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.khatmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Policies for reading_plans
CREATE POLICY reading_plans_select_own ON public.reading_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY reading_plans_insert_own ON public.reading_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY reading_plans_update_own ON public.reading_plans FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Policies for plan_schedule_times (ownership via plan)
CREATE POLICY plan_schedule_select_own ON public.plan_schedule_times FOR SELECT USING (EXISTS (SELECT 1 FROM public.reading_plans p WHERE p.id = plan_schedule_times.plan_id AND p.user_id = auth.uid()));
CREATE POLICY plan_schedule_insert_own ON public.plan_schedule_times FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.reading_plans p WHERE p.id = plan_schedule_times.plan_id AND p.user_id = auth.uid()));
CREATE POLICY plan_schedule_update_own ON public.plan_schedule_times FOR UPDATE USING (EXISTS (SELECT 1 FROM public.reading_plans p WHERE p.id = plan_schedule_times.plan_id AND p.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.reading_plans p WHERE p.id = plan_schedule_times.plan_id AND p.user_id = auth.uid()));

-- Khatma policies (read-only for clients; future trusted operations will manage writes)
CREATE POLICY khatmas_select_own ON public.khatmas FOR SELECT USING (auth.uid() = user_id);

-- Daily assignment policies (read-only for clients)
CREATE POLICY daily_assignments_select_own ON public.daily_assignments FOR SELECT USING (auth.uid() = user_id);

-- Reading session policies (read-only for clients)
CREATE POLICY reading_sessions_select_own ON public.reading_sessions FOR SELECT USING (auth.uid() = user_id);

-- Reading progress events policies (read-only)
CREATE POLICY progress_events_select_own ON public.reading_progress_events FOR SELECT USING (auth.uid() = user_id);

-- Push subscription policies (restrictive)
CREATE POLICY push_subscriptions_select_own ON public.push_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY push_subscriptions_insert_own ON public.push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY push_subscriptions_update_own ON public.push_subscriptions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Grant execute on functions to authenticated role where appropriate
GRANT EXECUTE ON FUNCTION public.set_updated_at_column() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_session_page_overlap() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_last_opened_within_range() TO authenticated;

-- End of migration
