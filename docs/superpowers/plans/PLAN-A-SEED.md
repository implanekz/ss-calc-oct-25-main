# Plan A seed — wire the earnings record into the PIA that drives the chart

Inputs gathered during the 2026-08-13 scenario-model branch. Read this before planning Plan A.

## Goal

Make the uploaded SSA earnings record actually drive the benefit figures on the chart, replacing the "estimate" with a verified, earnings-derived PIA.

The previous plan built the plumbing — persistence, fetch, the work-stop ladder, and a provenance banner — but never connected the earnings record to the PIA the chart uses. The banner was corrected to say so honestly ("Earnings Record On File", with explicit copy that chart amounts still come from the entered PIA). Plan A closes that gap.

## Hard constraint (from Kurt, 2026-08-13)

**Anyone who wants to enter only their PIA must be able to finish, get full value, and never be pushed down the XML route.** The earnings record is an *upgrade* to the manually entered PIA, never a prerequisite. Plan A must add an earnings-derived PIA as an additional, adoptable source — the entered-PIA path stays complete and first-class on its own.

## Target user (important — invalidates some existing test fixtures)

**This calculator is for people roughly age 58 and up.** It was never built for 45-year-olds. Consequences:

- Test fixtures built around a 45-year-old (born 1981) are out of range and their results are not evidence of anything. The realistic in-range fixture is someone ~58-62 today.
- Users in range are 0-4 years from age 62, so the future-projection window is short and the carry-forward assumption is far less load-bearing than it would be for a younger user.
- **Most in-range users will already have 35+ earnings years.** The "you already have 35 strong earnings years, working longer has little effect" case is the COMMON case, not the edge case — it deserves first-class treatment, not just a conditional message.
- Verified in-range evidence from the ladder (born 1966, 39 earnings years, stop ages 62/65/67/70): PIA `3414.93 / 3532.05 / 3607.10 / 3710.72`, about **$296/month** between stopping at 62 and 70. That is the real product behavior for the real audience.

## MUST RESOLVE FIRST — indexed earnings are capped at the wrong point

`backend/core/ssa_xml_processor.py:248-256` caps earnings at the taxable maximum **after** indexing them.

Indexing multiplies historical earnings by `AWI(indexing_year) / AWI(earnings_year)`, so an indexed value legitimately exceeds that year's nominal taxable maximum — that is what indexing is for. Capping post-indexing truncates the indexed history and **systematically understates PIA for ordinary earners.**

The cap belongs on the *nominal* earnings before indexing (SSA caps what goes into the record, then indexes what's left).

Kurt's direction (2026-08-13): *"Your #2 is a huge deal and we need to follow that thread until it's resolved."* Follow it fully — do not patch around it:
- Determine the correct cap point and fix it.
- Quantify the impact: how much was PIA understated, for which earnings profiles, at which ages?
- Check whether any stored or displayed value was computed under the bug and needs recomputation.
- Add tests using a high earner whose indexed earnings exceed the nominal cap — the current suite does not catch this.

Also in that file: a **duplicate `calculate_aime_and_pia`** — the first definition is dead code.

## Open design decision

`frontend/src/components/PIACalculator.jsx:476` auto-runs `calculatePIA()` over the projected (carried-forward) rows, so the headline PIA includes assumed future earnings — roughly +13% for a young user, far less for the real 58+ audience. This is disclosed only by green "Projected" rows in the table, not next to the PIA figure. SSA's own statement also projects, so this may be correct-but-undisclosed rather than wrong. **Needs an explicit decision and probably a label.**

## Carried-over gaps (each verified, none merged as fixed)

- `areScenariosComparable` compares live `inflation`, not the frozen `assumptions.colaRate`. Warning comment at the function; no code fix. Must be settled before the scenario-comparison chart. See `scenario.js`.
- The work-stop ladder reads only `scenario.earnings.spouse1`. A spouse2-only record shows the on-file banner with no ladder — a real gap for married households, and Plan A's household framing should close it.
- "Zero years in top 35" is derived algebraically (`35 - nonZeroYears`) in the PIACalculator table but computed by a real sort/count in the upload toast. Duplicate logic that can diverge.
- `POST /api/work-stop-ladder` is unauthenticated while accepting an earnings history in the body. Consistent with four sibling calculation endpoints, so it is a pre-existing repo-wide posture, not a new hole — but it deserves a deliberate decision.
- `calculation_routes.py` registers its router with no `/api` prefix, so its routes sit at bare root while `earnings` uses `/api/earnings`. `/api/work-stop-ladder` uses a literal full path to compensate.
- Migration files are not idempotent (`CREATE POLICY` and `CREATE TRIGGER` both fail on re-run). Consistent with 001-004.

## Resolved facts worth keeping

- **`SUPABASE_KEY` in production must be the service-role key** — an anon key would make `auth.uid()` NULL and break every existing feature. RLS is therefore bypassed; isolation rests on the `.eq("user_id", ...)` filters, which `backend/api/earnings.py` applies correctly on all three routes.
- Migration 005 (`earnings_records`) is applied and verified in the live database: 8 columns, 4 policies, 1 trigger, RLS enabled.
- The SSA XML carries only name, SSN, birth date, statement date, one `EstimatedPIA`, and year/earnings pairs. Nothing else.
- **Do not build a PDF statement parser.** The PDF has SSA's own 62/FRA/70 estimates, survivor estimates, the family maximum, a disability estimate, credits/insured status, and taxes paid — but parsing it is brittle and storing it would put SSN-bearing identity documents in the database. The current design deliberately keeps SSN and name out of storage (`earnings_records` holds neither). Instead capture 2-3 numbers as optional typed cross-checks ("what does your statement say at FRA?"), which validates the PIA engine against SSA's own arithmetic and yields a real test set for the family-maximum work.

## Added 2026-08-13 — statement vintage

`earnings_records` has **no `statement_date` column**, and `EarningsRecordOut` does not carry one. `ssa_xml_processor.py:109-120` parses `<StatementDate>` (fallbacks `<AsOfDate>`, `<DateGenerated>`) and comments that it is critical for AWI accuracy — then it is discarded. `created_at` records when the user *uploaded*, which can be years after SSA *generated* the statement.

Plan A must add the column, thread it through the API and the frontend service, and use it. A hand-typed PIA has no date at all, so its vintage is simply unknowable — treat it accordingly.

Staleness always biases **understated**, for two independent reasons: missing recent earnings years (each can displace a zero or low year in the top 35) and missing COLAs since the statement year. This is a **third** cause of "our number differs from their statement," alongside the assumption difference and engine defects — the three must never be conflated in code or in copy.

Related: the indexing year is `birth_year + 60`, but AWI for year N is not published until autumn of N+1, so anyone turning 60 this year or later silently falls back to `max(AVERAGE_WAGE_INDEX.values())`. That hits the youngest slice of the 58+ audience (born 1966 indexes to 2026, unavailable until late 2027). Surface it rather than hide it.

**The XML is self-dating; the PIA cannot be.** That is a second, independent reason the earnings record outranks the entered PIA: it is the only input whose vintage is knowable. The remedy for staleness is cheap — send the user back for a fresh download, from the same SSA page they already used.

But separate two signals: **file vintage** (`today − statement_date`) and **data gap** (`(current year − 1) − last earnings year`). SSA's posting lags, so a file generated today can still be missing last year. Old file + gap → prompt for re-download. Fresh file + gap → SSA has not posted yet; explain the lag rather than sending them on a wasted trip.
