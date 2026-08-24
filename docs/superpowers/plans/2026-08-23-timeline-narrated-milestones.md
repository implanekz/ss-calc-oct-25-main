# Timeline Narrated Milestones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Our Lifelong Timeline's milestone markers visible and clickable, and replace the cursor tooltip's flat data table with a Feel/Think/Do narrative built by a new pure `buildNarrative()` function.

**Architecture:** All new narrative logic lives in a pure, independently-tested function added to the existing `timelineMath.js`. `CalendarPhaseBar` gains visible, color-coded, clickable milestone markers that write to the same `cursorYear` state the drag cursor already controls — no new state. `TimelineCursor` consumes `buildNarrative()`'s output to restructure its tooltip; the existing 62/67/70 comparison table is kept, just demoted below the narrative.

**Tech Stack:** React (function components, hooks), Jest for the pure-logic unit tests (matching this module's existing convention — only `timelineMath.js` has a test file; the three presentational components are verified manually in-browser).

## Global Constraints

- No new source of truth: the milestone marker's `onClick` writes to the existing `cursorYear` state via the existing `setCursorYear` setter — never a parallel state (spec: "Data flow").
- `buildNarrative` is a pure function of data the module already computes (ages, milestone lists, `monthlyIncome`, `prematureDeath`/`deathYear`) — no new calculation logic, no new SSA formula math (spec: "Data flow").
- The Feel/Think/Do lines are template-filled strings, not model-generated prose (spec: "Non-goals").
- `doLine` only appears when a milestone lands on the cursor year; it is never shown on a plain drag year (spec: "Design › Narrative content").
- `survivorNote` only appears when `prematureDeath` is true and `year >= deathYear` (spec: "Design › Narrative content").
- The existing 62/67/70 comparison table is kept, not removed — only demoted below the new narrative (spec: "Design › Tooltip").
- No auto-play, no go-go/slow-go transition narration, no "stopped working" narrative beat, no scenario save/compare integration — all explicitly deferred per spec "Non-goals."

Full spec: `docs/superpowers/specs/2026-08-23-timeline-narrated-milestones-design.md`

---

## Task 1: `buildNarrative` pure function

**Files:**
- Modify: `frontend/src/components/OurLifelongTimeline/timelineMath.js`
- Modify: `frontend/src/components/OurLifelongTimeline/timelineMath.test.js`

**Interfaces:**
- Consumes: `formatCurrency(value) -> string` and `getAnnualIncome(monthlyValue) -> number`, both already defined earlier in `timelineMath.js`.
- Produces: `buildNarrative({ year, primaryLabel, primaryAge, spouseLabel, spouseAge, primaryMilestones, spouseMilestones, monthlyIncome, prematureDeath, deathYear }) -> { feel: string, milestoneNotes: string[], think: string, doLine: string | undefined, survivorNote: string | undefined }`. `primaryMilestones`/`spouseMilestones` are arrays shaped like `getMilestonesForPerson()`'s return value (`{ year, label, kind }`).

- [ ] **Step 1: Write the failing tests**

Add to `frontend/src/components/OurLifelongTimeline/timelineMath.test.js`:

```javascript
import { buildNarrative } from './timelineMath';

describe('buildNarrative', () => {
  // Demo: milestones land at 2027 (age62), 2031 (chosenFilingAge), 2032 (fra), 2035 (age70).
  // Spouse: milestones land at 2028 (age62), 2032 (fra -- same year as Demo's FRA, to test the
  // both-people-same-year case), 2036 (age70).
  const primaryMilestones = [
    { year: 2027, label: 'Demo turns 62', kind: 'age62' },
    { year: 2031, label: "Demo's chosen filing age", kind: 'chosenFilingAge' },
    { year: 2032, label: 'Demo reaches full retirement age', kind: 'fra' },
    { year: 2035, label: 'Demo turns 70', kind: 'age70' }
  ];
  const spouseMilestones = [
    { year: 2028, label: 'Spouse turns 62', kind: 'age62' },
    { year: 2032, label: 'Spouse reaches full retirement age', kind: 'fra' },
    { year: 2036, label: 'Spouse turns 70', kind: 'age70' }
  ];

  const baseArgs = {
    primaryLabel: 'Demo',
    spouseLabel: 'Spouse',
    primaryMilestones,
    spouseMilestones,
    monthlyIncome: 3140,
    prematureDeath: false,
    deathYear: undefined
  };

  test('feel line always states both ages for the cursor year', () => {
    const narrative = buildNarrative({ ...baseArgs, year: 2030, primaryAge: 65, spouseAge: 60 });
    expect(narrative.feel).toBe('2030: Demo is 65, Spouse is 60.');
  });

  test('think line formats the dramatic income reveal', () => {
    const narrative = buildNarrative({ ...baseArgs, year: 2030, primaryAge: 65, spouseAge: 60 });
    expect(narrative.think).toBe('$3,140/month · $37,680/year');
  });

  test('no milestone on the cursor year -> empty milestoneNotes and no doLine', () => {
    const narrative = buildNarrative({ ...baseArgs, year: 2030, primaryAge: 65, spouseAge: 60 });
    expect(narrative.milestoneNotes).toEqual([]);
    expect(narrative.doLine).toBeUndefined();
  });

  test('age62 milestone -> milestoneNotes and the age62 doLine', () => {
    const narrative = buildNarrative({ ...baseArgs, year: 2027, primaryAge: 62, spouseAge: 57 });
    expect(narrative.milestoneNotes).toEqual(['Demo turns 62']);
    expect(narrative.doLine).toBe('This is the earliest possible filing age — the smallest benefit this household could lock in.');
  });

  test('chosenFilingAge milestone -> the chosenFilingAge doLine', () => {
    const narrative = buildNarrative({ ...baseArgs, year: 2031, primaryAge: 66, spouseAge: 61 });
    expect(narrative.milestoneNotes).toEqual(["Demo's chosen filing age"]);
    expect(narrative.doLine).toBe("This is the age you've chosen to file.");
  });

  test('age70 milestone -> the age70 doLine', () => {
    const narrative = buildNarrative({ ...baseArgs, year: 2035, primaryAge: 70, spouseAge: 65 });
    expect(narrative.milestoneNotes).toEqual(['Demo turns 70']);
    expect(narrative.doLine).toBe("This is the last year waiting still grows the benefit — filing later than this doesn't add more.");
  });

  test('both people reaching FRA the same year -> both notes, doLine from the first (primary) entry', () => {
    const narrative = buildNarrative({ ...baseArgs, year: 2032, primaryAge: 67, spouseAge: 62 });
    expect(narrative.milestoneNotes).toEqual([
      'Demo reaches full retirement age',
      'Spouse reaches full retirement age'
    ]);
    expect(narrative.doLine).toBe('Filing here locks in your full, unreduced benefit — no early-claim penalty, no delayed-credit bonus.');
  });

  test('premature death on, cursor year before deathYear -> no survivorNote', () => {
    const narrative = buildNarrative({
      ...baseArgs,
      year: 2039,
      primaryAge: 74,
      spouseAge: 69,
      prematureDeath: true,
      deathYear: 2040
    });
    expect(narrative.survivorNote).toBeUndefined();
  });

  test('premature death on, cursor year at deathYear -> survivorNote present', () => {
    const narrative = buildNarrative({
      ...baseArgs,
      year: 2040,
      primaryAge: 75,
      spouseAge: 70,
      prematureDeath: true,
      deathYear: 2040
    });
    expect(narrative.survivorNote).toBe('This reflects survivor benefits, assuming Demo has passed by now.');
  });

  test('premature death on, cursor year after deathYear -> survivorNote present', () => {
    const narrative = buildNarrative({
      ...baseArgs,
      year: 2045,
      primaryAge: 80,
      spouseAge: 75,
      prematureDeath: true,
      deathYear: 2040
    });
    expect(narrative.survivorNote).toBe('This reflects survivor benefits, assuming Demo has passed by now.');
  });

  test('premature death off -> survivorNote always absent regardless of year', () => {
    const narrative = buildNarrative({
      ...baseArgs,
      year: 2050,
      primaryAge: 85,
      spouseAge: 80,
      prematureDeath: false,
      deathYear: 2040
    });
    expect(narrative.survivorNote).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && CI=true npx react-scripts test src/components/OurLifelongTimeline/timelineMath.test.js --watchAll=false`
Expected: FAIL — `buildNarrative` is not exported yet.

- [ ] **Step 3: Write the implementation**

Add to the end of `frontend/src/components/OurLifelongTimeline/timelineMath.js`:

```javascript
const MILESTONE_DO_LINES = {
  age62: 'This is the earliest possible filing age — the smallest benefit this household could lock in.',
  fra: 'Filing here locks in your full, unreduced benefit — no early-claim penalty, no delayed-credit bonus.',
  chosenFilingAge: "This is the age you've chosen to file.",
  age70: "This is the last year waiting still grows the benefit — filing later than this doesn't add more."
};

export const buildNarrative = ({
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
}) => {
  const feel = `${year}: ${primaryLabel} is ${primaryAge}, ${spouseLabel} is ${spouseAge}.`;
  const think = `${formatCurrency(monthlyIncome)}/month · ${formatCurrency(getAnnualIncome(monthlyIncome))}/year`;

  // Order matters: primary's milestones are checked first, so when both people land a
  // milestone on the same year, doLine is derived from the primary's entry (array order,
  // not a significance ranking -- see spec "Design > Narrative content").
  const matches = [...primaryMilestones, ...spouseMilestones].filter((m) => m.year === year);
  const milestoneNotes = matches.map((m) => m.label);
  const doLine = matches.length > 0 ? MILESTONE_DO_LINES[matches[0].kind] : undefined;

  const survivorNote =
    prematureDeath && year >= deathYear
      ? `This reflects survivor benefits, assuming ${primaryLabel} has passed by now.`
      : undefined;

  return { feel, milestoneNotes, think, doLine, survivorNote };
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && CI=true npx react-scripts test src/components/OurLifelongTimeline/timelineMath.test.js --watchAll=false`
Expected: PASS (all existing tests plus the 10 new `buildNarrative` tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/OurLifelongTimeline/timelineMath.js frontend/src/components/OurLifelongTimeline/timelineMath.test.js
git commit -m "feat(timeline): add buildNarrative Feel/Think/Do template function"
```

---

## Task 2: Visible, clickable milestone markers in `CalendarPhaseBar`

**Files:**
- Modify: `frontend/src/components/OurLifelongTimeline/CalendarPhaseBar.jsx`

**Interfaces:**
- Consumes: nothing new from Task 1 (this task only changes marker rendering/interaction).
- Produces: a new required prop `onMilestoneClick(year: number) -> void` on `CalendarPhaseBar`, called by `OurLifelongTimeline` in Task 4.

Currently (`CalendarPhaseBar.jsx` lines 115–128) each milestone renders as an invisible 1px-wide `bg-gray-300` div with only a hover `title`. This task replaces that block with a visible, color-coded, clickable marker per milestone `kind`, and adds the `onMilestoneClick` prop. The chip text is a short kind-based abbreviation ("62", "FRA", "Filed", "70") rather than the full `m.label` sentence — two milestones for the same person can land as little as a year apart (50px at this module's `PX_PER_YEAR`), and full sentences would overlap at that spacing. The full text stays available via the `title` attribute on hover.

- [ ] **Step 1: Add the milestone style map and `onMilestoneClick` prop**

In `frontend/src/components/OurLifelongTimeline/CalendarPhaseBar.jsx`, add above the component definition (after the existing `MIN_AGE`/`MAX_AGE` constants):

```javascript
const MILESTONE_STYLES = {
  age62: { color: '#3B82F6', chip: '62' },
  fra: { color: '#8B5CF6', chip: 'FRA' },
  chosenFilingAge: { color: '#10B981', chip: 'Filed' },
  age70: { color: '#F59E0B', chip: '70' }
};
```

Add `onMilestoneClick` to the destructured props list (alongside the existing `milestones` prop):

```javascript
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
  milestones,
  onMilestoneClick
}) => {
```

- [ ] **Step 2: Replace the milestone marker render block**

Find this block:

```jsx
      {/* Milestone markers, positioned on the full shared track independent of the bar itself.
          Markers for already-past years (common for this app's 58+ target users) would compute
          a negative percent and sit off-canvas to the left of the overflow-x-auto track with no
          way to scroll to them -- skip rendering those rather than leave an unreachable marker. */}
      {milestones
        .filter((m) => yearToPercent(m.year) >= 0)
        .map((m) => (
          <div
            key={`${m.kind}-${m.year}`}
            className="absolute top-0 bottom-0 w-px bg-gray-300"
            style={{ left: `${yearToPercent(m.year)}%` }}
            title={m.label}
          />
        ))}
```

Replace it with:

```jsx
      {/* Milestone markers, positioned on the full shared track independent of the bar itself.
          Markers for already-past years (common for this app's 58+ target users) would compute
          a negative percent and sit off-canvas to the left of the overflow-x-auto track with no
          way to scroll to them -- skip rendering those rather than leave an unreachable marker.
          Clicking a marker snaps the shared inspection cursor to that year via onMilestoneClick
          -- the same cursorYear state the drag cursor already writes to, not a parallel state. */}
      {milestones
        .filter((m) => yearToPercent(m.year) >= 0)
        .map((m) => {
          const style = MILESTONE_STYLES[m.kind];
          return (
            <button
              key={`${m.kind}-${m.year}`}
              type="button"
              onClick={() => onMilestoneClick(m.year)}
              className="absolute top-0 bottom-0 flex flex-col items-center bg-transparent border-0 p-0 cursor-pointer"
              style={{ left: `${yearToPercent(m.year)}%` }}
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

- [ ] **Step 3: Manual verification**

No component-testing library exists in this repo (only `timelineMath.js` has a `.test.js` file) — this change is verified visually in Task 5 once wired into the calculator. Proceed to commit.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/OurLifelongTimeline/CalendarPhaseBar.jsx
git commit -m "feat(timeline): make milestone markers visible and clickable"
```

---

## Task 3: Narrated tooltip in `TimelineCursor`

**Files:**
- Modify: `frontend/src/components/OurLifelongTimeline/TimelineCursor.jsx`

**Interfaces:**
- Consumes: `buildNarrative(...)` from `./timelineMath` (Task 1).
- Produces: four new required props on `TimelineCursor` — `primaryMilestones`, `spouseMilestones`, `prematureDeath`, `deathYear` — wired by `OurLifelongTimeline` in Task 4.

- [ ] **Step 1: Import `buildNarrative` and accept the new props**

In `frontend/src/components/OurLifelongTimeline/TimelineCursor.jsx`, change the import line. `getAnnualIncome` is dropped from this import — `buildNarrative`'s `think` string now owns the annualized figure, so this component no longer calls `getAnnualIncome` directly:

```javascript
import { formatCurrency, formatBucketValue, buildNarrative } from './timelineMath';
```

Add the four new props to the destructured prop list:

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
  buckets,
  primaryMilestones,
  spouseMilestones,
  prematureDeath,
  deathYear
}) => {
```

- [ ] **Step 2: Compute the narrative and replace the tooltip body**

Inside the component body, after the existing `xToYear`/`useEffect` block and before the `return`, add:

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

Find the tooltip's inner content block:

```jsx
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
```

Replace it with:

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

`formatCurrency` and `formatBucketValue` remain used by the bucket comparison table below, so both stay in the import from Step 1.

- [ ] **Step 3: Manual verification**

No component-testing library exists in this repo; verified visually in Task 5.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/OurLifelongTimeline/TimelineCursor.jsx
git commit -m "feat(timeline): rewrite tooltip around Feel/Think/Do narrative"
```

---

## Task 4: Wire milestone clicks and narrative props through `OurLifelongTimeline`

**Files:**
- Modify: `frontend/src/components/OurLifelongTimeline/OurLifelongTimeline.jsx`

**Interfaces:**
- Consumes: `onMilestoneClick` prop on `CalendarPhaseBar` (Task 2); `primaryMilestones`, `spouseMilestones`, `prematureDeath`, `deathYear` props on `TimelineCursor` (Task 3).

`OurLifelongTimeline.jsx` already computes `primaryMilestones`, `spouseMilestones`, `prematureDeath`, and `deathYear` (lines 19–20, 50, 57–64) and already owns `cursorYear`/`setCursorYear` (line 40) — this task only adds prop wiring, no new computation.

- [ ] **Step 1: Pass `onMilestoneClick` to both `CalendarPhaseBar` instances**

In `frontend/src/components/OurLifelongTimeline/OurLifelongTimeline.jsx`, add `onMilestoneClick={setCursorYear}` to the primary person's `CalendarPhaseBar` (after its existing `milestones={primaryMilestones}` prop):

```jsx
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
              onMilestoneClick={setCursorYear}
            />
```

And the same for the spouse's `CalendarPhaseBar` (after its `milestones={spouseMilestones}` prop):

```jsx
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
              onMilestoneClick={setCursorYear}
            />
```

- [ ] **Step 2: Pass the narrative props to `TimelineCursor`**

Add `primaryMilestones`, `spouseMilestones`, `prematureDeath`, and `deathYear` to the existing `TimelineCursor` element (after its `buckets={buckets}` prop):

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

- [ ] **Step 3: Run the full frontend test suite to check for regressions**

Run: `cd frontend && CI=true npx react-scripts test --watchAll=false`
Expected: PASS — all existing suites plus Task 1's new `buildNarrative` tests.

- [ ] **Step 4: Run the CI build to confirm no new lint errors**

Run: `cd frontend && CI=true npm run build`
Expected: `Compiled successfully.`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/OurLifelongTimeline/OurLifelongTimeline.jsx
git commit -m "feat(timeline): wire milestone clicks and narrative props through OurLifelongTimeline"
```

---

## Task 5: Manual browser verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server and reach the timeline**

Start the dev server (`npm start` from `frontend/`), open the Show Me The Money calculator in Married mode with two people whose birth years differ by a few years, and expand "Our Lifelong Timeline" (see the existing spec's entry-point instructions if the toggle isn't immediately visible).

- [ ] **Step 2: Verify markers are visible**

Confirm each of the four milestone kinds (62, FRA, chosen filing age, 70) now renders as a visible colored dot + chip on each person's bar, instead of the old invisible 1px line. Hover one to confirm the full `title` text (e.g. "Demo turns 62") still appears.

- [ ] **Step 3: Verify milestone clicks move the cursor**

Click a milestone marker. Confirm the green inspection cursor line jumps to that exact year and the tooltip updates to that year's narrative — the same behavior as dragging the cursor there manually.

- [ ] **Step 4: Verify the narrative tooltip on a non-milestone year**

Drag the cursor to a year with no milestone for either person. Confirm the tooltip shows the Feel line (ages) and the large Think dollar reveal, with no milestone chip and no italic Do line.

- [ ] **Step 5: Verify the narrative tooltip on a milestone year**

Drag or click to a year where a milestone lands. Confirm the milestone chip(s) and the matching Do line appear, matching the milestone's kind (e.g. landing on age 70 shows the "last year waiting still grows the benefit" line).

- [ ] **Step 6: Verify the survivor note**

Enable "Potential Premature Death" in the sidebar with a death age that falls within the visible timeline range. Confirm the tooltip shows no survivor note for years before the death year, and shows the distinct survivor note styling for years at/after it. Disable the toggle and confirm the survivor note disappears regardless of year.

- [ ] **Step 7: Verify the comparison table still works**

Confirm the existing "If both filed at 62/67/70" table still renders beneath the new narrative content, with its muted "starts \<year>" behavior for buckets that haven't started yet.

If any of these fail, fix the relevant task's code before considering this plan complete.

---

## Plan Self-Review Notes

- **Spec coverage:** milestone visibility + click-to-snap (Task 2, wired in Task 4), Feel/Think/Do template (Task 1), tooltip restructure with demoted comparison table (Task 3), scrapbook-style per-kind color/chip styling (Task 2), no-new-source-of-truth constraint (Task 4 reuses `setCursorYear`). "Stopped working," auto-play, and go-go/slow-go narration are out of scope per spec Non-goals and are not present in this plan.
- **No placeholders:** every step contains complete, runnable code.
- **Type/name consistency check:** `buildNarrative` (Task 1) returns `{ feel, milestoneNotes, think, doLine, survivorNote }` — `TimelineCursor` (Task 3) destructures and renders exactly those five keys. `CalendarPhaseBar`'s new `onMilestoneClick` prop (Task 2) is called with a single `year: number` argument, matching `setCursorYear`'s signature as wired in Task 4. `primaryMilestones`/`spouseMilestones` keep the `{ year, label, kind }` shape from the existing `getMilestonesForPerson` (unchanged) — consumed identically by `buildNarrative` (Task 1) and passed through unmodified by `OurLifelongTimeline` (Task 4).
