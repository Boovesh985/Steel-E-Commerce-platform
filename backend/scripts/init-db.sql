-- Create the two isolated databases and scoped users.
-- Runs on first PostgreSQL container startup via docker-entrypoint-initdb.d.

-- Create databases
CREATE DATABASE amk_auth;
CREATE DATABASE amk_catalog;

-- Create scoped users
CREATE USER amk_auth_user WITH PASSWORD 'auth_secret_pw';
CREATE USER amk_catalog_user WITH PASSWORD 'catalog_secret_pw';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE amk_auth TO amk_auth_user;
GRANT ALL PRIVILEGES ON DATABASE amk_catalog TO amk_catalog_user;

-- Grant schema permissions on amk_auth
\connect amk_auth
GRANT ALL ON SCHEMA public TO amk_auth_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO amk_auth_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO amk_auth_user;

-- Grant schema permissions on amk_catalog
\connect amk_catalog
GRANT ALL ON SCHEMA public TO amk_catalog_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO amk_catalog_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO amk_catalog_user;
