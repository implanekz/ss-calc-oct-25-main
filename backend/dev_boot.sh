#!/bin/sh
# Local dev boot: several routers call get_supabase_client() at import time,
# which raises if SUPABASE_URL/KEY are unset. Dummy values let the app import
# and serve unauthenticated routes (upload-ssa-xml, work-stop-ladder, etc.);
# anything that actually calls Supabase (auth, /api/earnings) will fail at
# request time, which is expected without real credentials.
export SUPABASE_URL="${SUPABASE_URL:-http://localhost.invalid}"
export SUPABASE_KEY="${SUPABASE_KEY:-dev-placeholder-key}"
exec venv/bin/uvicorn core.integrated_ss_api:app --host 0.0.0.0 --port 8000
