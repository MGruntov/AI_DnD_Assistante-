-- D1 migration: adventures table
--
-- Replaces the hardcoded ADVENTURES array and KV-based adventure storage.
-- Notes:
-- - Use TEXT ids (UUID strings) for parity with the rest of the schema.
-- - Store list fields as JSON text (checkpoints/victory/defeat) to keep flexible.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS adventures (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  level_min INTEGER NOT NULL,
  level_max INTEGER NOT NULL,
  difficulty TEXT NOT NULL,
  summary TEXT NOT NULL,
  primer TEXT NOT NULL,
  checkpoints_json TEXT NOT NULL,
  victory_conditions_json TEXT NOT NULL,
  defeat_conditions_json TEXT NOT NULL,
  alignment TEXT NOT NULL DEFAULT '',
  theme TEXT NOT NULL DEFAULT '',
  creator_user_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (creator_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_adventures_created_at ON adventures(created_at);
CREATE INDEX IF NOT EXISTS idx_adventures_level_min ON adventures(level_min);

-- Seed the built-in adventure that the frontend expects (featured saga).
-- Keep the legacy id "RED_CLOAK" for backwards compatibility with existing clients.
INSERT OR IGNORE INTO adventures (
  id, title, level_min, level_max, difficulty, summary, primer,
  checkpoints_json, victory_conditions_json, defeat_conditions_json,
  alignment, theme, creator_user_id, created_at
) VALUES (
  'RED_CLOAK',
  'The Red Cloak and the Shadow-Touched Wolf',
  1,
  2,
  'Normal',
  'A short, spooky solo adventure in the Whispering Woods where you must deliver spirit-warding herbs to your Grandmother while a corrupted wolf stalks the paths.',
  'You are acting as an AI Dungeon Master for D&D 5e. You are running a contained adventure in the Whispering Woods. The player is a low-level messenger wearing a red cloak, tasked with carrying spirit-warding herbs to their Grandmother. The forest is haunted by a Shadow-Touched Wolf that corrupts spirits and hunts travelers. Keep the tone atmospheric and slightly eerie, but not grotesque.',
  '["crossroads","snaring_vines","cottage"]',
  '["The player successfully reaches Grandmother\u0027s cottage and delivers the spirit-warding herbs.","The Shadow-Touched Wolf is neutralized, driven away, or otherwise no longer a threat."]',
  '["The player character is reduced to 0 hit points with no clear rescue available.","The herbs are irretrievably lost or destroyed before reaching Grandmother."]',
  '',
  'Whispering Woods',
  NULL,
  '2026-01-02T00:00:00.000Z'
);
