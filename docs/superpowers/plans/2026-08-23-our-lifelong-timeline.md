# Our Lifelong Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an expand-in-place "Our Lifelong Timeline" module to the Show Me The Money calculator: a shared calendar-year view of both spouses' retirement phase bars, a draggable inspection cursor showing household-aggregate income under real and hypothetical claiming strategies, and derived life-stage milestones.

**Architecture:** Pure calculation logic (age↔year conversion, household cumulative buckets, milestones, formatting) lives in a new, independently-tested `timelineMath.js` module. Three new presentational components (`CalendarPhaseBar`, `TimelineCursor`, `OurLifelongTimeline`) consume that logic and the exact same scenario state already flowing through `ShowMeTheMoneyCalculator.jsx` — no new source of truth is introduced. The existing collapsed age-based phase bar (`RetirementStagesSlider`) is left untouched; a new expand toggle swaps it out for `OurLifelongTimeline` in place.

**Tech Stack:** React (function components, hooks), Jest for pure-logic unit tests (this repo has no component-testing library — component correctness is verified manually via the dev server, matching the existing convention where only `calculators/`, `services/`, and `utils/` modules have `.test.js` files).

## Global Constraints

- Couples only: the module is not reachable when `isMarried` is false, or when either spouse's DOB is missing (spec: "Non-goals" and "Edge cases").
- No new source of truth: all scenario values (DOBs, PIA, filing ages, go-go/slow-go/no-go ages) are read from and written back to the exact same reducer-backed state `ShowMeTheMoneyCalculator.jsx` already uses — never a parallel copy.
- Reuse `calculateProjection()` / `combineProjections()` from `frontend/src/calculators/showMeTheMoney/projections.js` for all benefit math. Do not write new SSA formula logic.
- Household cumulative buckets treat the couple as one aggregate entity: a bucket is exactly zero for every calendar year before the **later** of the two spouses reaches that bucket's hypothetical filing age (spec, "Data flow" and "Edge cases").
- No custom life events, no Flow/Race tab data, no persuasive "optimal vs. actual" framing, no scenario save/compare integration — all explicitly deferred per spec "Non-goals."
- The orientation notice ("change filing age in the sidebar to see a different outcome") is required and persistent, not dismissible.
- Working name for all user-facing copy: "Our Lifelong Timeline."

Full spec: `docs/superpowers/specs/2026-08-23-our-lifelong-timeline-design.md`

---

## Task 1: Age/calendar-year conversion and axis end-year rule

**Files:**
- Create: `frontend/src/components/OurLifelongTimeline/timelineMath.js`
- Test: `frontend/src/components/OurLifelongTimeline/timelineMath.test.js`

**Interfaces:**
- Produces: `ageToCalendarYear(birthYear, age) -> number`, `calendarYearToAge(birthYear, year) -> number`, `getAxisEndYear(birthYearPrimary, birthYearSpouse) -> number`, `AXIS_END_AGE = 100` (exported constant).

- [ ] **Step 1: Write the failing tests**

```javascript
// frontend/src/components/OurLifelongTimeline/timelineMath.test.js
import { ageToCalendarYear, calendarYearToAge, getAxisEndYear, AXIS_END_AGE } from './timelineMath';

describe('age/calendar-year conversion', () => {
  test('converts age to the calendar year it falls in', () => {
    expect(ageToCalendarYear(1965, 62)).toBe(2027);
    expect(ageToCalendarYear(1970, 62)).toBe(2032);
  });

  test('converts a calendar year back to age', () => {
    expect(calendarYearToAge(1965, 2027)).toBe(62);
    expect(calendarYearToAge(1970, 2032)).toBe(62);
  });

  test('axis end year is 100 for the later-born spouse, regardless of argument order', () => {
    expect(AXIS_END_AGE).toBe(100);
    expect(getAxisEndYear(1965, 1970)).toBe(2070);
    expect(getAxisEndYear(1970, 1965)).toBe(2070);
  });

  test('axis end year works when both spouses share a birth year', () => {
    expect(getAxisEndYear(1965, 1965)).toBe(2065);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && CI=true npx react-scripts test src/components/OurLifelongTimeline/timelineMath.test.js --watchAll=false`
Expected: FAIL — `timelineMath.js` does not exist yet.

- [ ] **Step 3: Write the implementation**

```javascript
// frontend/src/components/OurLifelongTimeline/timelineMath.js

// How far past the later-born spouse's birth year the shared calendar axis extends.
export const AXIS_END_AGE = 100;

export const ageToCalendarYear = (birthYear, age) => birthYear + age;

export const calendarYearToAge = (birthYear, year) => year - birthYear;

export const getAxisEndYear = (birthYearPrimary, birthYearSpouse) =>
  Math.max(birthYearPrimary, birthYearSpouse) + AXIS_END_AGE;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && CI=true npx react-scripts test src/components/OurLifelongTimeline/timelineMath.test.js --watchAll=false`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/OurLifelongTimeline/timelineMath.js frontend/src/components/OurLifelongTimeline/timelineMath.test.js
git commit -m "feat(timeline): add age/calendar-year conversion and axis end-year rule"
```

---

## Task 2: Household cumulative buckets (aggregate-entity semantics)

**Files:**
- Modify: `frontend/src/components/OurLifelongTimeline/timelineMath.js`
- Modify: `frontend/src/components/OurLifelongTimeline/timelineMath.test.js`

**Interfaces:**
- Consumes: `calculateProjection({ pia, dob, filingYear, filingMonth, inflationRate }) -> { monthly: {year: number}, cumulative: {year: number}, birthYear }` and `combineProjections({ primaryProjection, spouseProjection, isMarried }) -> { monthly: {year: number}, cumulative: {year: number} }`, both from `frontend/src/calculators/showMeTheMoney/projections.js`.
- Produces: `BUCKET_FILING_AGES = [62, 67, 70]`, `getHouseholdBucket({ filingAge, spouse1Pia, spouse1Dob, spouse2Pia, spouse2Dob, inflation }) -> { monthly: {year: number}, cumulative: {year: number}, startYear: number }`, `getHouseholdBuckets({ spouse1Pia, spouse1Dob, spouse2Pia, spouse2Dob, inflation }) -> Array<{ filingAge, monthly, cumulative, startYear }>`.

This is the correctness-critical piece: a bucket must read exactly zero for every year before the **later** spouse reaches that hypothetical filing age, even though `combineProjections()` itself would show a nonzero partial contribution as soon as the *earlier* spouse reaches it. `getHouseholdBucket` must overlay that zero-until-both-ready rule on top of `combineProjections`'s output rather than reimplementing the combination math itself, so it inherits `combineProjections`'s existing behavior (including its flat `monthly * 12` cumulative convention) unchanged.

- [ ] **Step 1: Write the failing tests**

Add to `frontend/src/components/OurLifelongTimeline/timelineMath.test.js`:

```javascript
import { getHouseholdBucket, getHouseholdBuckets, BUCKET_FILING_AGES } from './timelineMath';

