# Scenario Model & Earnings Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the uploaded SSA earnings record into the factual basis of the Show Me The Money chart, and make the inputs behind that chart a single serializable scenario object.

**Architecture:** Extract the ~26 scenario-defining inputs currently scattered across 63 `useState` calls in `ShowMeTheMoneyCalculator.jsx` into one reducer-backed object, using local shadow bindings so the 4,800 lines of JSX below need no edits. Separately, persist uploaded earnings records to the database (today they live only in React state and vanish on reload) and expose them to the chart. The chart then labels its numbers "Preliminary Estimate" until a verified earnings record exists, at which point it recomputes and shows what changed.

**Tech Stack:** React 18 (CRA, `react-scripts test` / Jest), Python 3.12 FastAPI, Supabase Postgres, pytest.

## Global Constraints

- Scenario state and view state must stay separate. Chart dimensions, modal open/closed flags, animation/playback state, and drag flags are **view** state and must never enter the scenario object or be persisted into a saved plan.
- Every scenario carries `schemaVersion` and a frozen `assumptions` block. A scenario saved under 2026 bend points must still report 2026 bend points after the tables are updated.
- Saved-plan naming: **"My Lifelong Plan"** when `isMarried === false`, **"Our Lifelong Plan"** when `isMarried === true`.
- Provenance strings are exactly `'estimated'` and `'verified'`. UI labels are exactly `Preliminary Lifelong Estimate` and `Earnings Record Verified`.
- SSA constant tables live in `backend/core/ssa_xml_processor.py` and `frontend/src/utils/taxableMaximum.js`. Do not add a third copy.
- No behavior change is permitted in Task 2. It is a pure refactor; the rendered output must be identical.

## File Structure

**Create:**
- `frontend/src/calculators/showMeTheMoney/scenario.js` — scenario shape, reducer, serialization, comparability check. Pure, no React.
- `frontend/src/calculators/showMeTheMoney/scenario.test.js` — unit tests for the above.
- `frontend/src/services/earningsService.js` — HTTP client for earnings-record persistence and the work-stop ladder.
- `frontend/src/services/earningsService.test.js` — unit tests with mocked `fetch`.
- `backend/migrations/005_add_earnings_records.sql` — `earnings_records` table + RLS.
- `backend/api/earnings.py` — CRUD for earnings records.
- `backend/tests/test_earnings_api.py` — tests for the above.
- `backend/tests/test_work_stop_ladder.py` — tests for the ladder endpoint.

**Modify:**
- `backend/main.py` — register the earnings router.
- `backend/requirements.txt` — add pytest (currently absent; `pytest.ini` exists but the dependency was never declared).
- `backend/api/calculation_routes.py` — add the work-stop ladder endpoint.
- `backend/api/calculation_models.py` — request/response models for the ladder.
- `frontend/src/components/ShowMeTheMoneyCalculator.jsx:1655-1900` — replace scenario `useState` calls with the reducer; add the verification banner.
- `frontend/src/components/PIACalculator.jsx:355-460` — persist earnings after a successful XML upload.

---

### Task 1: Scenario model

**Files:**
- Create: `frontend/src/calculators/showMeTheMoney/scenario.js`
- Test: `frontend/src/calculators/showMeTheMoney/scenario.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `SCENARIO_SCHEMA_VERSION: number`, `PROVENANCE: {ESTIMATED: 'estimated', VERIFIED: 'verified'}`, `SCENARIO_FIELDS: string[]`, `createScenario(overrides?: object): Scenario`, `scenarioReducer(state: Scenario, action: object): Scenario`, `serializeScenario(s: Scenario): object`, `deserializeScenario(raw: object): Scenario`, `areScenariosComparable(a: Scenario, b: Scenario): boolean`, `planLabel(s: Scenario): string`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/calculators/showMeTheMoney/scenario.test.js`:

