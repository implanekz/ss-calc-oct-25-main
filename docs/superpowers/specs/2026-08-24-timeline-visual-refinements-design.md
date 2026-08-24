# Our Lifelong Timeline — Visual Refinements — Design

Status: approved by Kurt, pending spec review
Author: Kurt + Claude (annotated-screenshot feedback session, 2026-08-24)
Related: extends `docs/superpowers/specs/2026-08-23-timeline-narrated-milestones-design.md` (the narrated-milestones module this refines, not replaces — the Feel/milestoneNotes/doLine/survivorNote narrative from that spec is kept, not removed).

## Problem

Live-testing feedback on the shipped narrated-milestones module (annotated screenshots, 2026-08-24) surfaced five concrete visual/interaction problems:

1. The yellow "Preliminary Lifelong Estimate" banner above the chart is confusing to non-technical users and unrelated to this module — it should be removed for now.
2. Milestone markers, even after the previous slice made them visible, are still too small/subtle, and don't show their exact calendar year — a user has to trace down to the nearest 5-year axis gridline to know when something happens.
3. When a person's chosen filing age coincides with another milestone's year (e.g. Ted's filing age of 67 exactly equals his FRA), `getMilestonesForPerson` silently drops the "chosen filing age" marker to avoid a duplicate-year collision. This produces a visible, confusing asymmetry: Mary (whose filing age differs from her FRA) shows a "Filed" marker; Ted does not, even though both have a chosen filing age.
4. The Potential Premature Death toggle changes the underlying numbers correctly but has no visual presence on the timeline itself — there's no way to see, at a glance, when in the household's future that scenario begins.
5. The cursor tooltip overlaps the second person's phase bar (visibly cutting into "Slow-Go" text), and its numbers — one big "actual plan" reveal plus a stacked list of hypothetical totals — are harder to compare at a glance than a side-by-side layout would be. It also runs off the right edge of the visible scroll window when the cursor is dragged late enough in the timeline.

## Goal

Address all five directly, keeping every piece of the narrated-milestones module (Feel line, milestone notes, Do line, survivor note, the underlying `buildNarrative` architecture) intact — this is a presentation/layout refinement, not a redesign of the narrative system.

## Non-goals for this version

- **No new financial calculations.** Every number this spec touches — the 62/70 hypothetical monthly and cumulative totals, the actual-plan monthly and cumulative totals — is already computed by existing code (`getHouseholdBucket`'s `.monthly`/`.cumulative`, and `combinedProjections.preferred.monthly`/`.cumulative`, which `combineProjections()` already returns). This is entirely a data-shaping/presentation exercise.
- **No auto-play, no go-go/slow-go transition narration, no "stopped working" beat** — still deferred, same as the prior spec's Non-goals.
- **No redesign of the Go-Go/Slow-Go/No-Go phase bars themselves** — only the markers layered on top of them, and the tooltip beneath them, change.
- **The 67-year-old fixed comparison bucket is retired, not relabeled.** `BUCKET_FILING_AGES` shrinks from `[62, 67, 70]` to `[62, 70]`; the middle position in the redesigned tooltip is the household's actual/preferred scenario (each person's own real filing age), not a third fixed hypothetical. This is a deliberate simplification per Kurt's stated goal ("I don't want people overwhelmed with numbers they don't understand") — a fixed 67 didn't correspond to anything the user chose, while "your actual plan" always does.

## Design

### 1. Remove the "Preliminary Lifelong Estimate" banner

`ShowMeTheMoneyCalculator.jsx`'s Earnings Provenance Banner currently renders one of two variants based on `scenario.provenance`: an amber "Preliminary Lifelong Estimate" box when `provenance === PROVENANCE.ESTIMATED`, or an emerald "verified record" box otherwise. Only the amber variant is removed (render nothing for that case); the emerald variant, which was not flagged, is untouched.

### 2. Bolder, year-labeled milestone markers

In `CalendarPhaseBar.jsx`, each milestone marker's three pieces get more visual weight:
- **Dot**: larger (from the current 10px to roughly 14px).
- **Vertical line**: thicker (from the current 1px hairline to 4px — matching the width already used for the Go-Go/Slow-Go drag handles' own bar, so the two interactive elements share a visual language).
- **Chip**: becomes two lines instead of one — the existing kind abbreviation ("62", "FRA", "Filed", "70") on top, the milestone's exact calendar year beneath it in smaller text — so the year is always visible without needing `title`-hover or tracing to the axis.

### 3. Chosen-filing-age marker always shows, offset when it collides

`getMilestonesForPerson` (`timelineMath.js`) currently skips adding the `chosenFilingAge` milestone when its year matches an existing one, specifically to avoid two markers landing on the same year. That skip is removed — the chosen-filing-age milestone is always added when a valid preferred year exists, even if it lands on the same year as `age62`/`fra`/`age70`. (This is a deliberate reversal of the prior spec's dedup behavior, confirmed with Kurt — not an oversight.)

Because two (never three — only `chosenFilingAge` is variable, so at most one of the three fixed milestones can coincide with it for a given person) markers can now share an x-position, `CalendarPhaseBar` groups milestones by year before rendering and staggers same-year markers vertically: the first at the existing height, the second raised further above it by a fixed additional offset. This keeps each marker's horizontal position exactly accurate (the year it actually represents) rather than nudging it sideways, which would misrepresent the year.

The container's top padding (`pt-8` in `OurLifelongTimeline.jsx`, currently sized for the row label's needs) must grow to fit the worst case: a stacked two-level marker with the new bolder/two-line chip styling extending furthest above the bar.

### 4. Death-year marker

A new small presentational component, `DeathMarker.jsx`, renders a single marker at `deathYear` — shown once per timeline (not duplicated per person, since the underlying survivor adjustment is symmetric and doesn't identify which spouse died, matching the neutral `survivorNote` wording already shipped). It's visually distinct from the four per-person milestone kinds (a neutral/dark color, its own icon, label "Loss of a spouse"), spans the full vertical height of both rows (similar to how the inspection cursor's own track spans both rows) rather than sitting on one person's row specifically, and only renders when `prematureDeath` is true. It computes its own year-to-percent position the same way `CalendarPhaseBar` and `TimelineCursor` already do (`axisStartYear`/`axisEndYear`/`pxPerYear` in, no shared utility needed for this — consistent with the existing pattern of each component owning that small conversion).

### 5. Tooltip redesign: three boxes, anchored below both rows, position-aware

**Position:** the tooltip no longer renders inside the draggable cursor-line element near the top of the shared span (today's `top-4 left-3`, which overlaps the second person's bar). It renders below both phase-bar rows entirely — vertically positioned past the two rows' combined height (each row 52px, one `mb-8` gap between them) plus a small clearance, so it can never overlap either bar regardless of content height.

**Left/right flip:** the tooltip's horizontal anchor flips from growing rightward off the cursor to growing leftward when there isn't enough visible room to its right. This requires knowing the scroll container's actual visible width and current scroll position (not just the total scrollable content width, since a user who has manually scrolled partway through the timeline needs the flip to react to what's currently on screen) — `OurLifelongTimeline.jsx`'s scroll container gets a ref, and tracks its `clientWidth` and `scrollLeft` (via a `ResizeObserver` for width changes and a `scroll` listener for position changes, the same category of measurement `RaceTrackVisualization` elsewhere in this codebase already does with a `ResizeObserver`). The cursor's pixel position minus the current `scrollLeft`, compared against the container's `clientWidth` minus the tooltip's own width and a small margin, decides the flip.

**Content:** the narrative header (Feel line, milestone notes, Do line, survivor note — everything `buildNarrative` already produces) stays exactly as it is today, just relocated above the three-box row instead of above the old single stacked list. Below it, three boxes side by side:

| Box | Label | Big (primary emphasis) | Small (secondary) |
|---|---|---|---|
| Left | "If both filed at 62" | `$X,XXX/month · $Y,YYY/year` from the 62 bucket's `.monthly[year]` | running total from the 62 bucket's `.cumulative[year]` |
| Middle | "Your Plan" | `$X,XXX/month · $Y,YYY/year` from `monthlyIncome` (the existing preferred-scenario figure) | running total from `combinedProjections.preferred.cumulative[year]` (already computed by `combineProjections()`, not previously read by this module) |
| Right | "If both filed at 70" | `$X,XXX/month · $Y,YYY/year` from the 70 bucket's `.monthly[year]` | running total from the 70 bucket's `.cumulative[year]` |

Per Kurt's explicit instruction, the monthly/yearly figures are the large, blue, primary-emphasis text in every box (matching today's `think` line styling); the running totals are present but visually secondary (smaller, muted), reversing which number dominates compared to today's design where only a cumulative total is shown per hypothetical. The left/right boxes keep the existing muted "starts `<year>`" treatment (for both the monthly/yearly line and the running total) when `year` is before that bucket's `startYear` — same convention `formatBucketValue` already established, extended to the new monthly/yearly figure.

A new pure function in `timelineMath.js`, replacing the tooltip's direct use of `formatBucketValue`/`buckets.map` for this purpose, builds all three boxes' display-ready content (label, big text, small text, muted flag) from `buckets` (now just the 62/70 pair), `year`, `monthlyIncome`, and the new `cumulativeIncome` value — so `TimelineCursor` stays a pure renderer, consistent with how `buildNarrative` already keeps narrative content out of the component.

## Data flow

No new source of truth and no new financial math, per Non-goals. The only previously-unused-by-this-module value now read is `combinedProjections.preferred.cumulative[year]` — already computed by the existing `combineProjections()` call in `ShowMeTheMoneyCalculator.jsx` that builds `scenarioData.combinedProjections`, exactly parallel to how `.preferred.monthly[year]` is already read today. `BUCKET_FILING_AGES` shrinks from three entries to two (`[62, 70]`); `getHouseholdBuckets` and `getHouseholdBucket` need no signature changes, they simply get called with a shorter list.

## Testing notes

- `getMilestonesForPerson`: existing test asserting the chosen-filing-age milestone is dropped on collision must be replaced with one asserting it is always present, including the collision case (both entries at the same year, in the established array order: the fixed milestone first, `chosenFilingAge` appended and sorted alongside it).
- New pure function for the three tooltip boxes: cases for muted (before `startYear`) and non-muted 62/70 boxes, and the middle "Your Plan" box (never muted, reflects `monthlyIncome`/`cumulativeIncome` directly).
- `BUCKET_FILING_AGES`/`getHouseholdBuckets` tests updated for the two-entry array.
- Manual verification: markers visibly bolder with year labels; a same-year collision (e.g. set a preferred filing age equal to FRA) renders two stacked, non-overlapping markers; the death-year marker appears only when Potential Premature Death is on, once, not duplicated per row; the tooltip never overlaps either phase bar at any cursor position; dragging the cursor near the right edge of the currently-scrolled-into-view window flips the tooltip to the left side.
