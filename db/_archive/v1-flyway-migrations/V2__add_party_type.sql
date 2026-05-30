-- V2: Add party_type column to parties table
-- Distinguishes B2B (business) and B2C (consumer) parties
-- GSTIN is only relevant for B2B parties

ALTER TABLE parties
  ADD COLUMN party_type VARCHAR(3) NOT NULL DEFAULT 'B2C'
    CHECK (party_type IN ('B2B', 'B2C'));