```javascript
import {
  SCENARIO_SCHEMA_VERSION,
  PROVENANCE,
  SCENARIO_FIELDS,
  createScenario,
  scenarioReducer,
  serializeScenario,
  deserializeScenario,
  areScenariosComparable,
  planLabel
} from './scenario';

describe('createScenario', () => {
  it('applies documented defaults', () => {
    const s = createScenario();
    expect(s.inflation).toBe(0.025);
    expect(s.spouse1PreferredYear).toBe(67);
    expect(s.spouse2PreferredYear).toBe(65);
    expect(s.monthlyNeeds).toBe(7000);
    expect(s.isMarried).toBe(false);
  });

  it('starts as an estimate with no earnings records', () => {
    const s = createScenario();
    expect(s.provenance).toBe(PROVENANCE.ESTIMATED);
    expect(s.earnings.spouse1).toBeNull();
    expect(s.earnings.spouse2).toBeNull();
  });

  it('freezes the assumption set at creation time', () => {
    const s = createScenario({ inflation: 0.03 }, { bendPointsYear: 2026 });
    expect(s.assumptions.bendPointsYear).toBe(2026);
    expect(s.assumptions.colaRate).toBe(0.03);
    expect(s.schemaVersion).toBe(SCENARIO_SCHEMA_VERSION);
  });

  it('accepts overrides for any declared field', () => {
    const s = createScenario({ spouse1Pia: 3000, isMarried: true });
    expect(s.spouse1Pia).toBe(3000);
    expect(s.isMarried).toBe(true);
  });

  it('ignores unknown keys so view state cannot leak in', () => {
    const s = createScenario({ svgHeight: 700, isPlaying: true });
    expect(s.svgHeight).toBeUndefined();
    expect(s.isPlaying).toBeUndefined();
  });
});

describe('SCENARIO_FIELDS', () => {
  it('contains every field the projection memo depends on', () => {
    [
      'isMarried', 'spouse1Dob', 'spouse1Pia', 'spouse1PreferredYear',
      'spouse1PreferredMonth', 'spouse2Dob', 'spouse2Pia',
      'spouse2PreferredYear', 'spouse2PreferredMonth', 'inflation',
      'prematureDeath', 'deathAge', 'piaStrategy'
    ].forEach((f) => expect(SCENARIO_FIELDS).toContain(f));
  });

  it('excludes view state', () => {
    ['svgHeight', 'isPlaying', 'chartView', 'sidebarCollapsed', 'showYearModal']
      .forEach((f) => expect(SCENARIO_FIELDS).not.toContain(f));
  });
});

describe('scenarioReducer', () => {
  it('sets a single field without disturbing others', () => {
    const s = createScenario({ spouse1Pia: 2000 });
    const next = scenarioReducer(s, { type: 'SET_FIELD', field: 'inflation', value: 0.03 });
    expect(next.inflation).toBe(0.03);
    expect(next.spouse1Pia).toBe(2000);
  });

  it('returns the same reference when the value is unchanged', () => {
    const s = createScenario({ inflation: 0.025 });
    const next = scenarioReducer(s, { type: 'SET_FIELD', field: 'inflation', value: 0.025 });
    expect(next).toBe(s);
  });

  it('rejects fields outside SCENARIO_FIELDS', () => {
    const s = createScenario();
    const next = scenarioReducer(s, { type: 'SET_FIELD', field: 'svgHeight', value: 900 });
    expect(next).toBe(s);
    expect(next.svgHeight).toBeUndefined();
  });

  it('attaches an earnings record and flips provenance to verified', () => {
    const s = createScenario();
    const record = { birthYear: 1965, rows: [{ year: 2020, earnings: 100000 }], pia: 3000 };
    const next = scenarioReducer(s, { type: 'SET_EARNINGS', person: 'spouse1', record });
    expect(next.earnings.spouse1).toEqual(record);
    expect(next.provenance).toBe(PROVENANCE.VERIFIED);
  });

  it('stays estimated when an earnings record is cleared', () => {
    const s = scenarioReducer(createScenario(), {
      type: 'SET_EARNINGS', person: 'spouse1', record: { birthYear: 1965, rows: [], pia: 1 }
    });
    const next = scenarioReducer(s, { type: 'SET_EARNINGS', person: 'spouse1', record: null });
    expect(next.provenance).toBe(PROVENANCE.ESTIMATED);
  });

  it('replaces the whole scenario on LOAD', () => {
    const s = createScenario({ spouse1Pia: 1000 });
    const loaded = createScenario({ spouse1Pia: 4000, isMarried: true });
    expect(scenarioReducer(s, { type: 'LOAD', scenario: loaded }).spouse1Pia).toBe(4000);
  });
});

describe('serialization', () => {
  it('round-trips without loss', () => {
    const s = createScenario({ spouse1Pia: 3000, isMarried: true, deathAge: 82 });
    expect(deserializeScenario(serializeScenario(s))).toEqual(s);
  });

  it('fills missing fields from defaults when reading an older payload', () => {
    const restored = deserializeScenario({ schemaVersion: 1, spouse1Pia: 2500 });
    expect(restored.spouse1Pia).toBe(2500);
    expect(restored.inflation).toBe(0.025);
  });

  it('preserves the recorded assumptions rather than reapplying current ones', () => {
    const restored = deserializeScenario({
      schemaVersion: 1,
      assumptions: { bendPointsYear: 2025, colaRate: 0.02 }
    });
    expect(restored.assumptions.bendPointsYear).toBe(2025);
  });
});

describe('areScenariosComparable', () => {
  it('is true when assumptions match', () => {
    const a = createScenario({ spouse1PreferredYear: 62 }, { bendPointsYear: 2026 });
    const b = createScenario({ spouse1PreferredYear: 70 }, { bendPointsYear: 2026 });
    expect(areScenariosComparable(a, b)).toBe(true);
  });

  it('is false when COLA differs, since the lines would not be comparable', () => {
    const a = createScenario({ inflation: 0.025 }, { bendPointsYear: 2026 });
    const b = createScenario({ inflation: 0.030 }, { bendPointsYear: 2026 });
    expect(areScenariosComparable(a, b)).toBe(false);
  });

  it('is false when bend point years differ', () => {
    const a = createScenario({}, { bendPointsYear: 2025 });
    const b = createScenario({}, { bendPointsYear: 2026 });
    expect(areScenariosComparable(a, b)).toBe(false);
  });
});

describe('planLabel', () => {
  it('is "My Lifelong Plan" when single', () => {
    expect(planLabel(createScenario({ isMarried: false }))).toBe('My Lifelong Plan');
  });

  it('is "Our Lifelong Plan" when married', () => {
    expect(planLabel(createScenario({ isMarried: true }))).toBe('Our Lifelong Plan');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && CI=true npx react-scripts test --watchAll=false --testPathPattern=scenario`
Expected: FAIL — `Cannot find module './scenario'`.

- [ ] **Step 3: Write the implementation**

Create `frontend/src/calculators/showMeTheMoney/scenario.js`:

