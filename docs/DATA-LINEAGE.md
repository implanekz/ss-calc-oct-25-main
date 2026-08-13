# Data lineage and sources of truth

Which representation of a number is authoritative, where each transformation happens, and where two representations currently compete. Keep this current — the failures it prevents are the ones where the app states something confidently and wrongly.

Status as of 2026-08-13, branch `codex-refactor-step-1`.

---

## 1. Earnings — six representations

A single year's earnings exists in six forms. Only one is the source of truth; the rest are derived and must never be written back up the chain.

| # | Representation | Where | Units | Authoritative for |
|---|---|---|---|---|
| 1 | Gross wages | never in the app | nominal | nothing |
| 2 | **Taxed SS earnings** | SSA XML `<Earnings>` | nominal, **already capped by SSA** | **SOURCE OF TRUTH** |
| 3 | Persisted rows | `earnings_records.rows` | nominal | durable copy of #2, plus user edits |
| 4 | Editable spreadsheet | `create_editable_spreadsheet()` | nominal | display + what-if editing |
| 5 | Projected rows | same, `is_projected: true` | nominal, assumed | forecasting only — **never a "banked" year** |
| 6 | Indexed earnings | `calculate_indexed_earnings()` | **AWI-year dollars** | AIME input only |

**Rules:**
- #2 arrives pre-capped. SSA's record reports *taxed* earnings, which never exceed that year's maximum. Re-capping real XML is redundant.
- #5 must be excluded from any count of years worked. This has already caused one shipped bug (`PIACalculator.jsx:467`, `:554` counted projected rows as earnings years, overstating a 21-year record as 25).
- #6 is in different units from #2. **Never compare an indexed value against a nominal cap.**

### 🔴 Known defect — unit mismatch

`backend/core/ssa_xml_processor.py:248-256` caps **indexed** earnings against that year's **nominal** taxable maximum. A 1991 value indexed to 2024 dollars is compared against the 1991 ceiling. Observed in `backend/test_profile_pia2250_5zeros.xml`: 1991 nominal $24,024 indexes to $76,927, is capped to $53,400 — a person who earned less than half the cap is flagged `is_capped: True`.

Effect: systematically **understates PIA**, worst for the longest careers (largest indexing factors). Correct order is cap-then-index. Must be fixed before Plan A makes earnings authoritative for the chart.

---

## 2. PIA — four competing sources, and this is the dangerous one

| Source | Where set | Currently drives | Trust |
|---|---|---|---|
| **A. User-entered** | onboarding → `profiles.pia_at_fra` | **the chart** | user's own belief |
| B. SSA's estimate | XML `<EstimatedPIA>` → `ssaPIA` | PIA Calculator comparison only | SSA's, under SSA's assumptions |
| C. Our computed | `calculate_aime_and_pia()` → `calculatedResult.pia` | PIA Calculator display only | ours, from #2 above |
| D. Statement PDF | not ingested | nothing | SSA's, best cross-check |

**Today: A is the source of truth for everything the user sees on the chart.** C exists but is never written back — `PIACalculator` has no `updateProfile` call, so a computed PIA stays inside that screen. The chart reads A via the profile sync at `ShowMeTheMoneyCalculator.jsx:1883`.

This is why the banner says "Earnings Record On File" and explicitly states chart amounts still come from the entered PIA. **Any copy claiming the chart reflects the earnings record is false until Plan A changes this.**

**Plan A must decide explicitly:** does C replace A, or does the user adopt C into A with a visible confirmation? Given the constraint that PIA-only users stay first-class, adoption is likely right — A remains valid and complete on its own; C becomes an offered upgrade. Whichever is chosen, exactly one must be authoritative at a time, and the UI must say which.

Use **D as a validation oracle, not a data source** — capture 2-3 typed numbers from the statement and compare against C. Do not build a PDF parser (fragile, and it would put SSN-bearing documents in storage; `earnings_records` deliberately holds neither name nor SSN).

