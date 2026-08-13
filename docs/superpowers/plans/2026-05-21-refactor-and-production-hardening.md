# Refactor And Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the calculator in behavior-preserving slices, expand verification coverage, and harden the Cloudflare/Railway deployment for modest production traffic and iframe embedding.

**Architecture:** Keep the public app behavior and API endpoints stable while extracting pure calculation logic, chart/persistence helpers, and backend route/model boundaries. Production hardening focuses on request limits, CORS, iframe headers, runtime worker configuration, and observability rather than premature scale redesign.

**Tech Stack:** React 18 / Create React App, Chart.js, FastAPI, Pydantic, Supabase, Railway, Cloudflare Pages/Workers/WAF.

---

## Execution Principles

- Work in small commits. Each task below should be independently buildable and testable.
- Do not redesign the UI while extracting logic.
- Do not change endpoint paths or response shapes unless a task explicitly says to do so.
- Before each refactor task, write or strengthen tests around the current behavior.
- At minimum, run `pytest`, `pytest backend/tests`, and `npm run build` before handing off any branch.

## File Map

Primary files to modify:

- `pytest.ini`: include all backend tests by default.
- `backend/tests/test_divorced_calculator.py`: remove pytest return-value warnings.
- `backend/tests/test_widow_calculator.py`: remove pytest return-value warnings.
- `frontend/src/utils/benefitFormulas.js`: keep shared frontend benefit formulas.
- `frontend/src/utils/benefitFormulas.test.js`: add frontend unit tests for formulas.
- `frontend/src/calculators/showMeTheMoney/projections.js`: extracted pure projection logic.
- `frontend/src/calculators/showMeTheMoney/projections.test.js`: projection golden tests.
- `frontend/src/calculators/showMeTheMoney/ssCuts.js`: extracted SS reserve cut scenario logic.
- `frontend/src/calculators/showMeTheMoney/ssCuts.test.js`: SS cuts golden tests.
- `frontend/src/components/ShowMeTheMoneyCalculator.jsx`: consume extracted helpers.
- `frontend/src/screens/LoginScreen.jsx`: extracted login screen from `App.js`.
- `frontend/src/screens/OnboardingScreen.jsx`: extracted onboarding screen from `App.js`.
- `frontend/src/components/CalculatorApp.jsx`: extracted calculator shell/navigation from `App.js`.
- `frontend/src/App.js`: reduced to providers/routes/app composition.
- `frontend/src/services/apiClient.js`: shared frontend API fetch helper.
- `frontend/src/services/profileAdapter.js`: snake_case/camelCase profile normalization.
- `frontend/src/services/profileAdapter.test.js`: adapter tests.
- `backend/api/calculation_models.py`: Pydantic models currently in `integrated_ss_api.py`.
- `backend/api/calculation_routes.py`: calculation/upload routes currently in `integrated_ss_api.py`.
- `backend/core/integrated_ss_api.py`: reduced to FastAPI app setup and router registration.
- `backend/tests/test_api_hardening.py`: request validation, upload limits, CORS behavior.
- `backend/requirements.txt`: add runtime server package if moving from raw Uvicorn to Gunicorn workers.
- `backend/Dockerfile`: configure a production ASGI worker command.
- `frontend/public/_headers`: Cloudflare Pages iframe/security headers.
- `docs/DEPLOYMENT_HARDENING.md`: deployment settings and operational checklist.

---

### Task 1: Make The Current Test Suite Honest

**Files:**
- Modify: `pytest.ini`
- Modify: `backend/tests/test_divorced_calculator.py`
- Modify: `backend/tests/test_widow_calculator.py`

- [ ] **Step 1: Update root pytest discovery**

Replace `pytest.ini` with:

```ini
# pytest.ini
[pytest]
minversion = 6.0
addopts = -ra -q
testpaths =
    tests
    backend/tests
python_files = test_*.py
```

- [ ] **Step 2: Remove pytest return-value warnings**

In `backend/tests/test_divorced_calculator.py` and `backend/tests/test_widow_calculator.py`, find test functions that return helper objects or dictionaries. Convert those helpers into local variables plus assertions. For example, change this pattern:

```python
def test_basic_ex_spouse_benefit():
    calculator = DivorcedSSCalculator(...)
    ...
    return calculator
```

to:

```python
def test_basic_ex_spouse_benefit():
    calculator = DivorcedSSCalculator(...)
    ...
    assert calculator is not None
```

- [ ] **Step 3: Verify all backend tests now run from root**

Run:

```bash
pytest
```

Expected:

```text
38 passed
```

No `PytestReturnNotNoneWarning` warnings should remain.

- [ ] **Step 4: Commit**

```bash
git add pytest.ini backend/tests/test_divorced_calculator.py backend/tests/test_widow_calculator.py
git commit -m "test: include backend tests in default pytest run"
```