```javascript
// The scenario is the complete set of inputs that determine what the chart shows.
// It is serializable, versioned, and deliberately excludes view state (chart
// dimensions, modal flags, playback position, drag flags).

export const SCENARIO_SCHEMA_VERSION = 1;

export const PROVENANCE = {
  ESTIMATED: 'estimated',
  VERIFIED: 'verified'
};

// Defaults mirror the values previously hardcoded in ShowMeTheMoneyCalculator's
// useState initializers, so behavior is unchanged by the extraction.
const DEFAULTS = {
  isMarried: false,

  spouse1Dob: '1965-02-03',
  spouse1Pia: '',
  spouse1PreferredYear: 67,
  spouse1PreferredMonth: 0,
  spouse1AlreadyFiled: false,
  spouse1CurrentBenefit: null,
  spouse1FiledAge: 65,

  spouse2Dob: '1965-06-18',
  spouse2Pia: '',
  spouse2PreferredYear: 65,
  spouse2PreferredMonth: 0,
  spouse2AlreadyFiled: false,
  spouse2CurrentBenefit: null,
  spouse2FiledAge: 65,

  inflation: 0.025,
  prematureDeath: false,
  deathAge: 75,
  piaStrategy: 'late',

  goGoEndAge: 75,
  slowGoEndAge: 85,
  spouseGoGoEndAge: 75,
  spouseSlowGoEndAge: 85,

  monthlyNeeds: 7000,
  flowAge: 70,
  bubbleAge: 70
};

export const SCENARIO_FIELDS = Object.keys(DEFAULTS);

const pickKnownFields = (source = {}) =>
  SCENARIO_FIELDS.reduce((acc, field) => {
    if (source[field] !== undefined) acc[field] = source[field];
    return acc;
  }, {});

export const createScenario = (overrides = {}, assumptions = {}) => {
  const fields = { ...DEFAULTS, ...pickKnownFields(overrides) };
  return {
    ...fields,
    schemaVersion: SCENARIO_SCHEMA_VERSION,
    provenance: PROVENANCE.ESTIMATED,
    earnings: { spouse1: null, spouse2: null },
    assumptions: {
      // Frozen at creation so a saved plan keeps reporting the tables it was
      // computed under, even after those tables are updated for a new year.
      bendPointsYear: assumptions.bendPointsYear ?? new Date().getFullYear(),
      colaRate: assumptions.colaRate ?? fields.inflation
    }
  };
};

const deriveProvenance = (earnings) =>
  earnings.spouse1 || earnings.spouse2 ? PROVENANCE.VERIFIED : PROVENANCE.ESTIMATED;

export const scenarioReducer = (state, action) => {
  switch (action.type) {
    case 'SET_FIELD': {
      if (!SCENARIO_FIELDS.includes(action.field)) return state;
      if (state[action.field] === action.value) return state;
      return { ...state, [action.field]: action.value };
    }
    case 'SET_EARNINGS': {
      if (action.person !== 'spouse1' && action.person !== 'spouse2') return state;
      const earnings = { ...state.earnings, [action.person]: action.record ?? null };
      return { ...state, earnings, provenance: deriveProvenance(earnings) };
    }
    case 'LOAD':
      return action.scenario;
    case 'RESET':
      return createScenario(action.overrides, action.assumptions);
    default:
      return state;
  }
};

export const serializeScenario = (scenario) => ({
  ...pickKnownFields(scenario),
  schemaVersion: scenario.schemaVersion,
  provenance: scenario.provenance,
  earnings: scenario.earnings,
  assumptions: scenario.assumptions
});

export const deserializeScenario = (raw = {}) => {
  const base = createScenario(raw);
  return {
    ...base,
    schemaVersion: raw.schemaVersion ?? SCENARIO_SCHEMA_VERSION,
    provenance: raw.provenance ?? base.provenance,
    earnings: raw.earnings ?? base.earnings,
    // Recorded assumptions win over freshly-derived ones.
    assumptions: raw.assumptions ?? base.assumptions
  };
};

export const areScenariosComparable = (a, b) =>
  a.assumptions.bendPointsYear === b.assumptions.bendPointsYear &&
  a.inflation === b.inflation;

export const planLabel = (scenario) =>
  scenario.isMarried ? 'Our Lifelong Plan' : 'My Lifelong Plan';
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && CI=true npx react-scripts test --watchAll=false --testPathPattern=scenario`
Expected: PASS, all suites.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/calculators/showMeTheMoney/scenario.js frontend/src/calculators/showMeTheMoney/scenario.test.js
git commit -m "feat: add versioned scenario model for Show Me The Money"
```

---

### Task 2: Migrate ShowMeTheMoneyCalculator onto the reducer

**Files:**
- Modify: `frontend/src/components/ShowMeTheMoneyCalculator.jsx:1655-1900`

**Interfaces:**
- Consumes: `createScenario`, `scenarioReducer`, `serializeScenario`, `deserializeScenario`, `SCENARIO_FIELDS` from Task 1.
- Produces: in-component `scenario` object and `dispatch`; every previously-existing local name (`spouse1Pia`, `setSpouse1Pia`, …) remains in scope with an identical call signature.

**Why this is safe:** the 26 scenario fields are re-exposed as local `const` bindings with the exact names the existing 4,800 lines already use. No JSX changes. The `scenarioData` useMemo keeps its dependency array. This is mechanical, and the existing tests plus a visual diff are the gate.

- [ ] **Step 1: Capture the pre-refactor baseline**

Run: `cd frontend && CI=true npx react-scripts test --watchAll=false`
Expected: PASS — 4 suites, 13 tests. Record this; it must be identical after the refactor.

- [ ] **Step 2: Add the import**

At `frontend/src/components/ShowMeTheMoneyCalculator.jsx`, alongside the existing imports:

```javascript
import {
  createScenario,
  scenarioReducer,
  serializeScenario,
  deserializeScenario
} from '../calculators/showMeTheMoney/scenario';
```

Add `useReducer` to the React import on line 1:

```javascript
import React, { useState, useEffect, useMemo, useRef, useReducer } from 'react';
```

- [ ] **Step 3: Replace the scenario useState block with the reducer**

Delete the 17 `useState` declarations spanning `spouse1Dob` through `bubbleAge` (currently lines ~1693–1715), plus `prematureDeath`, `deathAge`, `piaStrategy`, and the six `spouse1AlreadyFiled`/`spouse2AlreadyFiled` declarations. Do **not** touch `sidebarCollapsed`, `chartView`, `svgHeight`, or any other view state.

Insert in their place:

```javascript
const [scenario, dispatch] = useReducer(
  scenarioReducer,
  undefined,
  () => createScenario({
    isMarried: getInitialMarriedState(),
    spouse1Dob: getInitialSpouse1Dob(),
    spouse2Dob: getInitialSpouse2Dob()
  })
);

// Shadow bindings: every name below already appears throughout this file.
// Re-exposing them here keeps the ~4,800 lines of JSX unchanged.
const {
  isMarried, spouse1Dob, spouse1Pia, spouse1PreferredYear, spouse1PreferredMonth,
  spouse1AlreadyFiled, spouse1CurrentBenefit, spouse1FiledAge,
  spouse2Dob, spouse2Pia, spouse2PreferredYear, spouse2PreferredMonth,
  spouse2AlreadyFiled, spouse2CurrentBenefit, spouse2FiledAge,
  inflation, prematureDeath, deathAge, piaStrategy,
  goGoEndAge, slowGoEndAge, spouseGoGoEndAge, spouseSlowGoEndAge,
  monthlyNeeds, flowAge, bubbleAge
} = scenario;

const setScenarioField = (field) => (value) =>
  dispatch({ type: 'SET_FIELD', field, value });