---

## 3. Birth year — four sources, silently racing

| Source | Where |
|---|---|
| **Profile DOB** | `profiles.date_of_birth` → `spouse1Dob` — **SOURCE OF TRUTH** |
| XML `<BirthDate>` | overwrites local `birthYear` in `PIACalculator` on upload |
| Inferred | `earliest earnings year − 18` when XML has no birth date |
| `resolvedBirthYear` | local, `PIACalculator.jsx:406` |

`resolvedBirthYear` exists because `setBirthYear()` is async and the closure value is stale within the same upload handler — persisting the stale one would have written a wrong birth year and corrupted every downstream PIA.

**Risk:** the inferred value is a guess that can silently disagree with the profile DOB, and eligibility year (`birth_year + 62`) selects the bend points. A wrong birth year moves every number. Plan A should reconcile these and surface a conflict rather than let the last writer win.

---

## 4. Derived counts — duplicated logic

"Zero years in top 35" is computed two different ways:
- `PIACalculator.jsx` table: algebraically, `35 − nonZeroYears`
- Upload toast: a real sort of the top 35 and a count

They agree today. They can diverge. Pick one and share it.

Note `hasThirtyFiveNonZeroYears()` (`scenario.js:137`) counts non-projected rows across the **whole record**, not the top 35 by indexed value. It is sound only because it is ANDed with `PIA(62) === PIA(70)`. Do not reuse it standalone.

---

## 5. SSA constants — one duplication remains

| Table | Location | Duplicated? |
|---|---|---|
| PIA bend points | `ssa_xml_processor.py` | no |
| Family-max bend points | `ssa_xml_processor.py` | no (unused so far) |
| AWI series | `ssa_xml_processor.py` | no |
| **Taxable maximum** | `ssa_xml_processor.py` **and** `frontend/src/utils/taxableMaximum.js` | **YES** |
| FRA lookup | `benefitFormulas.js` | no (statutory, fixed) |

The taxable-max duplication already drifted once: the backend was updated to 2026 ($184,500) while the frontend still capped at 2025 ($176,100), so the UI would have flagged legitimate 2026 earnings as over-cap. Fixed in `9cc7895`, but the duplication remains. Generate one from the other.

Both lookups **silently fall back to the most recent year** on a miss, which is how a stale table produces plausible wrong numbers instead of an error. Sources and the annual cadence are in the file headers.

---

## 6. Benefit — the chain after PIA

```
PIA (§2)
  → early-reduction / delayed-retirement credits   benefitFormulas.js
  → COLA to each future calendar year              calculateProjection()
  → household combination                          combineProjections()
  → survivor substitution on modeled death         combineProjections()
```

Each step is applied **exactly once**. The work-stop ladder deliberately returns **PIA, not a claimed benefit** — stopping work and filing are independent decisions, and folding DRCs into the ladder would double-count them downstream.

⚠️ The ladder's UI labels cells "PIA at FRA" but heads the block "What if you stop working at…" over ages **62 / 65 / 67 / 70** — the same four numbers that mean *claiming* ages everywhere else in the product. This has already caused a misreading. Fix the presentation.

---

## 7. Scenario assumptions

`scenario.assumptions` freezes `bendPointsYear` and `colaRate` at creation so a saved plan keeps reporting the tables it was computed under.

⚠️ `areScenariosComparable()` compares the **live** `inflation` field, not the frozen `colaRate`. They diverge as soon as the COLA slider moves (observed: `inflation 0.04` alongside `colaRate 0.025`). Nothing calls it yet. **Settle before the scenario-comparison chart**, or two scenarios computed under different assumptions will compare as if they matched.

---

## Adding a new transformation

1. Name the units. If they differ from the input, say so at the call site.
2. Never compare values across units (the §1 defect).
3. Mark derived values as derived; never write them back upstream.
4. If two sources can produce the same number, declare which wins and make the UI state it.
5. Update this file.
