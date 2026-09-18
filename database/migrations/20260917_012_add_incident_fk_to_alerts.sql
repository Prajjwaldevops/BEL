-- Migration: 20260917_012_add_incident_fk_to_alerts.sql
-- Description: Add foreign key constraint from security_alerts to security_incidents
-- Prerequisites: Migrations 008 and 010 must be applied first
-- Created: 2026-09-17

-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINT
-- ============================================================================

-- Add foreign key from security_alerts.incident_id to security_incidents.id
-- This migration should be run AFTER both migration 008 (incidents) and 010 (alerts) are applied

DO $$
BEGIN
    -- Check if both tables exist
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'security_incidents')
       AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'security_alerts') THEN
        
        -- Add foreign key constraint if it doesn't already exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_security_alerts_incident'
            AND table_name = 'security_alerts'
        ) THEN
            ALTER TABLE security_alerts
            ADD CONSTRAINT fk_security_alerts_incident
            FOREIGN KEY (incident_id) REFERENCES security_incidents(id)
            ON DELETE SET NULL;
            
            RAISE NOTICE 'Foreign key constraint added successfully';
        ELSE
            RAISE NOTICE 'Foreign key constraint already exists';
        END IF;
    ELSE
        RAISE WARNING 'Required tables not found. Please apply migrations 008 and 010 first.';
    END IF;
END $$;

COMMENT ON CONSTRAINT fk_security_alerts_incident ON security_alerts IS 'Links security alerts to their related security incidents';