const setIsMarried = setScenarioField('isMarried');
const setSpouse1Dob = setScenarioField('spouse1Dob');
const setSpouse1Pia = setScenarioField('spouse1Pia');
const setSpouse1PreferredYear = setScenarioField('spouse1PreferredYear');
const setSpouse1PreferredMonth = setScenarioField('spouse1PreferredMonth');
const setSpouse1AlreadyFiled = setScenarioField('spouse1AlreadyFiled');
const setSpouse1CurrentBenefit = setScenarioField('spouse1CurrentBenefit');
const setSpouse1FiledAge = setScenarioField('spouse1FiledAge');
const setSpouse2Dob = setScenarioField('spouse2Dob');
const setSpouse2Pia = setScenarioField('spouse2Pia');
const setSpouse2PreferredYear = setScenarioField('spouse2PreferredYear');
const setSpouse2PreferredMonth = setScenarioField('spouse2PreferredMonth');
const setSpouse2AlreadyFiled = setScenarioField('spouse2AlreadyFiled');
const setSpouse2CurrentBenefit = setScenarioField('spouse2CurrentBenefit');
const setSpouse2FiledAge = setScenarioField('spouse2FiledAge');
const setInflation = setScenarioField('inflation');
const setPrematureDeath = setScenarioField('prematureDeath');
const setDeathAge = setScenarioField('deathAge');
const setPiaStrategy = setScenarioField('piaStrategy');
const setGoGoEndAge = setScenarioField('goGoEndAge');
const setSlowGoEndAge = setScenarioField('slowGoEndAge');
const setSpouseGoGoEndAge = setScenarioField('spouseGoGoEndAge');
const setSpouseSlowGoEndAge = setScenarioField('spouseSlowGoEndAge');
const setMonthlyNeeds = setScenarioField('monthlyNeeds');
const setFlowAge = setScenarioField('flowAge');
const setBubbleAge = setScenarioField('bubbleAge');
```

- [ ] **Step 4: Convert the persistence effects to dispatches**

The restore effect (currently lines ~1727–1755) deliberately restores only 8 fields; the PIA, DOB, married, and preferred-age restores are commented out with a note that the profile sync owns them so the calculator matches Onboarding. **Preserve that restriction** — a blanket `LOAD` of the full deserialized scenario would resurrect the bug those comments describe. Convert the 8 surviving restores to per-field dispatches, leaving the commented-out lines commented:

```javascript
useEffect(() => {
  if (isLoaded && persistedState && !hasLoadedPersistedState.current) {
    hasLoadedPersistedState.current = true;
    const restored = deserializeScenario(persistedState);
    [
      'inflation', 'goGoEndAge', 'slowGoEndAge', 'spouseGoGoEndAge',
      'spouseSlowGoEndAge', 'monthlyNeeds', 'flowAge', 'bubbleAge'
    ].forEach((field) => {
      if (persistedState[field] !== undefined) {
        dispatch({ type: 'SET_FIELD', field, value: restored[field] });
      }
    });
  }
}, [isLoaded, persistedState]);
```

Replace the save effect (currently lines ~1841–1862) with:

```javascript
useEffect(() => {
  if (isLoaded) setPersistedState(serializeScenario(scenario));
}, [scenario, isLoaded, setPersistedState]);
```

Note the save effect's dependency array collapses from 18 entries to 3.

- [ ] **Step 5: Convert the sync effect to dispatches — but KEEP the ref guards**

The profile-sync effect (lines ~1766–1838) uses `lastProfilePia`, `lastPartnerPia`, and four preferred-age refs. Replace each guarded assignment's `setX(...)` call with a `dispatch({ type: 'SET_FIELD', ... })`, but **leave the six `useRef` declarations and their comparisons in place**.

They are not redundant with the reducer's identity check, and the difference is load-bearing:

- The reducer compares the incoming value against the **current local value** — it prevents redundant re-renders.
- The ref compares against the **last server value seen** — it prevents stale server data from overwriting an unsaved local edit.

This matters because `useCalculatorPersistence` autosaves through `updatePreferences`, which calls `setPreferences(data.preferences)` with a fresh object ([UserContext.jsx:456](../../../frontend/src/contexts/UserContext.jsx)). `preferences` is in this effect's dependency array, so **every autosave re-runs the sync effect**. Without the refs, a user's typed PIA would revert to the stale server value about half a second after typing. Example:

```javascript
const profilePia = profile.pia_at_fra ?? profile.piaAtFra ?? profile.own_pia ?? profile.ownPia;
if (profilePia !== undefined && profilePia !== null) {
  if (lastProfilePia.current !== profilePia) {
    dispatch({ type: 'SET_FIELD', field: 'spouse1Pia', value: profilePia });
    lastProfilePia.current = profilePia;
  }
}
```

Apply the same treatment to the partner PIA and the four preferred-age assignments.

The two follow-up effects at lines ~1911–1929 (`Update state when profile data changes` and `Update spouse DOB when partners data changes`) duplicate assignments the sync effect already makes and may be deleted.

- [ ] **Step 6: Verify no stragglers**

Run: `cd frontend && grep -c "useState(" src/components/ShowMeTheMoneyCalculator.jsx`
Expected: `36` (was 62; 26 scenario fields moved to the reducer).

Run: `cd frontend && npx eslint src/components/ShowMeTheMoneyCalculator.jsx`
Expected: no `no-undef` and no `no-unused-vars` errors. Any `no-undef` means a scenario field was removed without a matching shadow binding.

- [ ] **Step 7: Run the full test suite**

Run: `cd frontend && CI=true npx react-scripts test --watchAll=false`
Expected: PASS — 4 suites, 13 tests, identical to the Step 1 baseline.

- [ ] **Step 8: Verify the UI is unchanged**

Run: `cd frontend && npm start`, open Show Me The Money, and confirm: PIA fields accept typing without reverting; the Go-Go/Slow-Go sliders drag; toggling married shows/hides the spouse column; a reload restores the inputs.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/ShowMeTheMoneyCalculator.jsx
git commit -m "refactor: move Show Me The Money scenario inputs onto a reducer"
```

---

### Task 3: Persist earnings records

**Files:**
- Create: `backend/migrations/005_add_earnings_records.sql`
- Create: `backend/api/earnings.py`
- Create: `backend/tests/test_earnings_api.py`
- Modify: `backend/main.py`, `backend/requirements.txt`

**Interfaces:**
- Consumes: `backend/config/supabase.py` (existing `supabase` client), the auth pattern in `backend/api/children.py`.
- Produces: `GET /api/earnings` → `{"earnings": [EarningsRecordOut]}`; `PUT /api/earnings/{person}` where `person` ∈ `{"self","partner"}`, body `{"birth_year": int, "rows": [{"year": int, "earnings": float, "is_projected": bool}]}` → `EarningsRecordOut`; `DELETE /api/earnings/{person}` → `{"success": true}`. `EarningsRecordOut` = `{"person": str, "birth_year": int, "rows": [...], "updated_at": str}`.