---

### Task 2: Add Frontend Formula Guardrails

**Files:**
- Create: `frontend/src/utils/benefitFormulas.test.js`
- Modify: `frontend/src/utils/benefitFormulas.js`

- [ ] **Step 1: Add formula tests**

Create `frontend/src/utils/benefitFormulas.test.js`:

```javascript
import {
  getFra,
  monthsFromFra,
  earlyReductionFactor,
  delayedRetirementCreditFactor,
  monthlyBenefitAtClaim,
  benefitAfterClaim
} from './benefitFormulas';

describe('benefitFormulas', () => {
  test('returns correct full retirement age by birth year', () => {
    expect(getFra(1937)).toEqual({ years: 65, months: 0 });
    expect(getFra(1955)).toEqual({ years: 66, months: 2 });
    expect(getFra(1959)).toEqual({ years: 66, months: 10 });
    expect(getFra(1960)).toEqual({ years: 67, months: 0 });
    expect(getFra(1970)).toEqual({ years: 67, months: 0 });
  });

  test('calculates months from full retirement age', () => {
    expect(monthsFromFra(62, 67)).toBe(-60);
    expect(monthsFromFra(67, 67)).toBe(0);
    expect(monthsFromFra(70, 67)).toBe(36);
  });

  test('applies standard early filing reduction', () => {
    expect(earlyReductionFactor(-36)).toBeCloseTo(0.8, 6);
    expect(earlyReductionFactor(-60)).toBeCloseTo(0.7, 6);
    expect(earlyReductionFactor(0)).toBeCloseTo(1, 6);
  });

  test('applies delayed retirement credits', () => {
    expect(delayedRetirementCreditFactor(0)).toBeCloseTo(1, 6);
    expect(delayedRetirementCreditFactor(36)).toBeCloseTo(1.24, 6);
  });

  test('calculates monthly benefit at claim using reduction and credits', () => {
    const early = monthlyBenefitAtClaim({
      piaFRA: 3000,
      claimAgeYears: 62,
      currentAgeYears: 62,
      rate: 0,
      fraYears: 67
    });

    const delayed = monthlyBenefitAtClaim({
      piaFRA: 3000,
      claimAgeYears: 70,
      currentAgeYears: 70,
      rate: 0,
      fraYears: 67
    });

    expect(early).toBeCloseTo(2100, 2);
    expect(delayed).toBeCloseTo(3720, 2);
  });

  test('applies post-claim COLA', () => {
    expect(benefitAfterClaim(3000, 0, 0.025)).toBeCloseTo(3000, 2);
    expect(benefitAfterClaim(3000, 2, 0.025)).toBeCloseTo(3151.875, 3);
  });
});
```

- [ ] **Step 2: Remove anonymous default export warning**

At the bottom of `frontend/src/utils/benefitFormulas.js`, replace the anonymous default export with:

```javascript
const benefitFormulas = {
  getFra,
  getFraYears,
  preclaimColaFactor,
  monthsFromFra,
  earlyReductionFactor,
  delayedRetirementCreditFactor,
  earlyReductionFromAges,
  drcIncreaseFromAges,
  monthlyBenefitAtClaim,
  benefitAfterClaim,
  adjustPIAForPreClaim
};

export default benefitFormulas;
```

- [ ] **Step 3: Verify frontend tests**

Run:

```bash
cd frontend && npm test -- --watchAll=false benefitFormulas
```

Expected:

```text
PASS src/utils/benefitFormulas.test.js
```

- [ ] **Step 4: Verify build**

Run:

```bash
cd frontend && npm run build
```

Expected: build succeeds. Existing unrelated warnings may remain.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/benefitFormulas.js frontend/src/utils/benefitFormulas.test.js
git commit -m "test: add frontend benefit formula guardrails"
```

---

### Task 3: Extract Show Me The Money Projection Logic

**Files:**
- Create: `frontend/src/calculators/showMeTheMoney/projections.js`
- Create: `frontend/src/calculators/showMeTheMoney/projections.test.js`
- Modify: `frontend/src/components/ShowMeTheMoneyCalculator.jsx`

- [ ] **Step 1: Create projection module**

Create `frontend/src/calculators/showMeTheMoney/projections.js`:

```javascript
import {
  getFra,
  monthlyBenefitAtClaim,
  benefitAfterClaim
} from '../../utils/benefitFormulas';

export const ageInMonths = (birthDate, targetDate) => {
  let years = targetDate.getFullYear() - birthDate.getFullYear();
  let months = targetDate.getMonth() - birthDate.getMonth();
  let totalMonths = years * 12 + months;

  if (targetDate.getDate() < birthDate.getDate()) {
    totalMonths -= 1;
  }

  return totalMonths;
};

