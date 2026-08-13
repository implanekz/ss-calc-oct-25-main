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

**#2 is the single source of truth for the entire system.** Every benefit figure the app shows — including SSA's own PIA estimate — is a derivation of it. See §2.

**Rules:**
- #2 arrives pre-capped. SSA's record reports *taxed* earnings, which never exceed that year's maximum. Re-capping real XML is redundant.
- #5 must be excluded from any count of years worked. This has already caused one shipped bug (`PIACalculator.jsx:467`, `:554` counted projected rows as earnings years, overstating a 21-year record as 25).
- #6 is in different units from #2. **Never compare an indexed value against a nominal cap.**

### 🔴 Known defect — unit mismatch

`backend/core/ssa_xml_processor.py:248-256` caps **indexed** earnings against that year's **nominal** taxable maximum. A 1991 value indexed to 2024 dollars is compared against the 1991 ceiling. Observed in `backend/test_profile_pia2250_5zeros.xml`: 1991 nominal $24,024 indexes to $76,927, is capped to $53,400 — a person who earned less than half the cap is flagged `is_capped: True`.

Effect: systematically **understates PIA**, worst for the longest careers (largest indexing factors). Correct order is cap-then-index. Must be fixed before Plan A makes earnings authoritative for the chart.

---

## 2. PIA — never a source, always a derivation

**PIA is not a source of truth. The earnings record (§1) is.** Every PIA in this system is derived from it — the only differences are *who* ran the derivation and *under what assumption about future earnings*.

This matters because users do not experience it that way. A user does not invent their PIA; they copy SSA's figure off their statement. To them it reads as a fact they can rely on. It is actually a projection resting on an assumption they were never shown.

| Derivation | Channel | Assumption baked in | Currently drives |
|---|---|---|---|
| **A. SSA's, hand-copied** | user types it at onboarding → `profiles.pia_at_fra` | you keep earning at your current rate until FRA | **the chart** |
| **B. SSA's, parsed** | XML `<EstimatedPIA>` → `ssaPIA` | identical to A — same number, different channel | PIA Calculator comparison |
| **C. Ours** | `calculate_aime_and_pia()` → `calculatedResult.pia` | whatever the user sets in the editable spreadsheet | PIA Calculator display only |

A and B are **the same derivation**, not competing sources. Treat a disagreement between them as a transcription error, not a modelling question.

**Today the chart runs on A** (profile sync, `ShowMeTheMoneyCalculator.jsx:1883`). C exists but never leaves the PIA Calculator — there is no `updateProfile` call — which is why the banner says "Earnings Record On File" and states outright that chart amounts still come from the entered PIA. **Any copy claiming the chart reflects the earnings record is false until Plan A changes that.**

### The product thesis this implies

What we tell the user is: *the number on your statement is an estimate resting on an assumption. Your earnings record is the underlying fact. Here is what it produces under assumptions you control.*

So Plan A is not "replace their number with ours." It is "show them that their number was always a derivation, and hand them the controls."

### A ≠ C is usually NOT an error — and that distinction is load-bearing

When our PIA differs from the statement figure, there are two entirely different causes and they must never be conflated:

- **Different assumptions → the numbers SHOULD differ.** SSA assumed continued earnings to FRA; the user told us they stop at 63. A lower number is the correct answer and is the entire value of the product.
- **Same assumptions → they MUST match.** Any gap is a defect in our engine (see the §1 indexing-cap defect, which understates PIA and would masquerade as an assumption difference).

**Therefore any validation must control for the assumption.** To check our engine against SSA, compute C *under SSA's own assumption* — earnings continuing at the current rate through FRA — and compare that to the statement figure. Comparing a stop-at-63 PIA against SSA's continue-to-FRA PIA proves nothing.

This also means user-facing copy must attribute a difference to the right cause. Telling someone their benefit is lower than their statement says, without naming the assumption that caused it, is alarming and unhelpful.

### The statement PDF (not ingested)

Use it as a **validation oracle, not a data source**: capture 2-3 typed numbers (benefit at FRA, family maximum, disability estimate) and compare against C computed under matched assumptions. Do not build a PDF parser — brittle, and storing statements would put SSN-bearing identity documents in the database, which `earnings_records` deliberately avoids (it holds neither name nor SSN).

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
