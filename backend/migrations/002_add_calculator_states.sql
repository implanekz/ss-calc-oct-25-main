-- ============================================
-- Add Calculator States Storage
-- This migration adds JSONB column to store calculator-specific state
-- ============================================

-- Add calculator_states column to calculator_preferences table
ALTER TABLE calculator_preferences 
ADD COLUMN IF NOT EXISTS calculator_states JSONB DEFAULT '{}';

-- Add a comment explaining the column
COMMENT ON COLUMN calculator_preferences.calculator_states IS 
'Stores calculator-specific state as JSON. Structure: { "showMeTheMoney": {...}, "pia": {...}, "divorced": {...}, "widow": {...} }';

-- Create an index on calculator_states for better query performance
CREATE INDEX IF NOT EXISTS idx_calculator_preferences_states 
ON calculator_preferences USING gin (calculator_states);

-- Update the updated_at trigger to fire when calculator_states changes
-- (The existing trigger should already handle this, but we verify it's in place)