**Context:** earnings currently exist only in React state — grep of `backend/migrations/*.sql` for "earnings" returns nothing. Without this table the Estimate→Verify flow cannot survive a page reload, and a spouse cannot add their record later.

- [ ] **Step 1: Declare the test dependency**

`pytest.ini` exists and sets `testpaths = tests backend/tests`, but pytest is not installed and not in `requirements.txt`. Append to `backend/requirements.txt`:

```
pytest>=8.0
httpx>=0.28
```

Run: `./backend/venv/bin/pip install -r backend/requirements.txt`

- [ ] **Step 2: Confirm the existing suite runs**

Run: `./backend/venv/bin/python -m pytest -q`
Expected: the pre-existing tests under `tests/` and `backend/tests/` execute. Record failures now so they are not confused with new ones.

- [ ] **Step 3: Write the failing test**

Create `backend/tests/test_earnings_api.py`:

```python
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_put_earnings_rejects_unknown_person():
    response = client.put(
        "/api/earnings/cousin",
        json={"birth_year": 1965, "rows": []},
    )
    assert response.status_code == 422


def test_put_earnings_rejects_birth_year_out_of_range():
    response = client.put(
        "/api/earnings/self",
        json={"birth_year": 1800, "rows": []},
    )
    assert response.status_code == 422


def test_put_earnings_rejects_negative_earnings():
    response = client.put(
        "/api/earnings/self",
        json={"birth_year": 1965, "rows": [{"year": 2020, "earnings": -5}]},
    )
    assert response.status_code == 422


def test_put_earnings_requires_authentication():
    response = client.put(
        "/api/earnings/self",
        json={"birth_year": 1965, "rows": [{"year": 2020, "earnings": 50000}]},
    )
    assert response.status_code == 401


def test_get_earnings_requires_authentication():
    assert client.get("/api/earnings").status_code == 401


def test_delete_earnings_requires_authentication():
    assert client.delete("/api/earnings/self").status_code == 401
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `./backend/venv/bin/python -m pytest backend/tests/test_earnings_api.py -v`
Expected: FAIL — all routes 404, because the router does not exist yet.

- [ ] **Step 5: Write the migration**

Create `backend/migrations/005_add_earnings_records.sql`:

```sql
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
```

Apply it in the Supabase SQL editor, matching how migrations 001–004 were applied.

- [ ] **Step 6: Write the router**

Create `backend/api/earnings.py`:

```python
"""
Earnings record persistence.
Handles: read, upsert, delete of a user's (and partner's) SSA earnings history.
"""
from typing import List, Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from backend.api.children import get_user_id_from_token_sync
from backend.config.supabase import supabase

router = APIRouter(prefix="/api/earnings", tags=["earnings"])


class EarningsRow(BaseModel):
    year: int = Field(..., ge=1937, le=2100)
    earnings: float = Field(..., ge=0)
    is_projected: bool = False


class EarningsRecordIn(BaseModel):
    birth_year: int = Field(..., ge=1937, le=2010)
    rows: List[EarningsRow]


class EarningsRecordOut(BaseModel):
    person: str
    birth_year: int
    rows: List[EarningsRow]
    updated_at: str


Person = Literal["self", "partner"]


