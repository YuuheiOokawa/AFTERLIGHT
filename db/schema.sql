-- AFTERLIGHT v0.3 / generated from src/lib/schema.ts

CREATE TABLE IF NOT EXISTS schema_version(version int PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS accounts(id uuid PRIMARY KEY, code varchar(12) UNIQUE NOT NULL, handle varchar(24) UNIQUE, password_hash text, display_name varchar(24) NOT NULL, rating int NOT NULL DEFAULT 1200 CHECK(rating>=0), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS player_state(player_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE, state jsonb NOT NULL, version bigint NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS sessions(token_hash varchar(64) PRIMARY KEY, player_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_player ON sessions(player_id);
CREATE TABLE IF NOT EXISTS operations(player_id uuid REFERENCES accounts(id) ON DELETE CASCADE, key varchar(100), request_hash varchar(64) NOT NULL, response jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(player_id,key));
CREATE TABLE IF NOT EXISTS ledger(id uuid PRIMARY KEY, player_id uuid NOT NULL REFERENCES accounts(id), operation_key varchar(100) NOT NULL, kind varchar(50) NOT NULL, deltas jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(player_id,operation_key));
CREATE TABLE IF NOT EXISTS gacha_draws(id uuid PRIMARY KEY, player_id uuid NOT NULL REFERENCES accounts(id), result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS draws_history ON gacha_draws(player_id,created_at DESC);
CREATE TABLE IF NOT EXISTS friendships(id uuid PRIMARY KEY, low_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, high_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, sender_id uuid NOT NULL REFERENCES accounts(id), status varchar(12) NOT NULL CHECK(status IN ('pending','accepted')), created_at timestamptz NOT NULL DEFAULT now(), CHECK(low_id<high_id), UNIQUE(low_id,high_id));
CREATE TABLE IF NOT EXISTS blocks(player_id uuid REFERENCES accounts(id) ON DELETE CASCADE, target_id uuid REFERENCES accounts(id) ON DELETE CASCADE, CHECK(player_id<>target_id), PRIMARY KEY(player_id,target_id));
CREATE TABLE IF NOT EXISTS guilds(id uuid PRIMARY KEY, name varchar(24) NOT NULL, leader_id uuid NOT NULL REFERENCES accounts(id), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS guild_members(player_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE, guild_id uuid NOT NULL REFERENCES guilds(id) ON DELETE CASCADE, joined_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS members_guild ON guild_members(guild_id);
CREATE TABLE IF NOT EXISTS guild_points(player_id uuid NOT NULL REFERENCES accounts(id), guild_id uuid NOT NULL REFERENCES guilds(id) ON DELETE CASCADE, week varchar(10) NOT NULL, points int NOT NULL CHECK(points>0), PRIMARY KEY(player_id,guild_id,week));
CREATE TABLE IF NOT EXISTS guild_rewards(player_id uuid NOT NULL REFERENCES accounts(id), week varchar(10) NOT NULL, PRIMARY KEY(player_id,week));
CREATE TABLE IF NOT EXISTS guild_messages(id uuid PRIMARY KEY, guild_id uuid NOT NULL REFERENCES guilds(id) ON DELETE CASCADE, player_id uuid NOT NULL REFERENCES accounts(id), stamp int NOT NULL CHECK(stamp BETWEEN 0 AND 5), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS arena_matches(battle_id uuid PRIMARY KEY, attacker_id uuid NOT NULL REFERENCES accounts(id), defender_id uuid NOT NULL REFERENCES accounts(id), season varchar(10) NOT NULL, snapshots jsonb NOT NULL, status varchar(12) NOT NULL CHECK(status IN ('active','win','loss','retreated')), rating_applied boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), CHECK(attacker_id<>defender_id));
CREATE TABLE IF NOT EXISTS rate_limits(key varchar(100) PRIMARY KEY, window_start timestamptz NOT NULL, count int NOT NULL CHECK(count>0));
INSERT INTO schema_version(version) VALUES(1) ON CONFLICT DO NOTHING;
-- v0.3 adds JSON fields; defaults go on the left so existing progress wins.
UPDATE player_state SET state='{"bossClears":{},"trialClears":[],"storyRead":[],"echoes":0}'::jsonb || state
WHERE NOT(state ? 'bossClears') OR NOT(state ? 'trialClears') OR NOT(state ? 'storyRead') OR NOT(state ? 'echoes');
INSERT INTO schema_version(version) VALUES(2) ON CONFLICT DO NOTHING;