describe('household cumulative buckets', () => {
  // Ted: born 1965-01-01, PIA $2500. Wendy: born 1970-01-01, PIA $2000 (5-year gap).
  // inflation 0 keeps the math hand-verifiable: FRA=67 for both (born 1960+), so
  // filing at 62 = 70% of PIA, at 67 = 100% of PIA, at 70 = 124% of PIA.
  const household = {
    spouse1Pia: 2500,
    spouse1Dob: '1965-01-01',
    spouse2Pia: 2000,
    spouse2Dob: '1970-01-01',
    inflation: 0
  };

  test('BUCKET_FILING_AGES is exactly 62, 67, 70', () => {
    expect(BUCKET_FILING_AGES).toEqual([62, 67, 70]);
  });

  test('bucket start year is the later spouse\'s year for that filing age', () => {
    const bucket62 = getHouseholdBucket({ filingAge: 62, ...household });
    const bucket67 = getHouseholdBucket({ filingAge: 67, ...household });
    const bucket70 = getHouseholdBucket({ filingAge: 70, ...household });

    expect(bucket62.startYear).toBe(2032); // Wendy (1970) turns 62 in 2032, after Ted (2027)
    expect(bucket67.startYear).toBe(2037); // Wendy turns 67 in 2037, after Ted (2032)
    expect(bucket70.startYear).toBe(2040); // Wendy turns 70 in 2040, after Ted (2035)
  });

  test('bucket is exactly zero before the later spouse reaches that age, even though the earlier spouse already filed', () => {
    const bucket62 = getHouseholdBucket({ filingAge: 62, ...household });

    // Ted alone turned 62 in 2027 and would otherwise contribute $1,750/mo,
    // but Wendy hasn't turned 62 yet (not until 2032) -- aggregate must read zero.
    expect(bucket62.monthly[2027]).toBe(0);
    expect(bucket62.monthly[2031]).toBe(0);
    expect(bucket62.cumulative[2031]).toBe(0);
  });

  test('bucket becomes the full combined amount starting the year both have reached that age', () => {
    const bucket62 = getHouseholdBucket({ filingAge: 62, ...household });

    // Ted $2500*0.70=$1750 + Wendy $2000*0.70=$1400 = $3150/mo from 2032 on.
    expect(bucket62.monthly[2032]).toBe(3150);
    expect(bucket62.cumulative[2032]).toBe(3150 * 12);
    expect(bucket62.cumulative[2033]).toBe(3150 * 12 * 2);
  });

  test('the 67 and 70 buckets use the correct FRA and delayed-credit multipliers', () => {
    const bucket67 = getHouseholdBucket({ filingAge: 67, ...household });
    const bucket70 = getHouseholdBucket({ filingAge: 70, ...household });

    // At FRA (67): full PIA. Ted $2500 + Wendy $2000 = $4500/mo from 2037 on.
    expect(bucket67.monthly[2036]).toBe(0);
    expect(bucket67.monthly[2037]).toBe(4500);
    expect(bucket67.cumulative[2037]).toBe(4500 * 12);

    // Delayed to 70: 124% of PIA. Ted $3100 + Wendy $2480 = $5580/mo from 2040 on.
    expect(bucket70.monthly[2039]).toBe(0);
    expect(bucket70.monthly[2040]).toBe(5580);
    expect(bucket70.cumulative[2040]).toBe(5580 * 12);
  });

  test('getHouseholdBuckets returns all three ages in order', () => {
    const buckets = getHouseholdBuckets(household);
    expect(buckets.map(b => b.filingAge)).toEqual([62, 67, 70]);
    expect(buckets[2].startYear).toBe(2040);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && CI=true npx react-scripts test src/components/OurLifelongTimeline/timelineMath.test.js --watchAll=false`
Expected: FAIL — `getHouseholdBucket`/`getHouseholdBuckets`/`BUCKET_FILING_AGES` not exported yet.

- [ ] **Step 3: Write the implementation**

Add to `frontend/src/components/OurLifelongTimeline/timelineMath.js`:

```javascript
import { calculateProjection, combineProjections } from '../../calculators/showMeTheMoney/projections';

// The three claiming-strategy hypotheticals shown in the timeline cursor's tooltip.
export const BUCKET_FILING_AGES = [62, 67, 70];

export const getHouseholdBucket = ({
  filingAge,
  spouse1Pia,
  spouse1Dob,
  spouse2Pia,
  spouse2Dob,
  inflation
}) => {
  const primaryProjection = calculateProjection({
    pia: spouse1Pia,
    dob: spouse1Dob,
    filingYear: filingAge,
    filingMonth: 0,
    inflationRate: inflation
  });
  const spouseProjection = calculateProjection({
    pia: spouse2Pia,
    dob: spouse2Dob,
    filingYear: filingAge,
    filingMonth: 0,
    inflationRate: inflation
  });
  const combined = combineProjections({ primaryProjection, spouseProjection, isMarried: true });

  const birthYearPrimary = new Date(spouse1Dob).getFullYear();
  const birthYearSpouse = new Date(spouse2Dob).getFullYear();
  const startYear = Math.max(birthYearPrimary, birthYearSpouse) + filingAge;

  const monthly = {};
  const cumulative = {};
  let runningTotal = 0;

  Object.keys(combined.monthly)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((year) => {
      if (year < startYear) {
        monthly[year] = 0;
        cumulative[year] = 0;
        return;
      }
      monthly[year] = combined.monthly[year];
      runningTotal += combined.monthly[year] * 12;
      cumulative[year] = runningTotal;
    });

  return { monthly, cumulative, startYear };
};

export const getHouseholdBuckets = ({ spouse1Pia, spouse1Dob, spouse2Pia, spouse2Dob, inflation }) =>
  BUCKET_FILING_AGES.map((filingAge) => ({
    filingAge,
    ...getHouseholdBucket({ filingAge, spouse1Pia, spouse1Dob, spouse2Pia, spouse2Dob, inflation })
  }));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && CI=true npx react-scripts test src/components/OurLifelongTimeline/timelineMath.test.js --watchAll=false`
Expected: PASS (10 tests total)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/OurLifelongTimeline/timelineMath.js frontend/src/components/OurLifelongTimeline/timelineMath.test.js
git commit -m "feat(timeline): add household aggregate-entity cumulative buckets"
```

---

## Task 3: Bucket display formatting and annual income helper

**Files:**
- Modify: `frontend/src/components/OurLifelongTimeline/timelineMath.js`
- Modify: `frontend/src/components/OurLifelongTimeline/timelineMath.test.js`

**Interfaces:**
- Consumes: bucket shape from Task 2 (`{ filingAge, monthly, cumulative, startYear }`).
- Produces: `formatCurrency(value) -> string`, `formatBucketValue(bucket, year) -> { display: string, muted: boolean }`, `getAnnualIncome(monthlyValue) -> number`.

- [ ] **Step 1: Write the failing tests**

Add to `frontend/src/components/OurLifelongTimeline/timelineMath.test.js`:

```javascript
import { formatCurrency, formatBucketValue, getAnnualIncome } from './timelineMath';

describe('display formatting', () => {
  test('formatCurrency renders whole-dollar USD', () => {
    expect(formatCurrency(66960)).toBe('$66,960');
    expect(formatCurrency(0)).toBe('$0');
  });

  test('getAnnualIncome is monthly times 12', () => {
    expect(getAnnualIncome(3087)).toBe(37044);
  });

  test('formatBucketValue shows a muted "starts <year>" before the bucket starts', () => {
    const bucket = { startYear: 2040, cumulative: { 2039: 0, 2040: 66960 } };
    expect(formatBucketValue(bucket, 2035)).toEqual({ display: 'starts 2040', muted: true });
    expect(formatBucketValue(bucket, 2039)).toEqual({ display: 'starts 2040', muted: true });
  });

  test('formatBucketValue shows the formatted cumulative amount once the bucket has started', () => {
    const bucket = { startYear: 2040, cumulative: { 2040: 66960, 2041: 133920 } };
    expect(formatBucketValue(bucket, 2040)).toEqual({ display: '$66,960', muted: false });
    expect(formatBucketValue(bucket, 2041)).toEqual({ display: '$133,920', muted: false });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && CI=true npx react-scripts test src/components/OurLifelongTimeline/timelineMath.test.js --watchAll=false`
Expected: FAIL — the three new exports don't exist yet.

- [ ] **Step 3: Write the implementation**

Add to `frontend/src/components/OurLifelongTimeline/timelineMath.js`:

```javascript
export const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);

export const getAnnualIncome = (monthlyValue) => monthlyValue * 12;

export const formatBucketValue = (bucket, year) => {
  if (year < bucket.startYear) {
    return { display: `starts ${bucket.startYear}`, muted: true };
  }
  return { display: formatCurrency(bucket.cumulative[year] ?? 0), muted: false };
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && CI=true npx react-scripts test src/components/OurLifelongTimeline/timelineMath.test.js --watchAll=false`
Expected: PASS (14 tests total)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/OurLifelongTimeline/timelineMath.js frontend/src/components/OurLifelongTimeline/timelineMath.test.js
git commit -m "feat(timeline): add bucket display formatting and annual income helper"
```

---

## Task 4: Life-stage milestones and couples-only reachability gate

**Files:**
- Modify: `frontend/src/components/OurLifelongTimeline/timelineMath.js`
- Modify: `frontend/src/components/OurLifelongTimeline/timelineMath.test.js`

**Interfaces:**
- Consumes: `getFra(birthYear) -> { years, months }` from `frontend/src/utils/benefitFormulas.js`.
- Produces: `getMilestonesForPerson({ label, dob, preferredYear }) -> Array<{ year: number, label: string, kind: string }>` (sorted ascending by year), `isTimelineReachable({ isMarried, spouse1Dob, spouse2Dob }) -> boolean`.

- [ ] **Step 1: Write the failing tests**

Add to `frontend/src/components/OurLifelongTimeline/timelineMath.test.js`:

```javascript
import { getMilestonesForPerson, isTimelineReachable } from './timelineMath';

describe('life-stage milestones', () => {
  test('derives 62/FRA/70 milestones plus a distinct chosen-filing-age milestone', () => {
    const milestones = getMilestonesForPerson({ label: 'Ted', dob: '1965-01-01', preferredYear: 64 });

    expect(milestones).toEqual([
      { year: 2027, label: 'Ted turns 62', kind: 'age62' },
      { year: 2029, label: "Ted's chosen filing age", kind: 'chosenFilingAge' },
      { year: 2032, label: 'Ted reaches full retirement age', kind: 'fra' },
      { year: 2035, label: 'Ted turns 70', kind: 'age70' }
    ]);
  });

  test('does not duplicate a milestone when the chosen filing age matches an existing one', () => {
    const milestones = getMilestonesForPerson({ label: 'Ted', dob: '1965-01-01', preferredYear: 67 });

    // 67 is Ted's FRA (born 1965) -- chosenFilingAge must not appear as a second 2032 entry.
    expect(milestones).toHaveLength(3);
    expect(milestones.map(m => m.kind)).toEqual(['age62', 'fra', 'age70']);
  });
});

describe('couples-only reachability', () => {
  test('reachable only when married with both DOBs present', () => {
    expect(isTimelineReachable({ isMarried: true, spouse1Dob: '1965-01-01', spouse2Dob: '1970-01-01' })).toBe(true);
    expect(isTimelineReachable({ isMarried: false, spouse1Dob: '1965-01-01', spouse2Dob: '1970-01-01' })).toBe(false);
    expect(isTimelineReachable({ isMarried: true, spouse1Dob: '1965-01-01', spouse2Dob: null })).toBe(false);
    expect(isTimelineReachable({ isMarried: true, spouse1Dob: '', spouse2Dob: '1970-01-01' })).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && CI=true npx react-scripts test src/components/OurLifelongTimeline/timelineMath.test.js --watchAll=false`
Expected: FAIL — `getMilestonesForPerson`/`isTimelineReachable` not exported yet.

- [ ] **Step 3: Write the implementation**

Add to `frontend/src/components/OurLifelongTimeline/timelineMath.js`:

```javascript
import { getFra } from '../../utils/benefitFormulas';

export const getMilestonesForPerson = ({ label, dob, preferredYear }) => {
  const birthYear = new Date(dob).getFullYear();
  const fra = getFra(birthYear);

  const milestones = [
    { year: birthYear + 62, label: `${label} turns 62`, kind: 'age62' },
    { year: birthYear + fra.years, label: `${label} reaches full retirement age`, kind: 'fra' },
    { year: birthYear + 70, label: `${label} turns 70`, kind: 'age70' }
  ];

  const chosenFilingAgeYear = birthYear + Number(preferredYear);
  if (!milestones.some((m) => m.year === chosenFilingAgeYear)) {
    milestones.push({ year: chosenFilingAgeYear, label: `${label}'s chosen filing age`, kind: 'chosenFilingAge' });
  }

  return milestones.sort((a, b) => a.year - b.year);
};

export const isTimelineReachable = ({ isMarried, spouse1Dob, spouse2Dob }) =>
  Boolean(isMarried && spouse1Dob && spouse2Dob);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && CI=true npx react-scripts test src/components/OurLifelongTimeline/timelineMath.test.js --watchAll=false`
Expected: PASS (17 tests total)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/OurLifelongTimeline/timelineMath.js frontend/src/components/OurLifelongTimeline/timelineMath.test.js
git commit -m "feat(timeline): add life-stage milestones and couples-only reachability gate"
```

---

## Task 5: CalendarPhaseBar component

**Files:**
- Create: `frontend/src/components/OurLifelongTimeline/CalendarPhaseBar.jsx`

**Interfaces:**
- Consumes: nothing new from earlier tasks (pure presentational component; milestones come in as a prop already shaped by `getMilestonesForPerson`).
- Produces: default export `CalendarPhaseBar` used by Task 7.

This is the calendar-year-aware sibling of the existing `RetirementStagesSlider` (`ShowMeTheMoneyCalculator.jsx:39-207`). It keeps the same drag physics and per-person age constraints (`MIN_AGE = 62`, `MAX_AGE = 95`, Go-Go must end before Slow-Go and vice versa) but positions the bar as an absolutely-placed segment from `birthYear+62` to `birthYear+95` within a shared full-width calendar track, instead of stretching the whole track edge-to-edge.

- [ ] **Step 1: Write the component**

```jsx
// frontend/src/components/OurLifelongTimeline/CalendarPhaseBar.jsx
import React, { useRef, useEffect } from 'react';

const MIN_AGE = 62;
const MAX_AGE = 95;

const CalendarPhaseBar = ({
  label,
  birthYear,
  axisStartYear,
  axisEndYear,
  pxPerYear,
  goGoEndAge,
  setGoGoEndAge,
  slowGoEndAge,
  setSlowGoEndAge,
  isDraggingGoGo,
  setIsDraggingGoGo,
  isDraggingSlowGo,
  setIsDraggingSlowGo,
  milestones
}) => {
  const trackRef = useRef(null);
  const totalYears = axisEndYear - axisStartYear;

  const yearToPercent = (year) => ((year - axisStartYear) / totalYears) * 100;
  const ageToPercent = (age) => yearToPercent(birthYear + age);

  const xToAge = (clientX) => {
    if (!trackRef.current) return MIN_AGE;
    const rect = trackRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const year = axisStartYear + (percent / 100) * totalYears;
    return Math.round(Math.max(MIN_AGE, Math.min(MAX_AGE, year - birthYear)));
  };

  const handleGoGoMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingGoGo(true);
  };

  const handleSlowGoMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingSlowGo(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingGoGo) {
        const newAge = xToAge(e.clientX);
        if (newAge < slowGoEndAge) {
          setGoGoEndAge(newAge);
        }
      } else if (isDraggingSlowGo) {
        const newAge = xToAge(e.clientX);
        if (newAge > goGoEndAge && newAge <= MAX_AGE) {
          setSlowGoEndAge(newAge);
        }
      }
    };

    const handleMouseUp = () => {
      setIsDraggingGoGo(false);
      setIsDraggingSlowGo(false);
    };

    if (isDraggingGoGo || isDraggingSlowGo) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    // xToAge, axisStartYear/axisEndYear/pxPerYear are read via closure from props that only
    // change when the parent re-renders with new scenario data, matching the mount-while-
    // dragging pattern already used by RetirementStagesSlider (ShowMeTheMoneyCalculator.jsx).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDraggingGoGo, isDraggingSlowGo, goGoEndAge, slowGoEndAge, setGoGoEndAge, setSlowGoEndAge, setIsDraggingGoGo, setIsDraggingSlowGo]);

  const barLeftPercent = ageToPercent(MIN_AGE);
  const barWidthPercent = ageToPercent(MAX_AGE) - ageToPercent(MIN_AGE);
  const goGoWidth = ((goGoEndAge - MIN_AGE) / (MAX_AGE - MIN_AGE)) * 100;
  const slowGoWidth = ((slowGoEndAge - goGoEndAge) / (MAX_AGE - MIN_AGE)) * 100;
  const noGoWidth = 100 - goGoWidth - slowGoWidth;

  return (
    <div className="relative" style={{ width: `${totalYears * pxPerYear}px`, height: '52px' }}>
      {label && (
        <div className="absolute -top-5 left-0 text-xs font-extrabold uppercase tracking-wider text-gray-500">
          {label}
        </div>
      )}

      {/* Milestone markers, positioned on the full shared track independent of the bar itself */}
      {milestones.map((m) => (
        <div
          key={`${m.kind}-${m.year}`}
          className="absolute top-0 bottom-0 w-px bg-gray-300"
          style={{ left: `${yearToPercent(m.year)}%` }}
          title={m.label}
        />
      ))}

      {/* The 62-95 phase bar itself, absolutely positioned within the shared track */}
      <div
        ref={trackRef}
        className="absolute top-3 h-9 flex rounded-lg overflow-hidden shadow-md border-2 border-gray-300"
        style={{ left: `${barLeftPercent}%`, width: `${barWidthPercent}%` }}
      >
        <div
          className="relative flex items-center justify-center text-white font-bold text-sm"
          style={{ width: `${goGoWidth}%`, backgroundColor: '#E67E22' }}
        >
          {goGoWidth > 15 ? <span className="drop-shadow-sm">Go-Go</span> : null}
        </div>

        <div
          className="absolute top-0 bottom-0 w-6 flex items-center justify-center cursor-ew-resize z-10 group"
          style={{ left: `calc(${goGoWidth}% - 12px)` }}
          onMouseDown={handleGoGoMouseDown}
        >
          <div className={`w-1 h-full ${isDraggingGoGo ? 'bg-gray-800' : 'bg-gray-600 group-hover:bg-gray-700'}`} />
        </div>

        <div
          className="relative flex items-center justify-center text-white font-bold text-sm"
          style={{ width: `${slowGoWidth}%`, backgroundColor: '#F1C40F' }}
        >
          {slowGoWidth > 15 ? <span className="drop-shadow-sm">Slow-Go</span> : null}
        </div>

        <div
          className="absolute top-0 bottom-0 w-6 flex items-center justify-center cursor-ew-resize z-10 group"
          style={{ left: `calc(${goGoWidth + slowGoWidth}% - 12px)` }}
          onMouseDown={handleSlowGoMouseDown}
        >
          <div className={`w-1 h-full ${isDraggingSlowGo ? 'bg-gray-800' : 'bg-gray-600 group-hover:bg-gray-700'}`} />
        </div>

        <div
          className="relative flex items-center justify-center text-white font-bold text-sm"
          style={{ width: `${noGoWidth}%`, backgroundColor: '#95A5A6' }}
        >
          {noGoWidth > 15 ? <span className="drop-shadow-sm">No-Go</span> : null}
        </div>
      </div>
    </div>
  );
};

export default CalendarPhaseBar;
```

- [ ] **Step 2: Manual verification**

There is no component-testing library in this repo (only `calculators/`, `services/`, and `utils/` have `.test.js` files) — this component is verified visually in Task 8's browser check once it's wired into the calculator. No standalone verification step here; proceed to commit.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/OurLifelongTimeline/CalendarPhaseBar.jsx
git commit -m "feat(timeline): add calendar-year-aware phase bar component"
```

---

## Task 6: TimelineCursor component

**Files:**
- Create: `frontend/src/components/OurLifelongTimeline/TimelineCursor.jsx`

**Interfaces:**
- Consumes: `formatCurrency`, `formatBucketValue`, `getAnnualIncome` from `./timelineMath` (Task 3).
- Produces: default export `TimelineCursor` used by Task 7. Props: `axisStartYear`, `axisEndYear`, `pxPerYear`, `year` (controlled), `setYear`, `primaryLabel`, `primaryAge`, `spouseLabel`, `spouseAge`, `monthlyIncome`, `buckets` (array from `getHouseholdBuckets`, Task 2).

- [ ] **Step 1: Write the component**

```jsx
// frontend/src/components/OurLifelongTimeline/TimelineCursor.jsx
import React, { useRef, useState, useEffect } from 'react';
import { formatCurrency, formatBucketValue, getAnnualIncome } from './timelineMath';

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
  buckets
}) => {
  const trackRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const totalYears = axisEndYear - axisStartYear;

  const yearToPercent = (y) => ((y - axisStartYear) / totalYears) * 100;

  const xToYear = (clientX) => {
    if (!trackRef.current) return year;
    const rect = trackRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const rawYear = axisStartYear + (percent / 100) * totalYears;
    return Math.round(Math.max(axisStartYear, Math.min(axisEndYear, rawYear)));
  };

  useEffect(() => {
    if (!isDragging) return undefined;
    const handleMouseMove = (e) => setYear(xToYear(e.clientX));
    const handleMouseUp = () => setIsDragging(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    // setYear is a useState setter (stable) and xToYear/axisStartYear/axisEndYear are read via
    // closure from props that only change on scenario updates -- same mount-while-dragging
    // pattern as CalendarPhaseBar and the existing RetirementStagesSlider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  return (
    <div
      ref={trackRef}
      className="absolute top-0 bottom-0 left-0"
      style={{ width: `${totalYears * pxPerYear}px` }}
    >
      <div
        className="absolute top-0 bottom-0 w-px bg-green-500 cursor-ew-resize z-20"
        style={{ left: `${yearToPercent(year)}%` }}
        onMouseDown={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
      >
        <div className="absolute -top-2 -left-1.5 w-3 h-3 rounded-full bg-green-500 shadow" />

        <div className="absolute top-4 left-3 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-lg text-sm">
          <div className="font-bold text-gray-800 mb-1">{year}</div>
          <div className="text-gray-600 mb-2">
            {primaryLabel}: {primaryAge} &nbsp;&middot;&nbsp; {spouseLabel}: {spouseAge}
          </div>
          <div className="mb-2">
            <div>Monthly Income: <span className="font-semibold">{formatCurrency(monthlyIncome)}</span></div>
            <div>Annual Income: <span className="font-semibold">{formatCurrency(getAnnualIncome(monthlyIncome))}</span></div>
          </div>
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
      </div>
    </div>
  );
};

export default TimelineCursor;
```

- [ ] **Step 2: Manual verification**

No component-testing library exists in this repo; verified visually in Task 8.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/OurLifelongTimeline/TimelineCursor.jsx
git commit -m "feat(timeline): add draggable inspection cursor with household tooltip"
```

---

## Task 7: OurLifelongTimeline orchestrating component

**Files:**
- Create: `frontend/src/components/OurLifelongTimeline/OurLifelongTimeline.jsx`
- Create: `frontend/src/components/OurLifelongTimeline/index.js`

**Interfaces:**
- Consumes: `getAxisEndYear`, `getHouseholdBuckets`, `getMilestonesForPerson`, `calendarYearToAge` from `./timelineMath` (Tasks 1-4); `CalendarPhaseBar` (Task 5); `TimelineCursor` (Task 6).
- Produces: default export `OurLifelongTimeline`, re-exported from `index.js` as a named export `{ OurLifelongTimeline }` (matching the existing `OneMonthAtATime/index.js` barrel-export convention).

**Props this component expects from `ShowMeTheMoneyCalculator.jsx`:**
`primaryLabel`, `spouseLabel`, `spouse1Dob`, `spouse2Dob`, `spouse1Pia`, `spouse2Pia`, `spouse1PreferredYear`, `spouse2PreferredYear`, `inflation`, `combinedProjections` (the `scenarioData.combinedProjections` object — its `.preferred.monthly[year]` gives the real household monthly benefit for a given calendar year), `goGoEndAge`, `setGoGoEndAge`, `slowGoEndAge`, `setSlowGoEndAge`, `isDraggingGoGo`, `setIsDraggingGoGo`, `isDraggingSlowGo`, `setIsDraggingSlowGo`, `spouseGoGoEndAge`, `setSpouseGoGoEndAge`, `spouseSlowGoEndAge`, `setSpouseSlowGoEndAge`, `isDraggingSpouseGoGo`, `setIsDraggingSpouseGoGo`, `isDraggingSpouseSlowGo`, `setIsDraggingSpouseSlowGo`.

- [ ] **Step 1: Write the component**

```jsx
// frontend/src/components/OurLifelongTimeline/OurLifelongTimeline.jsx
import React, { useState, useMemo } from 'react';
import CalendarPhaseBar from './CalendarPhaseBar';
import TimelineCursor from './TimelineCursor';
import { getAxisEndYear, getHouseholdBuckets, getMilestonesForPerson, calendarYearToAge } from './timelineMath';

const PX_PER_YEAR = 50;
const VISIBLE_YEARS = 12;

const OurLifelongTimeline = ({
  primaryLabel,
  spouseLabel,
  spouse1Dob,
  spouse2Dob,
  spouse1Pia,
  spouse2Pia,
  spouse1PreferredYear,
  spouse2PreferredYear,
  inflation,
  combinedProjections,
  goGoEndAge,
  setGoGoEndAge,
  slowGoEndAge,
  setSlowGoEndAge,
  isDraggingGoGo,
  setIsDraggingGoGo,
  isDraggingSlowGo,
  setIsDraggingSlowGo,
  spouseGoGoEndAge,
  setSpouseGoGoEndAge,
  spouseSlowGoEndAge,
  setSpouseSlowGoEndAge,
  isDraggingSpouseGoGo,
  setIsDraggingSpouseGoGo,
  isDraggingSpouseSlowGo,
  setIsDraggingSpouseSlowGo
}) => {
  const currentYear = new Date().getFullYear();
  const [cursorYear, setCursorYear] = useState(currentYear);

  const birthYearPrimary = new Date(spouse1Dob).getFullYear();
  const birthYearSpouse = new Date(spouse2Dob).getFullYear();
  const axisStartYear = currentYear;
  const axisEndYear = getAxisEndYear(birthYearPrimary, birthYearSpouse);

  const buckets = useMemo(
    () => getHouseholdBuckets({ spouse1Pia, spouse1Dob, spouse2Pia, spouse2Dob, inflation }),
    [spouse1Pia, spouse1Dob, spouse2Pia, spouse2Dob, inflation]
  );

  const primaryMilestones = useMemo(
    () => getMilestonesForPerson({ label: primaryLabel, dob: spouse1Dob, preferredYear: spouse1PreferredYear }),
    [primaryLabel, spouse1Dob, spouse1PreferredYear]
  );
  const spouseMilestones = useMemo(
    () => getMilestonesForPerson({ label: spouseLabel, dob: spouse2Dob, preferredYear: spouse2PreferredYear }),
    [spouseLabel, spouse2Dob, spouse2PreferredYear]
  );

  const monthlyIncome = combinedProjections?.preferred?.monthly?.[cursorYear] || 0;

  return (
    <div className="space-y-3 mt-4">
      <div className="overflow-x-auto" style={{ maxWidth: `${VISIBLE_YEARS * PX_PER_YEAR}px` }}>
        <div className="relative" style={{ width: `${(axisEndYear - axisStartYear) * PX_PER_YEAR}px` }}>
          <div className="mb-8">
            <CalendarPhaseBar
              label={primaryLabel}
              birthYear={birthYearPrimary}
              axisStartYear={axisStartYear}
              axisEndYear={axisEndYear}
              pxPerYear={PX_PER_YEAR}
              goGoEndAge={goGoEndAge}
              setGoGoEndAge={setGoGoEndAge}
              slowGoEndAge={slowGoEndAge}
              setSlowGoEndAge={setSlowGoEndAge}
              isDraggingGoGo={isDraggingGoGo}
              setIsDraggingGoGo={setIsDraggingGoGo}
              isDraggingSlowGo={isDraggingSlowGo}
              setIsDraggingSlowGo={setIsDraggingSlowGo}
              milestones={primaryMilestones}
            />
          </div>
          <div>
            <CalendarPhaseBar
              label={spouseLabel}
              birthYear={birthYearSpouse}
              axisStartYear={axisStartYear}
              axisEndYear={axisEndYear}
              pxPerYear={PX_PER_YEAR}
              goGoEndAge={spouseGoGoEndAge}
              setGoGoEndAge={setSpouseGoGoEndAge}
              slowGoEndAge={spouseSlowGoEndAge}
              setSlowGoEndAge={setSpouseSlowGoEndAge}
              isDraggingGoGo={isDraggingSpouseGoGo}
              setIsDraggingGoGo={setIsDraggingSpouseGoGo}
              isDraggingSlowGo={isDraggingSpouseSlowGo}
              setIsDraggingSlowGo={setIsDraggingSpouseSlowGo}
              milestones={spouseMilestones}
            />
          </div>

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
          />
        </div>
      </div>

      <p className="text-xs text-gray-500 border-t border-gray-100 pt-2">
        Want a different picture? Change filing ages in the panel on the left — timing is the one lever still fully in your control.
      </p>
    </div>
  );
};

export default OurLifelongTimeline;
```

```javascript
// frontend/src/components/OurLifelongTimeline/index.js
export { default as OurLifelongTimeline } from './OurLifelongTimeline';
```

- [ ] **Step 2: Manual verification**

No component-testing library exists in this repo; verified visually in Task 8 once wired into the calculator.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/OurLifelongTimeline/OurLifelongTimeline.jsx frontend/src/components/OurLifelongTimeline/index.js
git commit -m "feat(timeline): add OurLifelongTimeline orchestrating component"
```

---

## Task 8: Wire into ShowMeTheMoneyCalculator.jsx

**Files:**
- Modify: `frontend/src/components/ShowMeTheMoneyCalculator.jsx:1` (import), `~1986` (new state), `~4192-4220` (render swap)

**Interfaces:**
- Consumes: `OurLifelongTimeline` (Task 7), `isTimelineReachable` from `./OurLifelongTimeline/timelineMath` (Task 4).

- [ ] **Step 1: Add the import and expand/collapse state**

In `frontend/src/components/ShowMeTheMoneyCalculator.jsx`, add to the import block near the top (after the `OneMonthAtATimeModal` import):

```javascript
import { OurLifelongTimeline } from './OurLifelongTimeline';
import { isTimelineReachable } from './OurLifelongTimeline/timelineMath';
```

Add new state next to the other `isDragging*` declarations (near `const [isDraggingSpouseSlowGo, setIsDraggingSpouseSlowGo] = useState(false);`):

```javascript
const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
```

- [ ] **Step 2: Replace the Retirement Stages Slider render block**

Find this block (currently rendering the two collapsed `RetirementStagesSlider`s):

```jsx
                    {/* Retirement Stages Slider - Below chart */}
                    {['monthly', 'cumulative', 'combined', 'earlyLate', 'post70', 'sscuts'].includes(chartView) && (
                        <div className="space-y-3 mt-4">
                            <RetirementStagesSlider
                                label={isMarried ? primaryFirstName : undefined}
                                goGoEndAge={goGoEndAge}
                                setGoGoEndAge={setGoGoEndAge}
                                slowGoEndAge={slowGoEndAge}
                                setSlowGoEndAge={setSlowGoEndAge}
                                isDraggingGoGo={isDraggingGoGo}
                                setIsDraggingGoGo={setIsDraggingGoGo}
                                isDraggingSlowGo={isDraggingSlowGo}
                                setIsDraggingSlowGo={setIsDraggingSlowGo}
                            />
                            {isMarried && (
                                <RetirementStagesSlider
                                    label={spouseFirstName}
                                    goGoEndAge={spouseGoGoEndAge}
                                    setGoGoEndAge={setSpouseGoGoEndAge}
                                    slowGoEndAge={spouseSlowGoEndAge}
                                    setSlowGoEndAge={setSpouseSlowGoEndAge}
                                    isDraggingGoGo={isDraggingSpouseGoGo}
                                    setIsDraggingGoGo={setIsDraggingSpouseGoGo}
                                    isDraggingSlowGo={isDraggingSpouseSlowGo}
                                    setIsDraggingSlowGo={setIsDraggingSpouseSlowGo}
                                />
                            )}
                        </div>
                    )}
```

Replace it with:

```jsx
                    {/* Retirement Stages Slider - Below chart */}
                    {['monthly', 'cumulative', 'combined', 'earlyLate', 'post70', 'sscuts'].includes(chartView) && (
                        <div className="space-y-3 mt-4">
                            {isTimelineExpanded && isTimelineReachable({ isMarried, spouse1Dob, spouse2Dob }) ? (
                                <div>
                                    <button
                                        onClick={() => setIsTimelineExpanded(false)}
                                        className="text-xs font-semibold text-primary-600 hover:text-primary-700 mb-2"
                                    >
                                        &uarr; Collapse to Go-Go/Slow-Go/No-Go sliders
                                    </button>
                                    <OurLifelongTimeline
                                        primaryLabel={primaryFirstName}
                                        spouseLabel={spouseFirstName}
                                        spouse1Dob={spouse1Dob}
                                        spouse2Dob={spouse2Dob}
                                        spouse1Pia={spouse1Pia}
                                        spouse2Pia={spouse2Pia}
                                        spouse1PreferredYear={spouse1PreferredYear}
                                        spouse2PreferredYear={spouse2PreferredYear}
                                        inflation={inflation}
                                        combinedProjections={scenarioData.combinedProjections}
                                        goGoEndAge={goGoEndAge}
                                        setGoGoEndAge={setGoGoEndAge}
                                        slowGoEndAge={slowGoEndAge}
                                        setSlowGoEndAge={setSlowGoEndAge}
                                        isDraggingGoGo={isDraggingGoGo}
                                        setIsDraggingGoGo={setIsDraggingGoGo}
                                        isDraggingSlowGo={isDraggingSlowGo}
                                        setIsDraggingSlowGo={setIsDraggingSlowGo}
                                        spouseGoGoEndAge={spouseGoGoEndAge}
                                        setSpouseGoGoEndAge={setSpouseGoGoEndAge}
                                        spouseSlowGoEndAge={spouseSlowGoEndAge}
                                        setSpouseSlowGoEndAge={setSpouseSlowGoEndAge}
                                        isDraggingSpouseGoGo={isDraggingSpouseGoGo}
                                        setIsDraggingSpouseGoGo={setIsDraggingSpouseGoGo}
                                        isDraggingSpouseSlowGo={isDraggingSpouseSlowGo}
                                        setIsDraggingSpouseSlowGo={setIsDraggingSpouseSlowGo}
                                    />
                                </div>
                            ) : (
                                <div>
                                    <RetirementStagesSlider
                                        label={isMarried ? primaryFirstName : undefined}
                                        goGoEndAge={goGoEndAge}
                                        setGoGoEndAge={setGoGoEndAge}
                                        slowGoEndAge={slowGoEndAge}
                                        setSlowGoEndAge={setSlowGoEndAge}
                                        isDraggingGoGo={isDraggingGoGo}
                                        setIsDraggingGoGo={setIsDraggingGoGo}
                                        isDraggingSlowGo={isDraggingSlowGo}
                                        setIsDraggingSlowGo={setIsDraggingSlowGo}
                                    />
                                    {isMarried && (
                                        <RetirementStagesSlider
                                            label={spouseFirstName}
                                            goGoEndAge={spouseGoGoEndAge}
                                            setGoGoEndAge={setSpouseGoGoEndAge}
                                            slowGoEndAge={spouseSlowGoEndAge}
                                            setSlowGoEndAge={setSpouseSlowGoEndAge}
                                            isDraggingGoGo={isDraggingSpouseGoGo}
                                            setIsDraggingGoGo={setIsDraggingSpouseGoGo}
                                            isDraggingSlowGo={isDraggingSpouseSlowGo}
                                            setIsDraggingSlowGo={setIsDraggingSpouseSlowGo}
                                        />
                                    )}
                                    {isTimelineReachable({ isMarried, spouse1Dob, spouse2Dob }) && (
                                        <button
                                            onClick={() => setIsTimelineExpanded(true)}
                                            className="mt-2 text-xs font-semibold text-primary-600 hover:text-primary-700"
                                        >
                                            &darr; See Our Lifelong Timeline
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
```

- [ ] **Step 2: Run the full test suite to check for regressions**

Run: `cd frontend && CI=true npx react-scripts test --watchAll=false`
Expected: PASS — all existing suites plus the 17 new `timelineMath.test.js` tests (matches the count from Task 4's step 4).

- [ ] **Step 3: Run the CI build to confirm no new lint errors**

Run: `cd frontend && CI=true npm run build`
Expected: `Compiled successfully.`

- [ ] **Step 4: Manual browser verification**

Start the dev server (`npm start` from `frontend/`) and open the Show Me The Money calculator in Married mode with two different birth years (e.g. a several-year age gap) to exercise the harder cases. Walk through the spec's testing notes (`docs/superpowers/specs/2026-08-23-our-lifelong-timeline-design.md`, "Testing notes"):

- [ ] Click "See Our Lifelong Timeline" — the module expands in place, obscuring the collapsed sliders.
- [ ] Both people's Go-Go/Slow-Go/No-Go bars appear at different horizontal positions (since their birth years differ) rather than aligned, confirming calendar-year positioning is working.
- [ ] Drag a Go-Go/Slow-Go boundary in the expanded view, then collapse — the collapsed slider reflects the same new boundary (single source of truth, no separate state).
- [ ] Drag the green cursor line across several years — the tooltip's Monthly/Annual Income and per-person ages update live.
- [ ] Drag the cursor to a year before the younger spouse's 62nd birthday — the "If both filed at 62" bucket shows a muted "starts \<year>", not "$0" or a wrong dollar amount.
- [ ] Drag the cursor past that start year — the bucket switches to a real dollar figure.
- [ ] Switch to Single mode (or clear one spouse's DOB) — the "See Our Lifelong Timeline" toggle is not shown.
- [ ] Confirm the orientation notice ("Want a different picture? Change filing ages in the panel on the left...") is visible whenever the module is expanded.

If any of these fail, fix the relevant task's code before proceeding — do not commit broken behavior.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ShowMeTheMoneyCalculator.jsx
git commit -m "feat(timeline): wire Our Lifelong Timeline into the Show Me The Money calculator"
```

---

## Plan Self-Review Notes

- **Spec coverage:** entry point/expand-collapse (Task 8), shared calendar axis + per-person bars (Tasks 1, 5, 7), draggable cursor + tooltip (Tasks 2, 3, 6), milestones (Task 4), orientation notice (Task 7), couples-only gating (Task 4, wired in Task 8), bidirectional single-source-of-truth sync (Task 5/8 — same setters, no parallel state), zero-bucket muted display (Task 3), axis end-year + initial zoom mitigation (Task 1, Task 7's `VISIBLE_YEARS`/`overflow-x-auto`). The One Month at a Time integration and Flow/Race data are out of scope per spec Non-goals and are not present in this plan.
- **No placeholders:** every step above contains complete, runnable code — no "TBD" or "add appropriate handling" steps.
- **Type/name consistency check:** `getHouseholdBucket`/`getHouseholdBuckets` (Task 2) return `{ monthly, cumulative, startYear }`/arrays thereof with a `filingAge` key — `formatBucketValue` (Task 3) and `TimelineCursor` (Task 6) both consume that exact shape (`bucket.startYear`, `bucket.cumulative[year]`, `bucket.filingAge`). `getMilestonesForPerson` (Task 4) returns `{ year, label, kind }` — consumed identically by `CalendarPhaseBar` (Task 5, keyed on `m.kind`/`m.year`) and called with matching argument names (`label`, `dob`, `preferredYear`) in `OurLifelongTimeline` (Task 7).