def _require_user_id(request: Request) -> str:
    """
    get_user_id_from_token_sync returns None rather than raising, so every
    route must convert that into a 401 — the same pattern used in children.py.
    """
    user_id = get_user_id_from_token_sync(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return user_id


@router.get("")
async def get_earnings(request: Request):
    user_id = _require_user_id(request)
    response = (
        supabase.table("earnings_records")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )
    return {"earnings": response.data or []}


@router.put("/{person}", response_model=EarningsRecordOut)
async def upsert_earnings(person: Person, payload: EarningsRecordIn, request: Request):
    user_id = _require_user_id(request)
    record = {
        "user_id": user_id,
        "person": person,
        "birth_year": payload.birth_year,
        "rows": [row.model_dump() for row in payload.rows],
    }
    response = (
        supabase.table("earnings_records")
        .upsert(record, on_conflict="user_id,person")
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to save earnings record")

    saved = response.data[0]
    return EarningsRecordOut(
        person=saved["person"],
        birth_year=saved["birth_year"],
        rows=saved["rows"],
        updated_at=str(saved.get("updated_at", "")),
    )


@router.delete("/{person}")
async def delete_earnings(person: Person, request: Request):
    user_id = _require_user_id(request)
    (
        supabase.table("earnings_records")
        .delete()
        .eq("user_id", user_id)
        .eq("person", person)
        .execute()
    )
    return {"success": True}
```

- [ ] **Step 7: Register the router**

In `backend/main.py`, next to the existing router registrations:

```python
from backend.api import earnings
app.include_router(earnings.router)
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `./backend/venv/bin/python -m pytest backend/tests/test_earnings_api.py -v`
Expected: PASS — 6 tests.

- [ ] **Step 9: Commit**

```bash
git add backend/migrations/005_add_earnings_records.sql backend/api/earnings.py backend/tests/test_earnings_api.py backend/main.py backend/requirements.txt
git commit -m "feat: persist SSA earnings records per user and partner"
```

---

### Task 4: Work-stop ladder endpoint

**Files:**
- Modify: `backend/api/calculation_models.py`, `backend/api/calculation_routes.py`
- Test: `backend/tests/test_work_stop_ladder.py`

**Interfaces:**
- Consumes: `SSAXMLProcessor` (`backend/core/ssa_xml_processor.py`), `EarningsYearInput` (already defined at `calculation_models.py:145`).
- Produces: `POST /api/work-stop-ladder`, body `{"birth_year": int, "earnings_history": [EarningsYearInput], "stop_ages": [int]}` → `{"rungs": [{"stop_age": int, "stop_year": int, "aime": float, "pia": float}]}`.

**Rationale:** this is the arithmetic behind "If you stop work at 62: $2,873 / 65: $2,946 / 67: $3,012". `calculate_what_if_scenario` already exists; this endpoint calls it once per stop age by zeroing the years at and after each stop.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_work_stop_ladder.py`:

```python
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

BIRTH_YEAR = 1965
# 40 years of steady earnings at the taxable maximum era levels.
EARNINGS = [
    {"year": year, "earnings": 90000, "is_projected": year > 2026}
    for year in range(1990, 2036)
]


def _ladder(stop_ages):
    return client.post(
        "/api/work-stop-ladder",
        json={
            "birth_year": BIRTH_YEAR,
            "earnings_history": EARNINGS,
            "stop_ages": stop_ages,
        },
    )


def test_returns_one_rung_per_stop_age():
    response = _ladder([62, 65, 67, 70])
    assert response.status_code == 200
    rungs = response.json()["rungs"]
    assert [r["stop_age"] for r in rungs] == [62, 65, 67, 70]


def test_stop_year_is_birth_year_plus_stop_age():
    rungs = _ladder([62, 67]).json()["rungs"]
    assert rungs[0]["stop_year"] == BIRTH_YEAR + 62
    assert rungs[1]["stop_year"] == BIRTH_YEAR + 67


def test_working_longer_never_lowers_pia():
    rungs = _ladder([62, 65, 67, 70]).json()["rungs"]
    pias = [r["pia"] for r in rungs]
    assert pias == sorted(pias), f"PIA should be non-decreasing in stop age, got {pias}"


def test_rejects_stop_age_outside_62_to_70():
    assert _ladder([55]).status_code == 422
    assert _ladder([75]).status_code == 422


def test_rejects_empty_stop_ages():
    assert _ladder([]).status_code == 422
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `./backend/venv/bin/python -m pytest backend/tests/test_work_stop_ladder.py -v`
Expected: FAIL — 404, endpoint does not exist.

- [ ] **Step 3: Add the models**

Append to `backend/api/calculation_models.py`:

```python
class WorkStopLadderRequest(BaseModel):
    """Request for PIA across a range of work-stop ages"""
    birth_year: int = Field(..., ge=1937, le=2010)
    earnings_history: List[EarningsYearInput]
    stop_ages: List[int] = Field(..., min_length=1)

    @field_validator("stop_ages")
    @classmethod
    def validate_stop_ages(cls, value: List[int]) -> List[int]:
        for age in value:
            if age < 62 or age > 70:
                raise ValueError("stop_ages must be between 62 and 70")
        return value


class WorkStopRung(BaseModel):
    """PIA outcome for a single work-stop age"""
    stop_age: int
    stop_year: int
    aime: float
    pia: float


class WorkStopLadderResult(BaseModel):
    rungs: List[WorkStopRung]
```

Ensure `field_validator` is imported at the top of the file:

```python
from pydantic import BaseModel, Field, field_validator
```

- [ ] **Step 4: Add the endpoint**

Append to `backend/api/calculation_routes.py`:

```python
@router.post("/work-stop-ladder", response_model=WorkStopLadderResult)
async def work_stop_ladder(request: WorkStopLadderRequest):
    """
    Recompute PIA for each candidate work-stop age.

    Answers "what happens if you stop working at 62 vs 65 vs 67?" by zeroing
    every earnings year at or after the stop year and recomputing AIME/PIA.
    """
    try:
        rungs = []
        for stop_age in sorted(request.stop_ages):
            stop_year = request.birth_year + stop_age
            processor = SSAXMLProcessor(birth_year=request.birth_year)
            processor.earnings_history = [
                EarningsRecord(
                    year=entry.year,
                    earnings=0 if entry.year >= stop_year else entry.earnings,
                    is_zero=(entry.year >= stop_year or entry.earnings == 0),
                    is_projected=entry.is_projected,
                )
                for entry in request.earnings_history
            ]
            calculation = processor.calculate_aime_and_pia()
            rungs.append(
                WorkStopRung(
                    stop_age=stop_age,
                    stop_year=stop_year,
                    aime=calculation["aime"],
                    pia=calculation["pia"],
                )
            )
        return WorkStopLadderResult(rungs=rungs)
    except Exception as e:
        logger.error(f"Work-stop ladder error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Work-stop ladder failed: {str(e)}")
```

Add `WorkStopLadderRequest`, `WorkStopRung`, and `WorkStopLadderResult` to the model imports at the top of the file.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `./backend/venv/bin/python -m pytest backend/tests/test_work_stop_ladder.py -v`
Expected: PASS — 5 tests.

- [ ] **Step 6: Commit**

```bash
git add backend/api/calculation_models.py backend/api/calculation_routes.py backend/tests/test_work_stop_ladder.py
git commit -m "feat: add work-stop ladder endpoint for PIA by retirement age"
```

---

### Task 5: Frontend earnings service

**Files:**
- Create: `frontend/src/services/earningsService.js`
- Test: `frontend/src/services/earningsService.test.js`

**Interfaces:**
- Consumes: `apiFetch`, `authHeaders` from `frontend/src/services/apiClient.js`; endpoints from Tasks 3 and 4.
- Produces: `fetchEarnings(token): Promise<{spouse1: Record|null, spouse2: Record|null}>`, `saveEarnings(token, person, record): Promise<Record>`, `fetchWorkStopLadder({birthYear, rows, stopAges}): Promise<Rung[]>` where `Record = {birthYear: number, rows: Row[]}` and `Rung = {stopAge, stopYear, aime, pia}`.

**Note:** this module is the single place that translates between the API's `snake_case` and the frontend's `camelCase`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/services/earningsService.test.js`:

```javascript
import { fetchEarnings, saveEarnings, fetchWorkStopLadder } from './earningsService';

beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => { jest.resetAllMocks(); });

const jsonResponse = (body) => Promise.resolve({
  ok: true,
  headers: { get: () => 'application/json' },
  json: () => Promise.resolve(body)
});

describe('fetchEarnings', () => {
  it('maps self/partner onto spouse1/spouse2 in camelCase', async () => {
    global.fetch.mockReturnValue(jsonResponse({
      earnings: [
        { person: 'self', birth_year: 1965, rows: [{ year: 2020, earnings: 90000, is_projected: false }] },
        { person: 'partner', birth_year: 1968, rows: [] }
      ]
    }));

    const result = await fetchEarnings('tok');
    expect(result.spouse1.birthYear).toBe(1965);
    expect(result.spouse1.rows[0]).toEqual({ year: 2020, earnings: 90000, isProjected: false });
    expect(result.spouse2.birthYear).toBe(1968);
  });

  it('returns nulls when the user has no records', async () => {
    global.fetch.mockReturnValue(jsonResponse({ earnings: [] }));
    expect(await fetchEarnings('tok')).toEqual({ spouse1: null, spouse2: null });
  });
});

describe('saveEarnings', () => {
  it('PUTs to the person-specific route in snake_case', async () => {
    global.fetch.mockReturnValue(jsonResponse({
      person: 'self', birth_year: 1965, rows: [], updated_at: '2026-08-13'
    }));

    await saveEarnings('tok', 'spouse1', {
      birthYear: 1965,
      rows: [{ year: 2020, earnings: 90000, isProjected: false }]
    });

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain('/api/earnings/self');
    expect(options.method).toBe('PUT');
    expect(JSON.parse(options.body)).toEqual({
      birth_year: 1965,
      rows: [{ year: 2020, earnings: 90000, is_projected: false }]
    });
  });

  it('maps spouse2 onto the partner route', async () => {
    global.fetch.mockReturnValue(jsonResponse({
      person: 'partner', birth_year: 1968, rows: [], updated_at: '2026-08-13'
    }));
    await saveEarnings('tok', 'spouse2', { birthYear: 1968, rows: [] });
    expect(global.fetch.mock.calls[0][0]).toContain('/api/earnings/partner');
  });
});

describe('fetchWorkStopLadder', () => {
  it('returns camelCase rungs', async () => {
    global.fetch.mockReturnValue(jsonResponse({
      rungs: [{ stop_age: 62, stop_year: 2027, aime: 5000, pia: 2873 }]
    }));

    const rungs = await fetchWorkStopLadder({
      birthYear: 1965,
      rows: [{ year: 2020, earnings: 90000, isProjected: false }],
      stopAges: [62]
    });

    expect(rungs).toEqual([{ stopAge: 62, stopYear: 2027, aime: 5000, pia: 2873 }]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && CI=true npx react-scripts test --watchAll=false --testPathPattern=earningsService`
Expected: FAIL — `Cannot find module './earningsService'`.

- [ ] **Step 3: Write the implementation**

Create `frontend/src/services/earningsService.js`:

```javascript
import { apiFetch, authHeaders } from './apiClient';

// The API addresses people as 'self'/'partner'; the calculator uses spouse1/spouse2.
const PERSON_TO_API = { spouse1: 'self', spouse2: 'partner' };
const API_TO_PERSON = { self: 'spouse1', partner: 'spouse2' };

const toCamelRow = (row) => ({
  year: row.year,
  earnings: row.earnings,
  isProjected: Boolean(row.is_projected)
});

const toSnakeRow = (row) => ({
  year: row.year,
  earnings: row.earnings,
  is_projected: Boolean(row.isProjected)
});

const toCamelRecord = (record) => ({
  birthYear: record.birth_year,
  rows: (record.rows || []).map(toCamelRow)
});

export async function fetchEarnings(token) {
  const data = await apiFetch('/api/earnings', { headers: authHeaders(token) });
  const result = { spouse1: null, spouse2: null };
  (data.earnings || []).forEach((record) => {
    const person = API_TO_PERSON[record.person];
    if (person) result[person] = toCamelRecord(record);
  });
  return result;
}

export async function saveEarnings(token, person, record) {
  const apiPerson = PERSON_TO_API[person];
  if (!apiPerson) throw new Error(`Unknown person: ${person}`);

  const saved = await apiFetch(`/api/earnings/${apiPerson}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({
      birth_year: record.birthYear,
      rows: (record.rows || []).map(toSnakeRow)
    })
  });
  return toCamelRecord(saved);
}

export async function fetchWorkStopLadder({ birthYear, rows, stopAges }) {
  const data = await apiFetch('/api/work-stop-ladder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      birth_year: birthYear,
      earnings_history: (rows || []).map(toSnakeRow),
      stop_ages: stopAges
    })
  });
  return (data.rungs || []).map((rung) => ({
    stopAge: rung.stop_age,
    stopYear: rung.stop_year,
    aime: rung.aime,
    pia: rung.pia
  }));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && CI=true npx react-scripts test --watchAll=false --testPathPattern=earningsService`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/earningsService.js frontend/src/services/earningsService.test.js
git commit -m "feat: add earnings service client"
```

---

### Task 6: Save earnings on XML upload

**Files:**
- Modify: `frontend/src/components/PIACalculator.jsx:355-460`

**Interfaces:**
- Consumes: `saveEarnings` from Task 5; `getAuthToken` from `frontend/src/config/supabase.js`.
- Produces: no new exports. Side effect: a successful XML upload writes an `earnings_records` row.

**Auth note:** `UserContext` does **not** expose the session or access token. The established pattern across the codebase (see `UserContext.jsx:261`, `:283`, `:313`) is to call the exported `getAuthToken()` helper from `frontend/src/config/supabase.js`, which returns the token or `null`.

- [ ] **Step 1: Add the imports**

In `frontend/src/components/PIACalculator.jsx`:

```javascript
import { saveEarnings } from '../services/earningsService';
import { getAuthToken } from '../config/supabase';
```

- [ ] **Step 2: Persist after the earnings history is set**

Inside `handleXMLUpload`, immediately after the existing `setEarningsHistory(mappedEarnings);` call, add:

```javascript
// Persist so the record survives reload and is visible to Show Me The Money.
// A failure here must not block the upload the user just completed.
try {
  const token = await getAuthToken();
  if (token) {
    await saveEarnings(token, isPrimary ? 'spouse1' : 'spouse2', {
      birthYear: birthYear,
      rows: mappedEarnings.map((row) => ({
        year: row.year,
        earnings: row.earnings,
        isProjected: row.is_projected
      }))
    });
  }
} catch (persistError) {
  console.error('Could not save earnings record:', persistError);
}
```

- [ ] **Step 3: Verify manually**

Run: `cd frontend && npm start`. Sign in, open the PIA calculator, upload `backend/sample_ssa_statement.xml`. Then confirm persistence:

```bash
curl -s -H "Authorization: Bearer <token>" http://127.0.0.1:8000/api/earnings
```

Expected: JSON containing one record with `"person": "self"` and a populated `rows` array.

- [ ] **Step 4: Run the full frontend suite**

Run: `cd frontend && CI=true npx react-scripts test --watchAll=false`
Expected: PASS — 6 suites now (scenario and earningsService added).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/PIACalculator.jsx
git commit -m "feat: persist earnings record after SSA XML upload"
```

---

### Task 7: Estimate → Verified reveal

**Files:**
- Modify: `frontend/src/components/ShowMeTheMoneyCalculator.jsx`

**Interfaces:**
- Consumes: `fetchEarnings`, `fetchWorkStopLadder` (Task 5); `PROVENANCE`, `planLabel` (Task 1); `getAuthToken` from `frontend/src/config/supabase.js`; the `scenario`/`dispatch` pair (Task 2).
- Produces: no new exports. Renders the provenance banner and the work-stop ladder.

- [ ] **Step 1: Add imports**

```javascript
import { PROVENANCE, planLabel } from '../calculators/showMeTheMoney/scenario';
import { fetchEarnings, fetchWorkStopLadder } from '../services/earningsService';
import { getAuthToken } from '../config/supabase';
```

- [ ] **Step 2: Load any stored earnings on mount**

`UserContext` does not expose the access token, so acquire it with `getAuthToken()` (the same pattern `UserContext` itself uses internally). The effect keys off `user` so it re-runs on sign-in.

```javascript
useEffect(() => {
  let cancelled = false;

  (async () => {
    const token = await getAuthToken();
    if (!token || cancelled) return;
    try {
      const records = await fetchEarnings(token);
      if (cancelled) return;
      if (records.spouse1) dispatch({ type: 'SET_EARNINGS', person: 'spouse1', record: records.spouse1 });
      if (records.spouse2) dispatch({ type: 'SET_EARNINGS', person: 'spouse2', record: records.spouse2 });
    } catch (error) {
      console.error('Could not load earnings records:', error);
    }
  })();

  return () => { cancelled = true; };
}, [user]);
```

Confirm `user` is in the component's `useUser()` destructuring; add it if absent.

- [ ] **Step 3: Compute the work-stop ladder when a record exists**

```javascript
const [workStopLadder, setWorkStopLadder] = useState(null);

useEffect(() => {
  const record = scenario.earnings.spouse1;
  if (!record) { setWorkStopLadder(null); return; }

  let cancelled = false;
  fetchWorkStopLadder({
    birthYear: record.birthYear,
    rows: record.rows,
    stopAges: [62, 65, 67, 70]
  })
    .then((rungs) => { if (!cancelled) setWorkStopLadder(rungs); })
    .catch((error) => console.error('Could not compute work-stop ladder:', error));

  return () => { cancelled = true; };
}, [scenario.earnings.spouse1]);
```

`workStopLadder` is derived display data, not an input — it stays as `useState`, outside the scenario object.

- [ ] **Step 4: Render the banner**

Place this directly above the main chart container:

```jsx
{scenario.provenance === PROVENANCE.ESTIMATED ? (
  <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 mb-4">
    <div className="font-semibold text-amber-900">Preliminary Lifelong Estimate</div>
    <p className="text-sm text-amber-800 mt-1">
      These numbers assume your future earnings continue at their current level.
      Add your Social Security earnings record to replace that assumption with your own history.
    </p>
  </div>
) : (
  <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 mb-4">
    <div className="font-semibold text-emerald-900">Earnings Record Verified</div>
    <p className="text-sm text-emerald-800 mt-1">
      {planLabel(scenario)} is now based on your actual Social Security earnings history.
    </p>
  </div>
)}
```

- [ ] **Step 5: Render the ladder**

Directly beneath the banner:

```jsx
{workStopLadder && (
  <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 mb-4">
    <div className="font-semibold text-slate-900 mb-2">What if you stop working at…</div>
    <div className="grid grid-cols-4 gap-3">
      {workStopLadder.map((rung) => (
        <div key={rung.stopAge} className="text-center">
          <div className="text-xs uppercase tracking-wide text-slate-500">Age {rung.stopAge}</div>
          <div className="text-lg font-semibold text-slate-900">
            ${Math.round(rung.pia).toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">PIA at FRA</div>
        </div>
      ))}
    </div>
    {workStopLadder[0].pia === workStopLadder[workStopLadder.length - 1].pia && (
      <p className="text-sm text-emerald-700 mt-3">
        Good news — you already have 35 strong earnings years. Working longer has
        very little effect on your Social Security calculation.
      </p>
    )}
  </div>
)}
```

- [ ] **Step 6: Verify manually**

Run: `cd frontend && npm start`.
- Signed in with no earnings record: the amber "Preliminary Lifelong Estimate" banner shows and no ladder appears.
- After uploading XML in the PIA calculator and returning: the green "Earnings Record Verified" banner shows, the ladder renders four ages, and the copy reads "My Lifelong Plan" when single / "Our Lifelong Plan" when married.
- Reload the page: the verified state persists.

- [ ] **Step 7: Run the full frontend suite**

Run: `cd frontend && CI=true npx react-scripts test --watchAll=false`
Expected: PASS — 6 suites.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/ShowMeTheMoneyCalculator.jsx
git commit -m "feat: show estimate vs verified provenance and work-stop ladder"
```

---

## What this plan deliberately leaves out

- The household timeline (calendar-year band) — depends on the scenario object this plan produces.
- The scenarios table and save/load of multiple named plans — depends on the same.
- The comparison chart — depends on the scenarios table.
- Family maximum — an independent track, unblocked by this work.

`areScenariosComparable` and `planLabel` are built and tested here because the later comparison work needs them and they belong with the model, not because this plan uses them for anything beyond the banner.

## BLOCKER for the scenario-comparison chart — read before starting it

`areScenariosComparable()` compares the **live** `inflation` field, while each scenario also carries a **frozen** `assumptions.colaRate` captured at creation. The two diverge the moment a user moves the COLA slider after a scenario exists. Confirmed in the running app on 2026-08-13: `inflation: 0.04` alongside `assumptions.colaRate: 0.025` in the same persisted scenario.

Nothing calls `areScenariosComparable` yet, so this is latent. It stops being latent the day the comparison chart ships: two scenarios saved under genuinely different COLA assumptions would compare as if they matched, producing exactly the dishonest lines the frozen-assumption design exists to prevent.

Resolve before building capability 5:
- Decide which value is authoritative and make the function read it (recommended: `assumptions.colaRate`).
- Additionally refuse to compare when a scenario's live `inflation` has drifted from its own frozen `colaRate` — that drift means the saved plan no longer describes the assumptions it was computed under.
- Settle whether editing inflation should re-freeze `assumptions` or invalidate the scenario.
- Related: `deserializeScenario` replaces `assumptions` wholesale rather than merging, so a future partial payload could yield `colaRate: undefined`.