export const calculateProjection = ({
  pia,
  dob,
  filingYear,
  filingMonth = 0,
  inflationRate,
  asOfDate = new Date()
}) => {
  const birthDate = new Date(dob);
  const numericPia = Number(pia) || 0;
  const birthYear = birthDate.getFullYear();
  const birthMonthIndex = birthDate.getMonth();
  const claimAgeYears = Number(filingYear) + (Number(filingMonth) || 0) / 12;
  const currentAgeMonths = ageInMonths(birthDate, asOfDate);
  const currentAgeYears = currentAgeMonths / 12;
  const fra = getFra(birthYear);
  const fraYears = fra.years + (fra.months || 0) / 12;

  const baseMonthlyAtClaim = monthlyBenefitAtClaim({
    piaFRA: numericPia,
    claimAgeYears,
    currentAgeYears,
    rate: inflationRate,
    fraYears
  });

  const monthly = {};
  const cumulative = {};
  let runningTotal = 0;

  const startYear = birthYear + 62;
  const endYear = birthYear + 95;
  const claimingCalendarYear = birthYear + Number(filingYear);

  for (let year = startYear; year <= endYear; year += 1) {
    let monthlyBenefit = 0;
    let monthsInYear = 12;

    if (year >= claimingCalendarYear) {
      const yearsAfterClaim = year - claimingCalendarYear;
      monthlyBenefit = benefitAfterClaim(baseMonthlyAtClaim, yearsAfterClaim, inflationRate);

      if (year === claimingCalendarYear) {
        monthsInYear = 12 - birthMonthIndex;
      }
    }

    const roundedMonthly = Number(monthlyBenefit.toFixed(2));
    monthly[year] = roundedMonthly;
    runningTotal = Number((runningTotal + roundedMonthly * monthsInYear).toFixed(2));
    cumulative[year] = runningTotal;
  }

  return { monthly, cumulative, birthYear };
};

export const combineProjections = ({
  primaryProjection,
  spouseProjection,
  isMarried,
  prematureDeath = false,
  deathYear
}) => {
  if (!isMarried || !spouseProjection) {
    return primaryProjection;
  }

  const allYears = Array.from(new Set([
    ...Object.keys(primaryProjection.monthly || {}),
    ...Object.keys(spouseProjection.monthly || {})
  ])).map(Number).sort((a, b) => a - b);

  const monthly = {};
  const cumulative = {};
  let runningTotal = 0;

  allYears.forEach((year) => {
    const primaryMonthly = primaryProjection.monthly?.[year] || 0;
    const spouseMonthly = spouseProjection.monthly?.[year] || 0;
    const combinedMonthly = prematureDeath && year >= deathYear
      ? Math.max(primaryMonthly, spouseMonthly)
      : primaryMonthly + spouseMonthly;

    monthly[year] = combinedMonthly;
    runningTotal = Number((runningTotal + combinedMonthly * 12).toFixed(2));
    cumulative[year] = runningTotal;
  });

  return { monthly, cumulative };
};
```

- [ ] **Step 2: Add projection tests**

Create `frontend/src/calculators/showMeTheMoney/projections.test.js`:

```javascript
import { ageInMonths, calculateProjection, combineProjections } from './projections';

describe('show me the money projections', () => {
  test('calculates exact age in months', () => {
    expect(ageInMonths(new Date('1965-02-03'), new Date('2027-02-02'))).toBe(743);
    expect(ageInMonths(new Date('1965-02-03'), new Date('2027-02-03'))).toBe(744);
  });

  test('calculates a filing-at-62 projection without inflation', () => {
    const projection = calculateProjection({
      pia: 3000,
      dob: '1965-02-03',
      filingYear: 62,
      filingMonth: 0,
      inflationRate: 0,
      asOfDate: new Date('2027-02-03')
    });

    expect(projection.birthYear).toBe(1965);
    expect(projection.monthly[2027]).toBeCloseTo(2100, 2);
    expect(projection.cumulative[2027]).toBeCloseTo(23100, 2);
  });

  test('combines spouse projections and preserves survivor-style max after death year', () => {
    const primaryProjection = {
      monthly: { 2030: 2000, 2031: 2100 },
      cumulative: { 2030: 24000, 2031: 49200 }
    };
    const spouseProjection = {
      monthly: { 2030: 1000, 2031: 1100 },
      cumulative: { 2030: 12000, 2031: 25200 }
    };

    const combined = combineProjections({
      primaryProjection,
      spouseProjection,
      isMarried: true,
      prematureDeath: true,
      deathYear: 2031
    });

    expect(combined.monthly[2030]).toBe(3000);
    expect(combined.monthly[2031]).toBe(2100);
    expect(combined.cumulative[2031]).toBe(61200);
  });
});
```

- [ ] **Step 3: Wire component to extracted helpers**

In `frontend/src/components/ShowMeTheMoneyCalculator.jsx`:

Remove local `ageInMonths`.

Add:

```javascript
import {
  ageInMonths,
  calculateProjection,
  combineProjections
} from '../calculators/showMeTheMoney/projections';
```

Replace the local `calculateProjections` function with calls to `calculateProjection`, preserving the existing argument names:

```javascript
const primaryAge62 = calculateProjection({
  pia: spouse1Pia,
  dob: spouse1Dob,
  filingYear: 62,
  filingMonth: 0,
  inflationRate: inflation
});
```

Use the same pattern for preferred and age-70 projections.

- [ ] **Step 4: Verify**

Run:

```bash
cd frontend && npm test -- --watchAll=false projections
cd frontend && npm run build
```

Expected: projection tests pass and build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/calculators/showMeTheMoney/projections.js frontend/src/calculators/showMeTheMoney/projections.test.js frontend/src/components/ShowMeTheMoneyCalculator.jsx
git commit -m "refactor: extract show me the money projections"
```

