-- Add token_expires_at for OAuth token refresh logic
ALTER TABLE calendar_integrations ADD COLUMN token_expires_at TEXT;
