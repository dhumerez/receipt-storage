-- FR-11.2: DB-level audit log immutability enforcement.
-- Run this once with a superuser after the initial deploy of 0000_init.sql.
-- receipts_user (the application DB user) must not be able to UPDATE or DELETE audit log rows.
-- This prevents even a compromised application from altering the audit trail.
--
-- Prerequisites:
--   - 0000_init.sql has been applied (audit_logs table exists)
--   - Connect as a PostgreSQL superuser (not receipts_user) to run this file
--   - Command: psql -U postgres -d receipts -f 0001_audit_log_immutability.sql

REVOKE UPDATE, DELETE ON audit_logs FROM receipts_user;
GRANT INSERT, SELECT ON audit_logs TO receipts_user;