---

### Task 4: Extract SS Reserve Cut Scenario Logic

**Files:**
- Create: `frontend/src/calculators/showMeTheMoney/ssCuts.js`
- Create: `frontend/src/calculators/showMeTheMoney/ssCuts.test.js`
- Modify: `frontend/src/components/ShowMeTheMoneyCalculator.jsx`

- [ ] **Step 1: Create SS cuts helper**

Create `frontend/src/calculators/showMeTheMoney/ssCuts.js`:

```javascript
export const applyBenefitCut = ({ projection, cutYear, cutPercentage }) => {
  const reductionFactor = Math.min(1, Math.max(0, 1 - (Number(cutPercentage) || 0) / 100));
  const cutYearValue = Number(cutYear) || cutYear;
  const yearKeys = Array.from(new Set([
    ...Object.keys(projection.monthly || {}),
    ...Object.keys(projection.cumulative || {})
  ])).map(Number).sort((a, b) => a - b);

  const monthly = {};
  const cumulative = {};
  let running = 0;

  yearKeys.forEach((year) => {
    const baseMonthly = projection.monthly?.[year] || 0;
    const adjustedMonthly = year >= cutYearValue ? baseMonthly * reductionFactor : baseMonthly;
    const roundedMonthly = Number(adjustedMonthly.toFixed(2));
    monthly[year] = roundedMonthly;
    running = Number((running + roundedMonthly * 12).toFixed(2));
    cumulative[year] = running;
  });

  return { monthly, cumulative };
};

export const calculateAxisRanges = (scenarios) => {
  let maxMonthly = 0;
  let maxCumulative = 0;

  scenarios.forEach((scenario) => {
    [...scenario.baselineMonthly, ...scenario.cutMonthly].forEach((value) => {
      maxMonthly = Math.max(maxMonthly, value);
    });

    [...scenario.baselineCumulative, ...scenario.cutCumulative].forEach((value) => {
      maxCumulative = Math.max(maxCumulative, value);
    });
  });

  return {
    monthly: {
      min: 0,
      max: Math.ceil(maxMonthly + maxMonthly * 0.1)
    },
    cumulative: {
      min: 0,
      max: Math.ceil(maxCumulative + maxCumulative * 0.1)
    }
  };
};
```

- [ ] **Step 2: Add tests**

Create `frontend/src/calculators/showMeTheMoney/ssCuts.test.js`:

```javascript
import { applyBenefitCut, calculateAxisRanges } from './ssCuts';

describe('ssCuts', () => {
  test('applies cut starting in configured year', () => {
    const projection = {
      monthly: { 2033: 1000, 2034: 1000, 2035: 1000 },
      cumulative: { 2033: 12000, 2034: 24000, 2035: 36000 }
    };

    const result = applyBenefitCut({
      projection,
      cutYear: 2034,
      cutPercentage: 21
    });

    expect(result.monthly[2033]).toBe(1000);
    expect(result.monthly[2034]).toBe(790);
    expect(result.monthly[2035]).toBe(790);
    expect(result.cumulative[2035]).toBe(30960);
  });

  test('calculates stable chart axis ranges from baseline and cut values', () => {
    const ranges = calculateAxisRanges([
      {
        baselineMonthly: [1000, 2000],
        cutMonthly: [790, 1580],
        baselineCumulative: [12000, 36000],
        cutCumulative: [9480, 28440]
      }
    ]);

    expect(ranges.monthly).toEqual({ min: 0, max: 2200 });
    expect(ranges.cumulative).toEqual({ min: 0, max: 39600 });
  });
});
```

- [ ] **Step 3: Replace duplicated SS cuts logic**

In `frontend/src/components/ShowMeTheMoneyCalculator.jsx`, import:

```javascript
import {
  applyBenefitCut,
  calculateAxisRanges
} from '../calculators/showMeTheMoney/ssCuts';
```

Replace the duplicated inline `applyCuts` functions in the SS cuts effect and `handleProjectCuts` with `applyBenefitCut`.

