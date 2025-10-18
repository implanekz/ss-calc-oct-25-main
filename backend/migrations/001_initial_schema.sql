-- ============================================
-- Supabase Database Schema for Ret1re Platform
-- Run this in the Supabase SQL Editor
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE (1:1 with auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  relationship_status TEXT NOT NULL CHECK (relationship_status IN ('single', 'married', 'divorced', 'widowed')),
  
  -- PIA Information
  pia_at_fra NUMERIC(10, 2),
  already_receiving_benefits BOOLEAN DEFAULT FALSE,
  current_monthly_benefit NUMERIC(10, 2),
  filed_age_years INTEGER,
  filed_age_months INTEGER,
  
  -- Preferred Claiming Age
  preferred_claiming_age_years INTEGER DEFAULT 67,
  preferred_claiming_age_months INTEGER DEFAULT 0,
  
  -- Metadata
  onboarding_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- 2. PARTNERS TABLE (Spouse, Ex-Spouse, Deceased)
-- ============================================
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('spouse', 'ex_spouse', 'deceased_spouse')),
  
  -- Partner basic info
  date_of_birth DATE,
  pia_at_fra NUMERIC(10, 2),
  already_receiving_benefits BOOLEAN DEFAULT FALSE,
  current_monthly_benefit NUMERIC(10, 2),
  filed_age_years INTEGER,
  filed_age_months INTEGER,
  
  -- Divorce-specific fields
  divorce_date DATE,
  marriage_length_years INTEGER,
  
  -- Widowed-specific fields
  date_of_death DATE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own partners" ON partners
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 3. CHILDREN TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date_of_birth DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own children" ON children
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 4. CALCULATOR PREFERENCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS calculator_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  inflation_rate NUMERIC(5, 4) DEFAULT 0.025,
  spouse_preferred_claiming_age_years INTEGER,
  spouse_preferred_claiming_age_months INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE calculator_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences" ON calculator_preferences
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 5. UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to profiles
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to partners
CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON partners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to calculator_preferences
CREATE TRIGGER update_calculator_preferences_updated_at BEFORE UPDATE ON calculator_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_partners_user_id ON partners(user_id);
CREATE INDEX IF NOT EXISTS idx_children_user_id ON children(user_id);
CREATE INDEX IF NOT EXISTS idx_calculator_preferences_user_id ON calculator_preferences(user_id);

-- ============================================
-- 7. HELPER FUNCTION: GET_USER_PROFILE_WITH_RELATIONS
-- ============================================
CREATE OR REPLACE FUNCTION get_user_profile_with_relations(user_uuid UUID)
RETURNS TABLE (
  profile_id UUID,
  first_name TEXT,
  last_name TEXT,
  date_of_birth DATE,
  relationship_status TEXT,
  pia_at_fra NUMERIC,
  partner JSON,
  children JSON,
  preferences JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.date_of_birth,
    p.relationship_status,
    p.pia_at_fra,
    json_agg(DISTINCT jsonb_build_object(
      'id', pt.id,
      'relationship_type', pt.relationship_type,
      'date_of_birth', pt.date_of_birth,
      'pia_at_fra', pt.pia_at_fra,
      'already_receiving_benefits', pt.already_receiving_benefits,
      'current_monthly_benefit', pt.current_monthly_benefit,
      'filed_age_years', pt.filed_age_years,
      'filed_age_months', pt.filed_age_months
    )) FILTER (WHERE pt.id IS NOT NULL) as partner,
    json_agg(DISTINCT jsonb_build_object(
      'id', c.id,
      'date_of_birth', c.date_of_birth
    )) FILTER (WHERE c.id IS NOT NULL) as children,
    jsonb_build_object(
      'inflation_rate', cp.inflation_rate,
      'spouse_preferred_claiming_age_years', cp.spouse_preferred_claiming_age_years,
      'spouse_preferred_claiming_age_months', cp.spouse_preferred_claiming_age_months
    ) as preferences
  FROM profiles p
  LEFT JOIN partners pt ON p.id = pt.user_id
  LEFT JOIN children c ON p.id = c.user_id
  LEFT JOIN calculator_preferences cp ON p.id = cp.user_id
  WHERE p.id = user_uuid
  GROUP BY p.id, p.first_name, p.last_name, p.date_of_birth, p.relationship_status, p.pia_at_fra, cp.inflation_rate, cp.spouse_preferred_claiming_age_years, cp.spouse_preferred_claiming_age_months;
END;
$$ LANGUAGE plpgsql;
