# Note: inflation/COLA modeling — intentionally deferred

**Status:** Known issue, deliberately not fixed yet. Come back to this.

## Kurt's product decision (2026-08-24)

Real SSA inflation indexing happens in three distinct phases, with three different
mechanisms:

1. **Before age 60**: past earnings are wage-indexed via the National Average Wage
   Index (AWI) — not a COLA at all, a different index entirely.
2. **Age 60–62**: a quirky gap where there's effectively no indexing applied in that
   window, but the record catches up by 62 regardless.
3. **Age 62 on**: an annually-declared COLA rate, published year by year, unknowable
   in advance.

Kurt's explicit call: **don't turn users into interest-rate prognosticators.** Nobody —
not Kurt, not the user, not anyone — can predict actual future COLA rates year by year.
So the product deliberately uses a **single flat rate across the entire arc from today
through the end of the user's life**, rather than trying to model phase-by-phase
realism or year-by-year rate variation. The average of real future COLAs may not land
far from a reasonable flat assumption — that's the bet, and it's intentional, not a
simplification to fix.

**This is the intended model for inflation/COLA everywhere in Lifelong Navigator**, not
just the areas touched this session. Do not "fix" this by trying to model the three
real phases more precisely — that would work against the actual product decision.

## What IS a real bug, still open

Independent of the above, this session's work (see the `feature/our-lifelong-timeline`
branch, commits around `255b910`/`12dee72`) found that the shared engine applies the
*single flat rate* Kurt wants using two different, inconsistent conventions:

- **Pre-claim growth** — `preclaimColaFactor` in
  [`frontend/src/utils/benefitFormulas.js`](../../../frontend/src/utils/benefitFormulas.js) —
  compounds by `Math.floor(claimAgeYears) - 62`, i.e. whole **age-years** since the
  person's own 62nd birthday.
- **Post-claim growth** — `benefitAfterClaim` calls in
  [`frontend/src/calculators/showMeTheMoney/projections.js`](../../../frontend/src/calculators/showMeTheMoney/projections.js) —
  compounds by `year - claimingCalendarYear`, i.e. whole **calendar years** since the
  year of claiming.

Age-year and calendar-year boundaries only coincide for a January birthday. For
everyone else, sweeping the exact filing month by month (as "One Month at a Time" does)
can show cumulative lifetime income *dip* right at the point a filing choice crosses a
calendar-year boundary, even though the flat-rate model is being applied "correctly" by
each function's own convention — the two conventions just don't agree with each other.

This is **not** something this session introduced. It predates this session's other
fix (which corrected a *different*, separate bug: `calculateProjection` ignoring
`filingMonth` entirely when picking which calendar year a claim starts in). It also
isn't unique to "One Month at a Time" — `preclaimColaFactor` is used throughout the
main calculator, so the same inconsistency is latent everywhere pre-claim COLA and
post-claim COLA interact, just invisible anywhere that doesn't sweep individual filing
months as its primary interaction.

## When picking this back up

The fix should make both phases compound on the **same** convention (both by calendar
year, most likely, since real COLA is administered on a calendar schedule) — while
preserving Kurt's single-flat-rate decision above. This touches `preclaimColaFactor`,
which is called from several places beyond this feature, so it needs its own careful
pass and regression tests (a nonzero-inflation monotonicity sweep across filing months,
for a non-January DOB, would have caught this class of bug and should be added
alongside the fix).