Replace local axis range calculation with `calculateAxisRanges(scenarios)`.

- [ ] **Step 4: Verify**

Run:

```bash
cd frontend && npm test -- --watchAll=false ssCuts
cd frontend && npm run build
```

Expected: tests pass and build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/calculators/showMeTheMoney/ssCuts.js frontend/src/calculators/showMeTheMoney/ssCuts.test.js frontend/src/components/ShowMeTheMoneyCalculator.jsx
git commit -m "refactor: extract social security cut projections"
```

---

### Task 5: Split The App Shell

**Files:**
- Create: `frontend/src/screens/LoginScreen.jsx`
- Create: `frontend/src/screens/OnboardingScreen.jsx`
- Create: `frontend/src/components/CalculatorApp.jsx`
- Modify: `frontend/src/App.js`

- [ ] **Step 1: Move `LoginScreen` unchanged**

Move the full `LoginScreen` function from `frontend/src/App.js` into `frontend/src/screens/LoginScreen.jsx`.

Add these imports at the top of the new file:

```javascript
import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext.jsx';
```

Export it:

```javascript
export default LoginScreen;
```

- [ ] **Step 2: Move `OnboardingScreen` unchanged**

Move the full `OnboardingScreen` function from `frontend/src/App.js` into `frontend/src/screens/OnboardingScreen.jsx`.

Add these imports at the top of the new file:

```javascript
import React, { useEffect, useState } from 'react';
import { useUser } from '../contexts/UserContext.jsx';
```

Export it:

```javascript
export default OnboardingScreen;
```

- [ ] **Step 3: Move `CalculatorApp` unchanged**

Move the full `CalculatorApp` function from `frontend/src/App.js` into `frontend/src/components/CalculatorApp.jsx`.

Preserve its existing component imports.

Export it:

```javascript
export default CalculatorApp;
```

- [ ] **Step 4: Replace moved code in `App.js` with imports**

Add:

```javascript
import LoginScreen from './screens/LoginScreen.jsx';
import OnboardingScreen from './screens/OnboardingScreen.jsx';
import CalculatorApp from './components/CalculatorApp.jsx';
```

Remove moved function definitions from `App.js`.

- [ ] **Step 5: Verify**

Run:

```bash
cd frontend && npm run build
```

Expected: build succeeds. `App.js` warnings for moved unused imports should be gone.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/App.js frontend/src/screens/LoginScreen.jsx frontend/src/screens/OnboardingScreen.jsx frontend/src/components/CalculatorApp.jsx
git commit -m "refactor: split app shell screens"
```

---

### Task 6: Centralize Frontend API And Data Normalization

**Files:**
- Create: `frontend/src/services/apiClient.js`
- Create: `frontend/src/services/profileAdapter.js`
- Create: `frontend/src/services/profileAdapter.test.js`
- Modify: `frontend/src/contexts/UserContext.jsx`

- [ ] **Step 1: Add API client**

Create `frontend/src/services/apiClient.js`:

```javascript
import { API_BASE_URL } from '../config/api';

export async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : await response.text();

  if (!response.ok) {
    const detail = data?.detail ?? data?.error ?? data?.message ?? data;
    const message = typeof detail === 'string' ? detail : JSON.stringify(detail);
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return data;
}

export function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
```

- [ ] **Step 2: Add profile adapter**

Create `frontend/src/services/profileAdapter.js`:

```javascript
export function normalizeProfile(profile = {}) {
  return {
    ...profile,
    firstName: profile.firstName ?? profile.first_name,
    lastName: profile.lastName ?? profile.last_name,
    dateOfBirth: profile.dateOfBirth ?? profile.date_of_birth,
    relationshipStatus: profile.relationshipStatus ?? profile.relationship_status,
    piaAtFra: profile.piaAtFra ?? profile.pia_at_fra,
    preferredClaimingAgeYears: profile.preferredClaimingAgeYears ?? profile.preferred_claiming_age_years,
    preferredClaimingAgeMonths: profile.preferredClaimingAgeMonths ?? profile.preferred_claiming_age_months
  };
}

export function normalizePartner(partner = {}) {
  return {
    ...partner,
    firstName: partner.firstName ?? partner.first_name,
    lastName: partner.lastName ?? partner.last_name,
    dateOfBirth: partner.dateOfBirth ?? partner.date_of_birth,
    piaAtFra: partner.piaAtFra ?? partner.pia_at_fra ?? partner.pia
  };
}
```

- [ ] **Step 3: Add adapter tests**

Create `frontend/src/services/profileAdapter.test.js`:

```javascript
import { normalizePartner, normalizeProfile } from './profileAdapter';

describe('profileAdapter', () => {
  test('normalizes profile names and claiming fields', () => {
    expect(normalizeProfile({
      first_name: 'Ada',
      last_name: 'Lovelace',
      date_of_birth: '1960-01-01',
      relationship_status: 'married',
      pia_at_fra: 3000,
      preferred_claiming_age_years: 67,
      preferred_claiming_age_months: 6
    })).toMatchObject({
      firstName: 'Ada',
      lastName: 'Lovelace',
      dateOfBirth: '1960-01-01',
      relationshipStatus: 'married',
      piaAtFra: 3000,
      preferredClaimingAgeYears: 67,
      preferredClaimingAgeMonths: 6
    });
  });

  test('normalizes partner PIA fallback', () => {
    expect(normalizePartner({ first_name: 'Grace', pia: 1800 })).toMatchObject({
      firstName: 'Grace',
      piaAtFra: 1800
    });
  });
});
```

- [ ] **Step 4: Use adapter in UserContext**

In `frontend/src/contexts/UserContext.jsx`, import:

```javascript
import { apiFetch, authHeaders } from '../services/apiClient';
import { normalizePartner, normalizeProfile } from '../services/profileAdapter';
```

Replace the inline normalization in `loadUserDataWithToken` with:

```javascript
const profileData = await apiFetch('/api/profiles/me/full', {
  headers: authHeaders(token)
});

setProfile(normalizeProfile(profileData.profile || {}));
setPartners((profileData.partners || []).map(normalizePartner));
setUserChildren(profileData.children || []);
setPreferences(profileData.preferences);
```

- [ ] **Step 5: Verify**

Run:

```bash
cd frontend && npm test -- --watchAll=false profileAdapter
cd frontend && npm run build
```

Expected: tests pass and build succeeds.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/services/apiClient.js frontend/src/services/profileAdapter.js frontend/src/services/profileAdapter.test.js frontend/src/contexts/UserContext.jsx
git commit -m "refactor: centralize frontend api and profile normalization"
```

---

### Task 7: Split Backend Calculation Models And Routes

**Files:**
- Create: `backend/api/calculation_models.py`
- Create: `backend/api/calculation_routes.py`
- Modify: `backend/core/integrated_ss_api.py`
- Modify: `backend/main.py`

- [ ] **Step 1: Move Pydantic calculation models**

Create `backend/api/calculation_models.py` and move these classes from `backend/core/integrated_ss_api.py` unchanged:

```python
PersonInput
XMLAnalysisRequest
XMLAnalysisResponse
EnhancedCalculationRequest
MonthlyOptimizationRequest
MonthlyOptimizationResponse
BenefitBreakdown
ScenarioComparison
CalculationResponse
BCRRequest
DivorcedCalculationRequest
DivorcedCalculationResponse
WidowCalculationRequest
WidowCalculationResponse
EarningsYearInput
ManualPIACalculationRequest
PIACalculationResult
WhatIfComparisonRequest
WhatIfComparisonResult
SSDICalculationRequest
SSDICalculationResponse
```

Keep imports needed by those classes in the new file:

```python
from datetime import date
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
```

- [ ] **Step 2: Move calculation routes**

Create `backend/api/calculation_routes.py`.

Move calculation/upload endpoints from `backend/core/integrated_ss_api.py` into an `APIRouter`:

```python
from fastapi import APIRouter

router = APIRouter(tags=["calculations"])
```

Replace each decorator like:

```python
@app.post("/calculate-divorced", response_model=DivorcedCalculationResponse)
```

with:

```python
@router.post("/calculate-divorced", response_model=DivorcedCalculationResponse)
```

Move helper functions used only by those routes into this file too.

- [ ] **Step 3: Register new router**

In `backend/core/integrated_ss_api.py`, import:

```python
from api.calculation_routes import router as calculation_router
```

Register after the existing API routers:

```python
app.include_router(calculation_router)
```

Keep `/`, `/healthz`, CORS, logging, and existing app setup in `integrated_ss_api.py`.

- [ ] **Step 4: Verify endpoint compatibility**

Run:

```bash
pytest
```

Expected: all tests pass.

Run a build/import smoke test:

```bash
cd backend && python -c "from main import app; print(app.title)"
```

Expected:

```text
The RISE and SHINE Method™ API
```

- [ ] **Step 5: Commit**

```bash
git add backend/api/calculation_models.py backend/api/calculation_routes.py backend/core/integrated_ss_api.py backend/main.py
git commit -m "refactor: split backend calculation models and routes"
```

---

### Task 8: Add API Hardening For CORS And Uploads

**Files:**
- Modify: `backend/core/integrated_ss_api.py`
- Modify: `backend/api/calculation_routes.py`
- Create: `backend/tests/test_api_hardening.py`

- [ ] **Step 1: Add upload constants**

In `backend/api/calculation_routes.py`, add:

```python
MAX_XML_UPLOAD_BYTES = 2 * 1024 * 1024
ALLOWED_XML_CONTENT_TYPES = {
    "application/xml",
    "text/xml",
    "application/octet-stream",
}
```

- [ ] **Step 2: Validate XML upload type and size**

At the top of the `/upload-ssa-xml` route, before parsing:

```python
if file.content_type not in ALLOWED_XML_CONTENT_TYPES:
    raise HTTPException(status_code=415, detail="SSA upload must be an XML file")

