-- Phase 7: add logo_path to companies for PDF branding
ALTER TABLE companies ADD COLUMN "logo_path" varchar(500);
