-- Phase 3: add client_id to tokens for portal invite flow (D-08)
-- Allows accept-invite to link new user back to clients.user_id atomically
ALTER TABLE tokens ADD COLUMN client_id UUID REFERENCES clients(id);
