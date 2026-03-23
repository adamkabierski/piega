-- piega-agents: reports table
-- This table stores report requests and progressive agent results.
-- Each agent writes to its own JSONB column as it completes.
-- Supabase Realtime broadcasts UPDATEs to subscribed clients.

-- ═══════════════════════════════════════════════════════════════════
-- TABLE
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS piega_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      TEXT NOT NULL,
  listing         JSONB NOT NULL,
  purpose         TEXT NOT NULL DEFAULT 'live_in'
                  CHECK (purpose IN ('live_in', 'rent_out', 'flip')),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'running', 'complete', 'error')),

  -- Agent results (null until each agent completes)
  classification    JSONB,
  building_reading  JSONB,
  area_analysis     JSONB,
  renovation_plan   JSONB,
  cost_estimate     JSONB,
  media             JSONB,
  narrative         JSONB,

  -- Error tracking
  errors          JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_piega_reports_listing_id ON piega_reports(listing_id);
CREATE INDEX IF NOT EXISTS idx_piega_reports_status ON piega_reports(status);
CREATE INDEX IF NOT EXISTS idx_piega_reports_created_at ON piega_reports(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════
-- AUTO-UPDATE updated_at
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_piega_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_piega_reports_updated_at ON piega_reports;
CREATE TRIGGER trg_piega_reports_updated_at
  BEFORE UPDATE ON piega_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_piega_reports_updated_at();

-- ═══════════════════════════════════════════════════════════════════
-- RLS (permissive for MVP — tighten later with user auth)
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE piega_reports ENABLE ROW LEVEL SECURITY;

-- Allow anon to do everything (MVP only)
DROP POLICY IF EXISTS "piega_reports_anon_all" ON piega_reports;
CREATE POLICY "piega_reports_anon_all" ON piega_reports
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════
-- ENABLE REALTIME
-- ═══════════════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE piega_reports;
