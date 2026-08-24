# Timeline Visual Refinements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Five visual refinements to Our Lifelong Timeline: remove the "Preliminary Lifelong Estimate" banner, bolder year-labeled milestone markers with stacking for same-year collisions, a new death-year marker, and a 3-box position-aware tooltip redesign (62 / your plan / 70, monthly-yearly emphasized over lifetime totals).

**Architecture:** All new display-shaping logic (the 3-box tooltip content) is a new pure function in the existing `timelineMath.js`, following the same pattern `buildNarrative` already established. `CalendarPhaseBar.jsx` gains a stacking layout for same-year markers. A new small presentational component, `DeathMarker.jsx`, mirrors the existing pattern of each component owning its own year-to-percent conversion. `OurLifelongTimeline.jsx` gains a scroll-container ref (for the tooltip's left/right flip) and computes one previously-unused value (`combinedProjections.preferred.cumulative[year]`) that already existed in data the module already receives.

**Tech Stack:** React (function components, hooks, `ResizeObserver`), Jest for the pure-logic unit tests (only `timelineMath.js` has a `.test.js` file in this module — the four presentational components are verified manually in-browser, matching this module's established convention).

## Global Constraints

- No new financial calculations — every number this plan touches is already computed by existing code (`getHouseholdBucket`'s `.monthly`/`.cumulative`, and `combinedProjections.preferred.monthly`/`.cumulative`, which `combineProjections()` already returns).
- `BUCKET_FILING_AGES` shrinks from `[62, 67, 70]` to `[62, 70]` — the middle tooltip position becomes the household's actual/preferred scenario, not a third fixed hypothetical.
- The chosen-filing-age milestone is always included now, even when it lands on the same year as another milestone — `CalendarPhaseBar` stacks same-year markers vertically instead of `getMilestonesForPerson` dropping one.
- Monthly/yearly figures are the large, primary-emphasis text in every tooltip box; lifetime running totals are present but visually secondary (smaller, muted) — reader should know where to look first (Kurt's explicit visual-hierarchy guidance).
- The death-year marker renders once per timeline, not duplicated per person — the underlying survivor adjustment is symmetric and doesn't identify which spouse died (matches the already-shipped neutral `survivorNote` wording).
- The narrative header (Feel line, milestone notes, Do line, survivor note) from the prior narrated-milestones slice is kept as-is, just relocated — not redesigned.
- No auto-play, no go-go/slow-go transition narration, no "stopped working" beat, no redesign of the phase bars themselves — still deferred, unchanged from prior specs.

Full spec: `docs/superpowers/specs/2026-08-24-timeline-visual-refinements-design.md`

---

## Task 1: Remove the "Preliminary Lifelong Estimate" banner

**Files:**
- Modify: `frontend/src/components/ShowMeTheMoneyCalculator.jsx:3780-3789`

**Interfaces:** None — this task has no dependents; it's a fully isolated deletion.

- [ ] **Step 1: Remove the amber banner's content, keep the emerald banner untouched**

Find this block in `frontend/src/components/ShowMeTheMoneyCalculator.jsx` (inside the "Earnings Provenance Banner" section):

```jsx
                    {scenario.provenance === PROVENANCE.ESTIMATED ? (
                        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 mb-4">
                            <div className="font-semibold text-amber-900">Preliminary Lifelong Estimate</div>
                            <p className="text-sm text-amber-800 mt-1">
                                These numbers assume your future earnings continue at their current level.
                                Add your Social Security earnings record to see what stopping work at
                                different ages would do to your benefit.
                            </p>
                        </div>
                    ) : (
```

Replace it with (renders nothing for the ESTIMATED case; the `) : (` that follows, and the emerald banner's JSX after it, stay exactly as they are — only the amber branch's content changes):

```jsx
                    {scenario.provenance === PROVENANCE.ESTIMATED ? null : (
```

- [ ] **Step 2: Run the CI build to confirm no lint errors**

Run: `cd frontend && CI=true npm run build`
Expected: `Compiled successfully.`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ShowMeTheMoneyCalculator.jsx
git commit -m "fix(timeline): remove the Preliminary Lifelong Estimate banner for now"
```

---

## Task 2: Chosen-filing-age milestone always shows, even on collision

**Files:**
- Modify: `frontend/src/components/OurLifelongTimeline/timelineMath.js`
- Modify: `frontend/src/components/OurLifelongTimeline/timelineMath.test.js`

**Interfaces:**
- Produces: `getMilestonesForPerson({ label, dob, preferredYear })` — same signature and return shape as before (`Array<{ year, label, kind }>`, sorted ascending by year), but no longer drops `chosenFilingAge` on a year collision.

- [ ] **Step 1: Update the test that currently asserts the collision is dropped**

In `frontend/src/components/OurLifelongTimeline/timelineMath.test.js`, find:

```javascript
  test('does not duplicate a milestone when the chosen filing age matches an existing one', () => {
    const milestones = getMilestonesForPerson({ label: 'Ted', dob: '1965-06-15', preferredYear: 67 });

    // 67 is Ted's FRA (born 1965) -- chosenFilingAge must not appear as a second 2032 entry.
    expect(milestones).toHaveLength(3);
    expect(milestones.map(m => m.kind)).toEqual(['age62', 'fra', 'age70']);
  });
```

Replace it with:

```javascript
  test('always includes the chosen-filing-age milestone, even when it collides with another milestone\'s year', () => {
    const milestones = getMilestonesForPerson({ label: 'Ted', dob: '1965-06-15', preferredYear: 67 });

    // 67 is Ted's FRA (born 1965) -- both entries must be present at year 2032. Stable sort
    // preserves push order for ties, so the fixed milestone (pushed first) sorts before the
    // chosen-filing-age one (pushed after, once preferredYear is known to be valid).
    expect(milestones).toHaveLength(4);
    expect(milestones.map(m => m.kind)).toEqual(['age62', 'fra', 'chosenFilingAge', 'age70']);
    expect(milestones[1].year).toBe(2032);
    expect(milestones[2].year).toBe(2032);
  });
```

- [ ] **Step 2: Run the test to verify it fails against the current implementation**

Run: `cd frontend && CI=true npx react-scripts test src/components/OurLifelongTimeline/timelineMath.test.js --watchAll=false`
Expected: FAIL — the current implementation still drops the collision, so `milestones` has length 3, not 4.

- [ ] **Step 3: Remove the dedup guard**

In `frontend/src/components/OurLifelongTimeline/timelineMath.js`, find:

```javascript
  const numericPreferredYear = Number(preferredYear);
  // A cleared input (`''`) coerces to 0 via Number(''), which would otherwise place a stray
  // "chosen filing age" milestone at the person's birth year. Skip the milestone entirely
  // when the value isn't a real, in-range filing age.
  if (Number.isFinite(numericPreferredYear) && numericPreferredYear >= 62) {
    const chosenFilingAgeYear = birthYear + numericPreferredYear;
    if (!milestones.some((m) => m.year === chosenFilingAgeYear)) {
      milestones.push({ year: chosenFilingAgeYear, label: `${label}'s chosen filing age`, kind: 'chosenFilingAge' });
    }
  }
```

Replace it with:

```javascript
  const numericPreferredYear = Number(preferredYear);
  // A cleared input (`''`) coerces to 0 via Number(''), which would otherwise place a stray
  // "chosen filing age" milestone at the person's birth year. Skip the milestone entirely
  // when the value isn't a real, in-range filing age. Unlike an earlier version of this
  // function, a chosen filing age landing on the same year as another milestone is still
  // added -- CalendarPhaseBar stacks same-year markers rather than this function dropping one.
  if (Number.isFinite(numericPreferredYear) && numericPreferredYear >= 62) {
    const chosenFilingAgeYear = birthYear + numericPreferredYear;
    milestones.push({ year: chosenFilingAgeYear, label: `${label}'s chosen filing age`, kind: 'chosenFilingAge' });
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && CI=true npx react-scripts test src/components/OurLifelongTimeline/timelineMath.test.js --watchAll=false`
Expected: PASS (all tests, including the updated one)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/OurLifelongTimeline/timelineMath.js frontend/src/components/OurLifelongTimeline/timelineMath.test.js
git commit -m "fix(timeline): always include the chosen-filing-age milestone, even on collision"
```

---

## Task 3: Shrink BUCKET_FILING_AGES to [62, 70] and add the 3-box tooltip content builder

**Files:**
- Modify: `frontend/src/components/OurLifelongTimeline/timelineMath.js`
- Modify: `frontend/src/components/OurLifelongTimeline/timelineMath.test.js`

**Interfaces:**
- Consumes: `formatBucketValue(bucket, year) -> { display, muted }`, `formatCurrency`, `getAnnualIncome` — all already defined earlier in `timelineMath.js`.
- Produces: `BUCKET_FILING_AGES = [62, 70]` (was `[62, 67, 70]`); new `buildFilingComparisonBoxes({ buckets, year, think, cumulativeIncome }) -> Array<{ label: string, bigText: string, smallText: string | null, muted: boolean }>`, always exactly 3 entries in order [62, your-plan, 70]. `buckets` is the 2-element array `getHouseholdBuckets(...)` now returns; `think` is `buildNarrative`'s existing `think` string (Task 7 wires this through — this task doesn't call `buildNarrative` itself, it just accepts the string).

This task also fixes two existing tests that would otherwise break once `getHouseholdBuckets` stops returning a filingAge-67 entry.

- [ ] **Step 1: Update the two tests that assume three bucket ages**

In `frontend/src/components/OurLifelongTimeline/timelineMath.test.js`, find:

```javascript
  test('BUCKET_FILING_AGES is exactly 62, 67, 70', () => {
    expect(BUCKET_FILING_AGES).toEqual([62, 67, 70]);
  });
```

Replace it with:

```javascript
  test('BUCKET_FILING_AGES is exactly 62 and 70', () => {
    expect(BUCKET_FILING_AGES).toEqual([62, 70]);
  });
```

Find:

```javascript
  test('getHouseholdBuckets returns all three ages in order', () => {
    const buckets = getHouseholdBuckets(household);
    expect(buckets.map(b => b.filingAge)).toEqual([62, 67, 70]);
    expect(buckets[2].startYear).toBe(2040);  // Later spouse (birthYear 1970) + filingAge 70 = 2040
  });
```

Replace it with:

```javascript
  test('getHouseholdBuckets returns both ages in order', () => {
    const buckets = getHouseholdBuckets(household);
    expect(buckets.map(b => b.filingAge)).toEqual([62, 70]);
    expect(buckets[1].startYear).toBe(2040);  // Later spouse (birthYear 1970) + filingAge 70 = 2040
  });
```

Find (in the `'premature-death threading into household buckets'` describe block — this one breaks because it looks up a `filingAge === 67` bucket that will no longer exist):

```javascript
  test('getHouseholdBuckets threads prematureDeath/deathYear through to every bucket', () => {
    const deathYear = 2038;
    const buckets = getHouseholdBuckets({ ...household, prematureDeath: true, deathYear });
    const bucket67 = buckets.find((b) => b.filingAge === 67);

    expect(bucket67.monthly[2038]).toBe(2500);
  });
```

Replace it with:

```javascript
  test('getHouseholdBuckets threads prematureDeath/deathYear through to every bucket', () => {
    const deathYear = 2038;
    const buckets = getHouseholdBuckets({ ...household, prematureDeath: true, deathYear });
    const bucket62 = buckets.find((b) => b.filingAge === 62);

    // bucket62's startYear is 2032 (later spouse's 62nd birthday), so 2038 is well within its
    // active range. Survivor-max from the death year on: max(Ted $2500*0.70=$1750, Wendy
    // $2000*0.70=$1400) = $1750/mo.
    expect(bucket62.monthly[2038]).toBe(1750);
  });
```

- [ ] **Step 2: Run tests to verify the three updates fail against the current source**

Run: `cd frontend && CI=true npx react-scripts test src/components/OurLifelongTimeline/timelineMath.test.js --watchAll=false`
Expected: FAIL — the three tests updated in Step 1 now expect `[62, 70]`/a filingAge-62 lookup, but `BUCKET_FILING_AGES` still holds `[62, 67, 70]` until Step 3.

- [ ] **Step 3: Shrink BUCKET_FILING_AGES**

In `frontend/src/components/OurLifelongTimeline/timelineMath.js`, find:

```javascript
// The three claiming-strategy hypotheticals shown in the timeline cursor's tooltip.
export const BUCKET_FILING_AGES = [62, 67, 70];
```

Replace it with:

```javascript
// The two claiming-strategy extremes shown in the timeline cursor's tooltip, bookending the
// household's actual/preferred scenario (shown separately, not as a third fixed hypothetical --
// see buildFilingComparisonBoxes).
export const BUCKET_FILING_AGES = [62, 70];
```

- [ ] **Step 4: Run tests to verify the three updates now pass**

Run: `cd frontend && CI=true npx react-scripts test src/components/OurLifelongTimeline/timelineMath.test.js --watchAll=false`
Expected: PASS — the three tests updated in Step 1.

- [ ] **Step 5: Write the failing tests for buildFilingComparisonBoxes**

Add to `frontend/src/components/OurLifelongTimeline/timelineMath.test.js`:

```javascript
import { buildFilingComparisonBoxes } from './timelineMath';

describe('buildFilingComparisonBoxes', () => {
  // Reuses the Ted/Wendy household fixture: Ted born 1965-06-15 PIA $2500, Wendy born
  // 1970-06-15 PIA $2000, inflation 0. bucket62 startYear = 2032, bucket70 startYear = 2040.
  const household = {
    spouse1Pia: 2500,
    spouse1Dob: '1965-06-15',
    spouse2Pia: 2000,
    spouse2Dob: '1970-06-15',
    inflation: 0
  };

  test('returns exactly 3 boxes in order: 62, your plan, 70', () => {
    const buckets = getHouseholdBuckets(household);
    const boxes = buildFilingComparisonBoxes({
      buckets,
      year: 2032,
      think: '$3,150/month · $37,800/year',
      cumulativeIncome: 100000
    });

    expect(boxes).toHaveLength(3);
    expect(boxes.map((b) => b.label)).toEqual(['If both filed at 62', 'Your Plan', 'If both filed at 70']);
  });

  test('the 62 box is muted with a "starts <year>" bigText before its startYear', () => {
    const buckets = getHouseholdBuckets(household);
    const boxes = buildFilingComparisonBoxes({ buckets, year: 2030, think: '$0/month · $0/year', cumulativeIncome: 0 });

    expect(boxes[0]).toEqual({ label: 'If both filed at 62', bigText: 'starts 2032', smallText: null, muted: true });
  });

  test('the 62 box shows monthly/yearly big text and the cumulative total small once started', () => {
    const buckets = getHouseholdBuckets(household);
    const boxes = buildFilingComparisonBoxes({ buckets, year: 2032, think: '$0/month · $0/year', cumulativeIncome: 0 });

    // Both spouses file at 62: Ted $2500*0.70=$1750 + Wendy $2000*0.70=$1400 = $3150/mo.
    expect(boxes[0]).toEqual({
      label: 'If both filed at 62',
      bigText: '$3,150/month · $37,800/year',
      smallText: '$37,800',
      muted: false
    });
  });

  test('the 70 box mirrors the same muted/unmuted behavior around its own startYear (2040)', () => {
    const buckets = getHouseholdBuckets(household);
    const mutedBoxes = buildFilingComparisonBoxes({ buckets, year: 2039, think: '', cumulativeIncome: 0 });
    expect(mutedBoxes[2]).toEqual({ label: 'If both filed at 70', bigText: 'starts 2040', smallText: null, muted: true });

    const activeBoxes = buildFilingComparisonBoxes({ buckets, year: 2040, think: '', cumulativeIncome: 0 });
    // Delayed to 70: 124% of PIA. Ted $3100 + Wendy $2480 = $5580/mo.
    expect(activeBoxes[2]).toEqual({
      label: 'If both filed at 70',
      bigText: '$5,580/month · $66,960/year',
      smallText: '$66,960',
      muted: false
    });
  });

  test('the middle box always uses the passed-in think/cumulativeIncome directly, never muted', () => {
    const buckets = getHouseholdBuckets(household);
    // Use a cursor year before either bucket has started, to confirm the middle box is
    // independent of bucket startYears entirely.
    const boxes = buildFilingComparisonBoxes({
      buckets,
      year: 2027,
      think: '$1,750/month · $21,000/year',
      cumulativeIncome: 21000
    });

    expect(boxes[1]).toEqual({
      label: 'Your Plan',
      bigText: '$1,750/month · $21,000/year',
      smallText: '$21,000',
      muted: false
    });
  });
});
```

- [ ] **Step 6: Run tests to verify buildFilingComparisonBoxes's tests fail (the function doesn't exist yet)**

Run: `cd frontend && CI=true npx react-scripts test src/components/OurLifelongTimeline/timelineMath.test.js --watchAll=false`
Expected: FAIL — `buildFilingComparisonBoxes` is not exported yet.

- [ ] **Step 7: Add buildFilingComparisonBoxes**

Add to the end of `frontend/src/components/OurLifelongTimeline/timelineMath.js`:

```javascript
export const buildFilingComparisonBoxes = ({ buckets, year, think, cumulativeIncome }) => {
  const [bucket62, bucket70] = buckets;

  const bucketBox = (bucket, label) => {
    const { display: cumulativeDisplay, muted } = formatBucketValue(bucket, year);
    if (muted) {
      return { label, bigText: cumulativeDisplay, smallText: null, muted: true };
    }
    const monthly = bucket.monthly[year] ?? 0;
    return {
      label,
      bigText: `${formatCurrency(monthly)}/month · ${formatCurrency(getAnnualIncome(monthly))}/year`,
      smallText: cumulativeDisplay,
      muted: false
    };
  };

  return [
    bucketBox(bucket62, 'If both filed at 62'),
    { label: 'Your Plan', bigText: think, smallText: formatCurrency(cumulativeIncome), muted: false },
    bucketBox(bucket70, 'If both filed at 70')
  ];
};
```

- [ ] **Step 8: Run all timelineMath tests to verify everything passes**

Run: `cd frontend && CI=true npx react-scripts test src/components/OurLifelongTimeline/timelineMath.test.js --watchAll=false`
Expected: PASS (all tests, including the three updated ones and the five new `buildFilingComparisonBoxes` tests)

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/OurLifelongTimeline/timelineMath.js frontend/src/components/OurLifelongTimeline/timelineMath.test.js
git commit -m "feat(timeline): shrink BUCKET_FILING_AGES to [62,70], add 3-box tooltip content builder"
```

---

## Task 4: Bolder, year-labeled, stackable milestone markers

**Files:**
- Modify: `frontend/src/components/OurLifelongTimeline/CalendarPhaseBar.jsx`

**Interfaces:**
- Consumes: nothing new — same `milestones` prop shape as before (`Array<{ year, label, kind }>`); the array can now legitimately contain two entries with the same `year` (per Task 2), which is what the stacking logic below handles.
- Produces: no interface change — `CalendarPhaseBar`'s props are unchanged. Purely visual.

This is a two-part change: bigger/bolder marker styling (dot, line, chip), and a stacking layout so two milestones sharing a year render at different heights instead of overlapping.

- [ ] **Step 1: Add the stacking constant**

In `frontend/src/components/OurLifelongTimeline/CalendarPhaseBar.jsx`, add below the existing `MILESTONE_STYLES` map:

```javascript
// Vertical px offset applied per stack level when two milestones share a year (e.g. a chosen
// filing age landing on the same year as FRA). A person has at most 4 milestones and only
// chosenFilingAge is variable, so at most 2 can ever collide -- level 0 and level 1 are the
// only cases that exist.
const MARKER_LEVEL_HEIGHT = 48;
```

- [ ] **Step 2: Replace the milestone marker render block with the stacked, bolder version**

Find this block:

```jsx
      {milestones
        .filter((m) => yearToPercent(m.year) >= 0)
        .map((m) => {
          const style = MILESTONE_STYLES[m.kind];
          return (
            <button
              key={`${m.kind}-${m.year}`}
              type="button"
              onClick={() => onMilestoneClick(m.year)}
              className="absolute top-0 bottom-0 w-6 z-10 flex flex-col items-center bg-transparent border-0 p-0 cursor-pointer"
              style={{ left: `calc(${yearToPercent(m.year)}% - 12px)` }}
              title={m.label}
            >
              <span
                className="absolute -top-4 w-2.5 h-2.5 rounded-full border border-white shadow"
                style={{ backgroundColor: style.color }}
              />
              <span className="w-px h-full" style={{ backgroundColor: style.color }} />
              <span
                className="absolute -top-8 whitespace-nowrap text-[10px] font-bold px-1 rounded text-white"
                style={{ backgroundColor: style.color }}
              >
                {style.chip}
              </span>
            </button>
          );
        })}
```

Replace it with:

```jsx
      {(() => {
        const visibleMilestones = milestones.filter((m) => yearToPercent(m.year) >= 0);
        // Group by year so same-year markers (now always present per Task 2, rather than one
        // being silently dropped) stack instead of overlapping. Stack index is assigned in
        // array order, which is already year-sorted -- ties keep getMilestonesForPerson's own
        // push order (fixed milestone first, chosenFilingAge second).
        const stackIndexByKey = {};
        const countByYear = {};
        visibleMilestones.forEach((m) => {
          const key = `${m.kind}-${m.year}`;
          stackIndexByKey[key] = countByYear[m.year] || 0;
          countByYear[m.year] = (countByYear[m.year] || 0) + 1;
        });

        return visibleMilestones.map((m) => {
          const style = MILESTONE_STYLES[m.kind];
          const stackOffset = stackIndexByKey[`${m.kind}-${m.year}`] * MARKER_LEVEL_HEIGHT;

          return (
            <button
              key={`${m.kind}-${m.year}`}
              type="button"
              onClick={() => onMilestoneClick(m.year)}
              className="absolute top-0 bottom-0 w-6 z-10 flex flex-col items-center bg-transparent border-0 p-0 cursor-pointer"
              style={{ left: `calc(${yearToPercent(m.year)}% - 12px)` }}
              title={m.label}
            >
              <span
                className="absolute w-3.5 h-3.5 rounded-full border-2 border-white shadow"
                style={{ backgroundColor: style.color, top: `${-16 - stackOffset}px` }}
              />
              <span className="w-1 h-full rounded-full" style={{ backgroundColor: style.color }} />
              <span
                className="absolute flex flex-col items-center whitespace-nowrap text-white font-bold rounded px-1.5 py-0.5 leading-none"
                style={{ backgroundColor: style.color, top: `${-48 - stackOffset}px` }}
              >
                <span className="text-xs">{style.chip}</span>
                <span className="text-[9px] font-semibold opacity-90">{m.year}</span>
              </span>
            </button>
          );
        });
      })()}
```

- [ ] **Step 3: Manual verification**

No component-testing library exists in this repo; verified visually in Task 8 once wired into the calculator.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/OurLifelongTimeline/CalendarPhaseBar.jsx
git commit -m "feat(timeline): make milestone markers bolder, year-labeled, and stackable"
```

---

## Task 5: DeathMarker component

**Files:**
- Create: `frontend/src/components/OurLifelongTimeline/DeathMarker.jsx`

**Interfaces:**
- Produces: default export `DeathMarker`, props `{ axisStartYear, axisEndYear, deathYear, pxPerYear }`. Used by Task 6 as a sibling of the two `CalendarPhaseBar` rows and `TimelineCursor`, not nested inside either -- rendering it at that level (rather than inside a person's row) is what makes its vertical line span both rows.

- [ ] **Step 1: Write the component**

```jsx
// frontend/src/components/OurLifelongTimeline/DeathMarker.jsx
import React from 'react';

// Neutral/dark, distinct from all four MILESTONE_STYLES colors in CalendarPhaseBar.jsx --
// this marker represents a household event (loss of a spouse), not a personal milestone.
const DEATH_MARKER_COLOR = '#4B5563';

const DeathMarker = ({ axisStartYear, axisEndYear, deathYear, pxPerYear }) => {
  const totalYears = axisEndYear - axisStartYear;
  const yearToPercent = (year) => ((year - axisStartYear) / totalYears) * 100;
  const percent = yearToPercent(deathYear);

  // Same convention CalendarPhaseBar's own milestones use: a marker before the visible axis
  // start would sit off-canvas to the left of the overflow-x-auto track with no way to scroll
  // to it -- skip rendering it entirely rather than leave an unreachable marker.
  if (percent < 0) return null;

  return (
    <div
      className="absolute top-0 bottom-0 w-6 z-10 flex flex-col items-center pointer-events-none"
      style={{ left: `calc(${percent}% - 12px)` }}
      title={`Loss of a spouse (${deathYear})`}
    >
      <span
        className="absolute w-3.5 h-3.5 rounded-full border-2 border-white shadow"
        style={{ backgroundColor: DEATH_MARKER_COLOR, top: '-16px' }}
      />
      {/* h-full on a div spanning top-0 bottom-0 of the shared track (not one person's row)
          is what draws this line through both phase bars, distinguishing a household event
          from CalendarPhaseBar's own per-person milestone lines, which only span one row. */}
      <span className="w-1 h-full rounded-full" style={{ backgroundColor: DEATH_MARKER_COLOR }} />
      <span
        className="absolute flex flex-col items-center whitespace-nowrap text-white font-bold rounded px-1.5 py-0.5 leading-none"
        style={{ backgroundColor: DEATH_MARKER_COLOR, top: '-48px' }}
      >
        <span className="text-xs">Loss of a spouse</span>
        <span className="text-[9px] font-semibold opacity-90">{deathYear}</span>
      </span>
    </div>
  );
};

export default DeathMarker;
```

- [ ] **Step 2: Manual verification**

No component-testing library exists in this repo; verified visually in Task 8 once wired into `OurLifelongTimeline.jsx` (Task 6).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/OurLifelongTimeline/DeathMarker.jsx
git commit -m "feat(timeline): add DeathMarker component"
```

---

## Task 6: Wire DeathMarker, cumulative income, and tooltip-positioning inputs into OurLifelongTimeline

**Files:**
- Modify: `frontend/src/components/OurLifelongTimeline/OurLifelongTimeline.jsx`

**Interfaces:**
- Consumes: `DeathMarker` (Task 5).
- Produces: three new props `TimelineCursor` will consume in Task 7 — `cumulativeIncome: number`, `flipLeft: boolean`, `tooltipTopOffset: number`.

This task also grows the container's top padding, which the bolder Task 4 markers now need (a single-level marker's chip now reaches `-48px - 30px` ≈ `-78px` above the bar; a two-level stack reaches `-96px - 30px` ≈ `-126px` -- the previous `pt-8` (32px) no longer covers even the single-level case), and its bottom padding, since the tooltip moves below both rows and changes shape.

- [ ] **Step 1: Add the new imports and constants**

In `frontend/src/components/OurLifelongTimeline/OurLifelongTimeline.jsx`, change the import block:

```javascript
import React, { useState, useMemo } from 'react';
import CalendarPhaseBar from './CalendarPhaseBar';
import TimelineCursor from './TimelineCursor';
import { getAxisEndYear, getHouseholdBuckets, getMilestonesForPerson, calendarYearToAge } from './timelineMath';

const PX_PER_YEAR = 50;
```

to:

```javascript
import React, { useState, useMemo, useRef, useEffect } from 'react';
import CalendarPhaseBar from './CalendarPhaseBar';
import TimelineCursor from './TimelineCursor';
import DeathMarker from './DeathMarker';
import { getAxisEndYear, getHouseholdBuckets, getMilestonesForPerson, calendarYearToAge } from './timelineMath';

const PX_PER_YEAR = 50;

// Two 52px-tall CalendarPhaseBar rows plus the mb-8 (32px) gap between them -- the tooltip
// (Task 7) is positioned this far down plus a small clearance so it never overlaps either bar.
const TWO_ROW_HEIGHT = 52 + 32 + 52;
const TOOLTIP_TOP_OFFSET = TWO_ROW_HEIGHT + 12;

// Approximate rendered width of the redesigned 3-box tooltip, used only to decide when it
// would run off the right edge of the currently-scrolled-into-view window and should flip to
// grow leftward from the cursor instead.
const TOOLTIP_WIDTH = 600;
const TOOLTIP_FLIP_MARGIN = 24;
```

- [ ] **Step 2: Add the scroll-container ref and visible-viewport tracking**

Inside the `OurLifelongTimeline` component, after the existing `const [cursorYear, setCursorYear] = useState(currentYear);` line, add:

```javascript
  const scrollContainerRef = useRef(null);
  const [viewport, setViewport] = useState({ clientWidth: 0, scrollLeft: 0 });

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return undefined;
    const update = () => setViewport({ clientWidth: el.clientWidth, scrollLeft: el.scrollLeft });
    update();
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(el);
    el.addEventListener('scroll', update);
    return () => {
      resizeObserver.disconnect();
      el.removeEventListener('scroll', update);
    };
  }, []);
```

- [ ] **Step 3: Compute cumulativeIncome and flipLeft**

Find:

```javascript
  const monthlyIncome = combinedProjections?.preferred?.monthly?.[cursorYear] || 0;
```

Replace it with:

```javascript
  const monthlyIncome = combinedProjections?.preferred?.monthly?.[cursorYear] || 0;
  const cumulativeIncome = combinedProjections?.preferred?.cumulative?.[cursorYear] || 0;

  const cursorPixelX = (cursorYear - axisStartYear) * PX_PER_YEAR;
  const flipLeft = cursorPixelX - viewport.scrollLeft > viewport.clientWidth - TOOLTIP_WIDTH - TOOLTIP_FLIP_MARGIN;
```

- [ ] **Step 4: Attach the ref, grow the padding, and wire DeathMarker + the new TimelineCursor props**

Find:

```jsx
      <div className="w-full overflow-x-auto pt-8 pb-64">
```

Replace it with:

```jsx
      <div ref={scrollContainerRef} className="w-full overflow-x-auto pt-32 pb-72">
```

Find:

```jsx
          <TimelineCursor
            axisStartYear={axisStartYear}
            axisEndYear={axisEndYear}
            pxPerYear={PX_PER_YEAR}
            year={cursorYear}
            setYear={setCursorYear}
            primaryLabel={primaryLabel}
            primaryAge={calendarYearToAge(birthYearPrimary, cursorYear)}
            spouseLabel={spouseLabel}
            spouseAge={calendarYearToAge(birthYearSpouse, cursorYear)}
            monthlyIncome={monthlyIncome}
            buckets={buckets}
            primaryMilestones={primaryMilestones}
            spouseMilestones={spouseMilestones}
            prematureDeath={prematureDeath}
            deathYear={deathYear}
          />
```

Replace it with:

```jsx
          {prematureDeath && (
            <DeathMarker
              axisStartYear={axisStartYear}
              axisEndYear={axisEndYear}
              deathYear={deathYear}
              pxPerYear={PX_PER_YEAR}
            />
          )}

          <TimelineCursor
            axisStartYear={axisStartYear}
            axisEndYear={axisEndYear}
            pxPerYear={PX_PER_YEAR}
            year={cursorYear}
            setYear={setCursorYear}
            primaryLabel={primaryLabel}
            primaryAge={calendarYearToAge(birthYearPrimary, cursorYear)}
            spouseLabel={spouseLabel}
            spouseAge={calendarYearToAge(birthYearSpouse, cursorYear)}
            monthlyIncome={monthlyIncome}
            cumulativeIncome={cumulativeIncome}
            buckets={buckets}
            primaryMilestones={primaryMilestones}
            spouseMilestones={spouseMilestones}
            prematureDeath={prematureDeath}
            deathYear={deathYear}
            flipLeft={flipLeft}
            tooltipTopOffset={TOOLTIP_TOP_OFFSET}
          />
```

Also update the explanatory comment above the scroll container (the one currently describing `pt-8`/`pb-64`'s sizing) so it doesn't go stale. Find:

```jsx
      {/*
        overflow-x-auto forces overflow-y to auto too (per CSS spec, an axis that isn't
        "visible" makes the other axis compute to "auto" as well), so anything positioned
        outside this box's own padding box gets clipped/unreachable-by-scroll:
          - CalendarPhaseBar's row label sits at -top-5 (-20px) with text-xs (16px line-height),
            so it needs >= 20px of clearance above the bars -- pt-8 (32px) covers that.
          - TimelineCursor's tooltip is anchored top-4 (16px) below the cursor line and is
            taller than the two stacked phase bars (~136px) that establish this container's
            height -- pb-64 (256px) reserves enough room for the tooltip's full rendered
            height on its worst case (a milestone year with a survivor note active: Feel line
            + milestone note(s) + the large dollar reveal + a Do line + a survivor note +
            the 62/67/70 comparison table, measured up to ~351px) to land inside the
            scrollable area instead of being clipped at the bottom.
      */}
```

Replace it with:

```jsx
      {/*
        overflow-x-auto forces overflow-y to auto too (per CSS spec, an axis that isn't
        "visible" makes the other axis compute to "auto" as well), so anything positioned
        outside this box's own padding box gets clipped/unreachable-by-scroll:
          - CalendarPhaseBar's bolder markers (Task 4) can reach up to two stack levels above
            the bar, roughly -126px at the chip's own top edge -- pt-32 (128px) covers that
            with a small margin; the row label's older -top-5 need is comfortably inside it too.
          - TimelineCursor's tooltip now renders below both rows entirely (TOOLTIP_TOP_OFFSET,
            past the 136px two-row block), rather than overlapping either bar -- pb-72 (288px)
            reserves enough room for that offset plus the tooltip's own worst-case rendered
            height (narrative header with all optional lines present, plus the 3-box row) to
            land inside the scrollable area instead of being clipped at the bottom.
      */}
```

- [ ] **Step 5: Run the full frontend test suite to check for regressions**

Run: `cd frontend && CI=true npx react-scripts test --watchAll=false`
Expected: PASS — all existing suites plus Task 3's new tests. (`TimelineCursor` doesn't compile correctly yet at this point since Task 7 hasn't updated it to accept the new props -- this is expected; the test suite doesn't render components, so it isn't affected. The build check in the next step will also still pass, since passing extra props to a component that doesn't destructure them is not a compile error in React.)

- [ ] **Step 6: Run the CI build to confirm no lint errors**

Run: `cd frontend && CI=true npm run build`
Expected: `Compiled successfully.`

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/OurLifelongTimeline/OurLifelongTimeline.jsx
git commit -m "feat(timeline): wire DeathMarker, cumulative income, and tooltip-positioning inputs"
```

---

## Task 7: Tooltip redesign — below both rows, 3-box grid, left/right flip

**Files:**
- Modify: `frontend/src/components/OurLifelongTimeline/TimelineCursor.jsx`

**Interfaces:**
- Consumes: `buildFilingComparisonBoxes(...)` from `./timelineMath` (Task 3); `cumulativeIncome`, `flipLeft`, `tooltipTopOffset` props (Task 6).

- [ ] **Step 1: Import buildFilingComparisonBoxes and accept the new props**

In `frontend/src/components/OurLifelongTimeline/TimelineCursor.jsx`, change the import line:

```javascript
import { formatBucketValue, buildNarrative } from './timelineMath';
```

to:

```javascript
import { buildNarrative, buildFilingComparisonBoxes } from './timelineMath';
```

(`formatBucketValue` is dropped from this import — it's still used internally by `buildFilingComparisonBoxes` in `timelineMath.js`, just no longer called directly from this component now that the flat bucket list is replaced by the 3-box grid.)

Add the three new props to the destructured list:

```javascript
const TimelineCursor = ({
  axisStartYear,
  axisEndYear,
  pxPerYear,
  year,
  setYear,
  primaryLabel,
  primaryAge,
  spouseLabel,
  spouseAge,
  monthlyIncome,
  cumulativeIncome,
  buckets,
  primaryMilestones,
  spouseMilestones,
  prematureDeath,
  deathYear,
  flipLeft,
  tooltipTopOffset
}) => {
```

- [ ] **Step 2: Compute the filing comparison boxes**

Find:

```javascript
  const narrative = buildNarrative({
    year,
    primaryLabel,
    primaryAge,
    spouseLabel,
    spouseAge,
    primaryMilestones,
    spouseMilestones,
    monthlyIncome,
    prematureDeath,
    deathYear
  });
```

Add immediately after it:

```javascript
  const filingBoxes = buildFilingComparisonBoxes({ buckets, year, think: narrative.think, cumulativeIncome });
```

- [ ] **Step 3: Replace the tooltip's positioning and content**

Find:

```jsx
        <div className="absolute top-4 left-3 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-lg text-sm">
          <div className="font-bold text-gray-800 mb-1">{narrative.feel}</div>

          {narrative.milestoneNotes.length > 0 && (
            <div className="mb-2 space-y-1">
              {narrative.milestoneNotes.map((note) => (
                <div key={note} className="text-xs font-semibold text-amber-800 bg-amber-50 rounded px-2 py-1">
                  {note}
                </div>
              ))}
            </div>
          )}

          <div className="text-xl font-extrabold text-primary-700 mb-1">{narrative.think}</div>

          {narrative.doLine && (
            <div className="text-xs italic text-gray-600 mb-2">{narrative.doLine}</div>
          )}

          {narrative.survivorNote && (
            <div className="text-xs text-gray-500 bg-gray-50 border-l-2 border-gray-300 rounded px-2 py-1 mb-2">
              {narrative.survivorNote}
            </div>
          )}

          <div className="border-t border-gray-100 pt-2 space-y-1">
            {buckets.map((bucket) => {
              const { display, muted } = formatBucketValue(bucket, year);
              return (
                <div key={bucket.filingAge} className={muted ? 'text-gray-400' : 'text-gray-700'}>
                  If both filed at {bucket.filingAge}: <span className="font-semibold">{display}</span>
                </div>
              );
            })}
          </div>
        </div>
```

Replace it with:

```jsx
        <div
          className={`absolute w-[600px] rounded-lg border border-gray-200 bg-white p-3 shadow-lg text-sm ${flipLeft ? 'right-2' : 'left-2'}`}
          style={{ top: `${tooltipTopOffset}px` }}
        >
          <div className="font-bold text-gray-800 mb-1">{narrative.feel}</div>

          {narrative.milestoneNotes.length > 0 && (
            <div className="mb-2 space-y-1">
              {narrative.milestoneNotes.map((note) => (
                <div key={note} className="text-xs font-semibold text-amber-800 bg-amber-50 rounded px-2 py-1">
                  {note}
                </div>
              ))}
            </div>
          )}

          {narrative.doLine && (
            <div className="text-xs italic text-gray-600 mb-2">{narrative.doLine}</div>
          )}

          {narrative.survivorNote && (
            <div className="text-xs text-gray-500 bg-gray-50 border-l-2 border-gray-300 rounded px-2 py-1 mb-2">
              {narrative.survivorNote}
            </div>
          )}

          {/* Monthly/yearly is the large, primary-emphasis text in every box -- that's the
              number people compare at a glance -- with the lifetime running total present but
              visually secondary underneath it, per Kurt's visual-hierarchy guidance. */}
          <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-2">
            {filingBoxes.map((box) => (
              <div key={box.label} className="text-center">
                <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">{box.label}</div>
                <div className={`text-lg font-extrabold ${box.muted ? 'text-gray-400' : 'text-primary-700'}`}>
                  {box.bigText}
                </div>
                {box.smallText && (
                  <div className="text-xs text-gray-500 mt-1">{box.smallText}</div>
                )}
              </div>
            ))}
          </div>
        </div>
```

- [ ] **Step 4: Run the full frontend test suite and CI build**

Run: `cd frontend && CI=true npx react-scripts test --watchAll=false`
Expected: PASS — all suites, same count as after Task 3.

Run: `cd frontend && CI=true npm run build`
Expected: `Compiled successfully.`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/OurLifelongTimeline/TimelineCursor.jsx
git commit -m "feat(timeline): redesign tooltip into a 3-box grid, positioned below both rows"
```

---

## Task 8: Manual browser verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server and reach the timeline**

Start the dev server (`npm start` from `frontend/`), open the calculator in Married mode with two people whose birth years differ by a few years, and expand "Our Lifelong Timeline."

- [ ] **Step 2: Verify the banner is gone**

Confirm the yellow "Preliminary Lifelong Estimate" box no longer appears above the chart (for a profile whose `scenario.provenance` is `ESTIMATED`, which is the common case for a fresh profile without an uploaded earnings record).

- [ ] **Step 3: Verify bolder markers with year labels**

Confirm each milestone marker now renders a visibly larger dot, a thicker vertical line, and a two-line chip (kind abbreviation on top, the exact calendar year beneath it) — without needing to hover for the year.

- [ ] **Step 4: Verify the collision case shows both markers, stacked**

Set one person's Preferred Filing Age to exactly match their FRA (e.g. 67 for someone born in 1960 or later). Confirm two markers now render at that year — one at the normal height, one stacked higher above it — rather than only one appearing.

- [ ] **Step 5: Verify the death marker**

Enable "Potential Premature Death" with a death age that lands within the visible timeline range. Confirm a single distinct marker (not duplicated on both rows) appears at the death year, with its vertical line crossing both phase bars. Disable the toggle and confirm the marker disappears.

- [ ] **Step 6: Verify the tooltip never overlaps either bar**

Drag the cursor across several years, including years with milestone notes, a Do line, and (with Potential Premature Death on) a survivor note present. Confirm the tooltip always renders below both phase bars, never covering either one's text.

- [ ] **Step 7: Verify the 3-box grid content and hierarchy**

Confirm the tooltip shows exactly 3 boxes — "If both filed at 62," "Your Plan," "If both filed at 70" — each with a large, prominent monthly/yearly figure and a smaller, muted lifetime total beneath it. Drag to a year before the 62 or 70 bucket's start year and confirm that box shows a muted "starts `<year>`" instead of a dollar figure, with no lifetime-total line beneath it.

- [ ] **Step 8: Verify the left/right flip**

Drag the cursor to a year near the right edge of the currently visible (scrolled) window. Confirm the tooltip flips to grow leftward from the cursor instead of running off the right edge. Scroll the timeline horizontally and repeat near the new right edge to confirm the flip reacts to the current scroll position, not just the total timeline width.

If any of these fail, fix the relevant task's code before considering this plan complete.

---

## Plan Self-Review Notes

- **Spec coverage:** banner removal (Task 1), bolder/year-labeled/stackable markers (Task 4), always-show chosen-filing-age with collision stacking (Tasks 2 and 4), death-year marker (Tasks 5-6), 3-box tooltip below both rows with left/right flip and monthly/yearly-primary visual hierarchy (Tasks 3, 6, 7). No new financial calculations anywhere in the plan, per spec Non-goals.
- **No placeholders:** every step contains complete, runnable code.
- **Type/name consistency check:** `buildFilingComparisonBoxes` (Task 3) returns `{ label, bigText, smallText, muted }` — `TimelineCursor` (Task 7) destructures and renders exactly those four keys via `filingBoxes.map`. `DeathMarker` (Task 5) takes `{ axisStartYear, axisEndYear, deathYear, pxPerYear }` — `OurLifelongTimeline` (Task 6) passes exactly those four props, matching names already in scope in that file. `TimelineCursor`'s three new props (`cumulativeIncome`, `flipLeft`, `tooltipTopOffset`) are produced by `OurLifelongTimeline` in Task 6 with matching names and passed through in Task 6's own edit to the `TimelineCursor` element, then consumed by name in Task 7's prop destructuring. `getHouseholdBuckets`'s two-element return (Task 3) is consumed positionally (`const [bucket62, bucket70] = buckets`) inside `buildFilingComparisonBoxes`, matching `BUCKET_FILING_AGES = [62, 70]`'s fixed order.
