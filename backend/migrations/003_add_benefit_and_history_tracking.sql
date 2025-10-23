-- Migration 003: Add benefit tracking and divorce/widow history
-- This migration adds fields to track:
-- 1. Current benefit amounts and filing details for users and partners
-- 2. Divorce history for benefit eligibility
-- 3. Widow/widower history for survivor benefits

-- Add benefit tracking columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS current_benefit_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS benefit_filing_date DATE,
ADD COLUMN IF NOT EXISTS benefit_filing_age INTEGER,
ADD COLUMN IF NOT EXISTS benefit_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS ever_divorced BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ever_widowed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS divorce_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS widow_count INTEGER DEFAULT 0;

-- Add benefit tracking columns to partners table
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS current_benefit_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS benefit_filing_date DATE,
ADD COLUMN IF NOT EXISTS benefit_filing_age INTEGER,
ADD COLUMN IF NOT EXISTS benefit_type VARCHAR(50);

-- Create divorce_history table
CREATE TABLE IF NOT EXISTS divorce_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ex_spouse_number INTEGER NOT NULL,
  marriage_start_date DATE,
  divorce_date DATE,
  marriage_length_years INTEGER,
  marriage_length_months INTEGER,
  ex_spouse_alive BOOLEAN DEFAULT TRUE,
  ex_spouse_date_of_death DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, ex_spouse_number)
);

-- Create widow_history table
CREATE TABLE IF NOT EXISTS widow_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  spouse_number INTEGER NOT NULL,
  marriage_start_date DATE,
  spouse_date_of_death DATE,
  user_age_at_death INTEGER,
  marriage_length_years INTEGER,
  marriage_length_months INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, spouse_number)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_divorce_history_user_id ON divorce_history(user_id);
CREATE INDEX IF NOT EXISTS idx_widow_history_user_id ON widow_history(user_id);

-- Add comments for documentation
COMMENT ON COLUMN profiles.current_benefit_amount IS 'Monthly Social Security benefit amount if already receiving benefits';
COMMENT ON COLUMN profiles.benefit_filing_date IS 'Date when benefits were filed/started';
COMMENT ON COLUMN profiles.benefit_filing_age IS 'Age when benefits were filed (in years)';
COMMENT ON COLUMN profiles.benefit_type IS 'Type of benefit: retirement, disability, survivor, etc.';
COMMENT ON COLUMN profiles.ever_divorced IS 'True if user has ever been divorced (affects benefit eligibility)';
COMMENT ON COLUMN profiles.ever_widowed IS 'True if user has ever been widowed (affects survivor benefits)';
COMMENT ON COLUMN profiles.divorce_count IS 'Number of times divorced';
COMMENT ON COLUMN profiles.widow_count IS 'Number of times widowed';

COMMENT ON TABLE divorce_history IS 'Tracks divorce history for ex-spouse benefit eligibility (10-year rule)';
COMMENT ON TABLE widow_history IS 'Tracks widow/widower history for survivor benefit eligibility';