content = await file.read()
if len(content) > MAX_XML_UPLOAD_BYTES:
    raise HTTPException(status_code=413, detail="SSA XML upload exceeds 2 MB limit")
```

Remove the later duplicate `content = await file.read()` if present.

- [ ] **Step 3: Add CORS production guard**

In `backend/core/integrated_ss_api.py`, replace the current `_allowed_origins` block with:

```python
_origins_env = os.getenv("ALLOWED_ORIGINS")
_allowed_origins = (
    [origin.strip() for origin in _origins_env.split(",") if origin.strip()]
    if _origins_env else ["*"]
)

if os.getenv("ENVIRONMENT") == "production" and _allowed_origins == ["*"]:
    raise RuntimeError("ALLOWED_ORIGINS must be set in production")
```

- [ ] **Step 4: Add hardening tests**

Create `backend/tests/test_api_hardening.py`:

```python
from fastapi.testclient import TestClient

from backend.core.integrated_ss_api import app


client = TestClient(app)


def test_healthz_reports_status():
    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_xml_upload_rejects_non_xml_file():
    response = client.post(
        "/upload-ssa-xml",
        files={"file": ("statement.txt", b"not xml", "text/plain")},
        data={"birth_date": "1965-01-01"}
    )

    assert response.status_code == 415
    assert response.json()["detail"] == "SSA upload must be an XML file"


def test_xml_upload_rejects_large_file():
    response = client.post(
        "/upload-ssa-xml",
        files={"file": ("statement.xml", b"x" * (2 * 1024 * 1024 + 1), "application/xml")},
        data={"birth_date": "1965-01-01"}
    )

    assert response.status_code == 413
    assert response.json()["detail"] == "SSA XML upload exceeds 2 MB limit"
```

- [ ] **Step 5: Verify**

Run:

```bash
pytest backend/tests/test_api_hardening.py
pytest
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/core/integrated_ss_api.py backend/api/calculation_routes.py backend/tests/test_api_hardening.py
git commit -m "feat: harden api cors and xml upload handling"
```

---

### Task 9: Configure Railway Runtime For Modest Concurrency

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/Dockerfile`
- Modify: `docs/DEPLOYMENT_HARDENING.md`

- [ ] **Step 1: Add Gunicorn**

Add to `backend/requirements.txt`:

```text
gunicorn>=21.2.0
```

- [ ] **Step 2: Replace raw Uvicorn command**

In `backend/Dockerfile`, replace:

```dockerfile
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
```

with:

```dockerfile
CMD ["sh", "-c", "gunicorn -w ${WEB_CONCURRENCY:-2} -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:${PORT:-8000} --timeout ${WORKER_TIMEOUT:-60}"]
```

- [ ] **Step 3: Document Railway settings**

Create or update `docs/DEPLOYMENT_HARDENING.md` with:

```markdown
# Deployment Hardening

## Railway Backend

Environment variables:

- `ENVIRONMENT=production`
- `WEB_CONCURRENCY=2`
- `WORKER_TIMEOUT=60`
- `ALLOWED_ORIGINS=https://YOUR-CLOUDFLARE-FRONTEND-DOMAIN`
- `SUPABASE_URL=<set in Railway>`
- `SUPABASE_KEY=<set in Railway>`

Recommended launch settings:

- Start with one Railway replica and two Gunicorn/Uvicorn workers.
- Add a second replica only if Railway CPU, memory, or response latency shows sustained pressure.
- Use `/healthz` as the health check endpoint.
```

Before execution, replace `https://YOUR-CLOUDFLARE-FRONTEND-DOMAIN` with the actual Cloudflare Pages/custom frontend domain.

- [ ] **Step 4: Verify Docker build locally**

Run:

```bash
docker build -f backend/Dockerfile backend
```

Expected: image builds successfully.

- [ ] **Step 5: Commit**

```bash
git add backend/requirements.txt backend/Dockerfile docs/DEPLOYMENT_HARDENING.md
git commit -m "chore: configure backend runtime workers"
```

---

### Task 10: Add Cloudflare Pages Headers For Iframe Embedding

**Files:**
- Create: `frontend/public/_headers`
- Modify: `docs/DEPLOYMENT_HARDENING.md`

- [ ] **Step 1: Add Cloudflare headers file**

Create `frontend/public/_headers`:

```text
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Do not add `X-Frame-Options`; it would interfere with embedding.

- [ ] **Step 2: Add CSP only after embed domains are known**

When the exact parent domains are known, add this line to `frontend/public/_headers`:

```text
  Content-Security-Policy: frame-ancestors 'self' https://app.gohighlevel.com https://*.circle.so;
```

If the actual HighLevel or Circle parent host differs, use the exact parent host observed in browser devtools.

- [ ] **Step 3: Document iframe test matrix**

Append to `docs/DEPLOYMENT_HARDENING.md`:

```markdown
## Iframe Embedding

Do not send `X-Frame-Options`.

After the exact embed parent domains are known, set `Content-Security-Policy: frame-ancestors` in `frontend/public/_headers`.

Manual browser checks:

- Chrome normal window: embedded app loads, auth works, calculator saves state.
- Chrome incognito: embedded app loads, expected auth behavior is documented.
- Safari: embedded app loads, auth and local storage behavior are checked.
- Mobile Safari: app is usable inside the iframe dimensions used by the host.
```

- [ ] **Step 4: Verify frontend build includes headers file**

Run:

```bash
cd frontend && npm run build && test -f build/_headers
```

Expected: command exits successfully.

- [ ] **Step 5: Commit**

```bash
git add frontend/public/_headers docs/DEPLOYMENT_HARDENING.md
git commit -m "chore: add cloudflare iframe headers guidance"
```

---

### Task 11: Add Production Rate-Limit Rules

**Files:**
- Modify: `docs/DEPLOYMENT_HARDENING.md`

- [ ] **Step 1: Document Cloudflare WAF/rate-limit rules**

Append:

```markdown
## Cloudflare WAF And Rate Limits

Initial rules:

- Auth endpoints: rate limit `/api/auth/login`, `/api/auth/signup`, `/api/auth/reset-password` by IP.
- XML upload: rate limit `/upload-ssa-xml` by IP and authenticated user when available.
- Calculation endpoints: rate limit `/calculate-*`, `/calculate`, `/monthly-optimization`, and `/compare-earnings-scenarios` by IP.
- Block obvious non-browser bot traffic except verified monitoring services.

Suggested starting thresholds:

- Auth: 10 requests per minute per IP.
- XML upload: 5 requests per minute per IP.
- Calculations: 120 requests per minute per IP.

Tune thresholds after real traffic begins.
```

- [ ] **Step 2: Commit**

```bash
git add docs/DEPLOYMENT_HARDENING.md
git commit -m "docs: document production rate limits"
```

---

### Task 12: Add Launch Monitoring Checklist

**Files:**
- Modify: `docs/DEPLOYMENT_HARDENING.md`

- [ ] **Step 1: Add monitoring section**

Append:

```markdown
## Launch Monitoring

Watch during beta:

- Railway CPU and memory.
- Railway request latency and 5xx responses.
- Supabase API errors and auth errors.
- Browser console errors from embedded contexts.
- Cloudflare WAF/rate-limit events.
- XML upload failures by status code.

Operational thresholds:

- If Railway CPU is sustained above 70%, increase `WEB_CONCURRENCY` only if memory allows, otherwise add a replica.
- If memory is sustained above 75%, increase Railway memory or reduce worker count.
- If Supabase latency/errors rise, reduce frontend preference-write frequency before increasing backend capacity.
- If iframe auth fails only in Safari or private browsing, document the limitation and consider a non-embedded login fallback.
```

- [ ] **Step 2: Commit**

```bash
git add docs/DEPLOYMENT_HARDENING.md
git commit -m "docs: add launch monitoring checklist"
```

---

## Final Verification

Run all verification commands:

```bash
pytest
cd frontend && npm test -- --watchAll=false
cd frontend && npm run build
docker build -f backend/Dockerfile backend
```

Expected:

- Backend tests pass.
- Frontend tests pass.
- Frontend build succeeds.
- Backend Docker image builds.

## Recommended Execution Order

1. Task 1: make tests honest.
2. Task 2: add frontend formula guardrails.
3. Task 3: extract projection logic.
4. Task 4: extract SS cuts logic.
5. Task 5: split app shell.
6. Task 6: centralize API/data normalization.
7. Task 7: split backend route/model boundaries.
8. Task 8: add API hardening.
9. Task 9: configure Railway runtime.
10. Task 10: add Cloudflare iframe headers.
11. Task 11: add rate-limit rules.
12. Task 12: add monitoring checklist.

## Self-Review

- Spec coverage: covers refactoring guardrails, major frontend hotspots, backend route/model boundaries, Railway concurrency, Cloudflare/CORS/iframe hardening, rate limiting, upload limits, and monitoring.
- Placeholder scan: the only value that must be supplied during execution is the actual production frontend domain for `ALLOWED_ORIGINS`; execution should pause at that deployment step until the domain is known.
- Type consistency: frontend helpers use existing formula function names; backend models/routes preserve existing endpoint names and response models.
