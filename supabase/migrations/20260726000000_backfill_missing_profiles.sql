-- Backfill profiles for existing auth users missing a public profile row.
-- This preserves existing profiles and keeps the trigger for future signups.

INSERT INTO public.profiles (
  id,
  display_name,
  timezone,
  locale,
  created_at,
  updated_at
)
SELECT
  u.id,
  NULLIF(BTRIM(u.raw_user_meta_data ->> 'display_name'), ''),
  COALESCE(
    NULLIF(BTRIM(u.raw_user_meta_data ->> 'timezone'), ''),
    'Africa/Cairo'
  ),
  COALESCE(
    NULLIF(BTRIM(u.raw_user_meta_data ->> 'locale'), ''),
    'ar'
  ),
  NOW(),
  NOW()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
