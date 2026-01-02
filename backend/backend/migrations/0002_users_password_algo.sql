-- D1 migration: add password algorithm to users
--
-- This makes password verification robust across environments.
-- Previously we stored only hash/salt/iterations; if a runtime fell back to sha256-iter,
-- login could not know how to verify.

PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN password_algo TEXT;

UPDATE users
SET password_algo = 'pbkdf2-sha256'
WHERE password_algo IS NULL OR TRIM(password_algo) = '';
