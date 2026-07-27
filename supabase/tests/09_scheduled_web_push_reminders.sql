BEGIN;
SELECT plan(6);
SELECT has_table('public', 'notification_deliveries', 'delivery table exists');
SELECT has_function('public', 'save_push_subscription', ARRAY['text','text','text','text'], 'secure save RPC exists');
SELECT has_function('public', 'claim_due_reading_reminders', ARRAY['integer'], 'claim RPC exists');
SELECT col_is_pk('public', 'notification_deliveries', 'id', 'deliveries have a primary key');
SELECT has_index('public', 'notification_deliveries',
  'notification_deliveries_reading_session_id_push_subscription_id_notification_kind_key',
  'one delivery exists per session, device, and kind');
SELECT policies_are('public', 'notification_deliveries',
  ARRAY['notification_deliveries_select_own'], 'users can only read owned delivery history');
SELECT * FROM finish();
ROLLBACK;
