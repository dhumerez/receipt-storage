-- Migration: Add store name and Google Maps location to clients
--
-- Clients can now have a store/business name and a Google Maps link
-- in addition to their existing address field.

ALTER TABLE "clients" ADD COLUMN "store_name" varchar(255);
ALTER TABLE "clients" ADD COLUMN "google_location" varchar(500);
