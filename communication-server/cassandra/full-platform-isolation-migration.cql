-- FULL PLATFORM ISOLATION MIGRATION
-- Run once against the same keyspace used by communication-server.
-- Existing tables keep legacy data; new v2 participant indexes are platform-scoped.
CREATE TABLE IF NOT EXISTS participants_by_user_v2 (
  platform_id text,
  user_id text,
  conversation_id text,
  joined_at timestamp,
  PRIMARY KEY ((platform_id, user_id), conversation_id)
);
CREATE TABLE IF NOT EXISTS participants_by_conversation_v2 (
  platform_id text,
  conversation_id text,
  user_id text,
  joined_at timestamp,
  PRIMARY KEY ((platform_id, conversation_id), user_id)
);
-- Add platform ownership columns used by server-side authorization.
ALTER TABLE conversations_by_id ADD platform_id text;
ALTER TABLE conversations_by_participant_key ADD platform_id text;
ALTER TABLE announcement_portals_by_id ADD platform_id text;
-- Announcement IDs/portal IDs remain globally generated, while every portal access
-- is rejected unless portal.platform_id matches the request platformId.
