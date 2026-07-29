-- Create scoped users if they don't exist, grant permissions.
-- This script is safe to re-run.

-- Create users (will error if they exist — that's OK, we use DO blocks)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'amk_auth_user') THEN
    CREATE USER amk_auth_user WITH PASSWORD 'Boovesh@985';
    RAISE NOTICE 'Created user amk_auth_user';
  ELSE
    RAISE NOTICE 'User amk_auth_user already exists';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'amk_catalog_user') THEN
    CREATE USER amk_catalog_user WITH PASSWORD 'Boovesh@985';
    RAISE NOTICE 'Created user amk_catalog_user';
  ELSE
    RAISE NOTICE 'User amk_catalog_user already exists';
  END IF;
END
$$;

-- Grant privileges on databases
GRANT ALL PRIVILEGES ON DATABASE amk_auth TO amk_auth_user;
GRANT ALL PRIVILEGES ON DATABASE amk_catalog TO amk_catalog_user;
