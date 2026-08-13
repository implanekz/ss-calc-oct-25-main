-- Migration 005: Persist SSA earnings records
-- Until now, uploaded earnings existed only in React state and were lost on reload.
-- One record per person per user: 'self' or 'partner'.

CREATE TABLE IF NOT EXISTS earnings_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  person TEXT NOT NULL CHECK (person IN ('self', 'partner')),
  birth_year INTEGER NOT NULL CHECK (birth_year BETWEEN 1937 AND 2010),
  -- rows: [{"year": int, "earnings": number, "is_projected": bool}]
  rows JSONB NOT NULL DEFAULT '[]',
  source TEXT NOT NULL DEFAULT 'ssa_xml',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, person)
);

ALTER TABLE earnings_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own earnings" ON earnings_records
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own earnings" ON earnings_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own earnings" ON earnings_records
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own earnings" ON earnings_records
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_earnings_records_user ON earnings_records (user_id);

CREATE TRIGGER update_earnings_records_updated_at BEFORE UPDATE ON earnings_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
