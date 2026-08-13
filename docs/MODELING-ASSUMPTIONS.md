# Modeling assumptions and their limits

**Not a task list. An inventory** — so that when we write user-facing explanations and disclaimers, we start from a complete picture of what is arithmetic and what is assumption.

This is a **different axis** from `DATA-LINEAGE.md`. That document catalogues *correctable* discrepancies — our number versus SSA's number, where one side is right. This document catalogues *irreducible* uncertainty — our number versus reality, where nobody can be right in advance.

Status: 2026-08-13. Disclaimer work deferred by Kurt; capture now, write later.

---

## The framing that should govern the copy

Do not tell users "these numbers might be wrong." That destroys confidence in the precise parts along with the uncertain ones, and the precise parts are most of the value.

Tell them **which half they are looking at**:

| | Nature | Confidence |
|---|---|---|
| **Backward** — earnings record → indexed earnings → AIME → PIA | arithmetic on a factual record | precise; a disagreement with SSA is a defect on one side |
| **Forward** — PIA → claiming adjustment → COLA →year-by-year benefit | projection under chosen assumptions | approximate by construction; adjustable and visible |

This seam already exists in the product. The work-stop ladder is arithmetic on a real record. The chart is projection. The disclaimers should follow that line rather than being a blanket footer, and it maps directly onto the glass-box principle: simple on the surface, arithmetic underneath whenever the user wants to see it.

---

## 1. One inflation rate for the entire span (deliberate)

`inflation` (default 2.5%) is applied uniformly across every projected year — pre-claim COLA, post-claim COLA, and the whole horizon out to age 95.

Real COLAs are nothing like uniform: 2021 was 1.3%, 2022 was 5.9%, 2023 was 8.7%, 2024 was 3.2%. Any single rate is wrong in every individual year.

**This is a choice, not an oversight.** The alternative is forecasting a rate path, which would make the product an inflation prognosticator and produce false precision — a year-by-year path is *more* detailed and *less* honest, because nobody can produce a credible one over 30 years.

What a single rate does well: capture inflation's *cumulative* effect at a meta level, and let the user test sensitivity by moving one comprehensible dial.

What it cannot do: tell anyone what their check will be in a particular future year.

**Directionality: roughly symmetric** over long spans, since over- and under-shoots partly cancel. But it interacts with sequence — high inflation early compounds differently than high inflation late — so two identical averages can produce different lifetime totals. The single-rate model cannot express that at all.

**Copy implication:** frame the rate as a *dial the user owns*, not a prediction we made. "What if inflation runs at 3% instead of 2.5%?" is the honest use.

## 2. Timing dislocations

Several timings are modeled more cleanly than they occur:

- **Earnings posting lag.** SSA posts a year's earnings months after it ends, so a record is routinely missing the most recent year even when freshly downloaded. See `DATA-LINEAGE.md` §3 — file vintage and data completeness are distinct signals.
- **Post-claim COLA cadence.** `benefit_math.py:72` applies COLA "once per year after claiming (simple annual model)." Real COLAs apply from December of the announcement year, paid in the January check — not on a claim anniversary.
- **Pre-claim COLA.** `benefit_math.py:36,61` describes itself as "SSA-ish" with a "freeze at 60–61." Approximates the real interaction of indexing and COLA around eligibility.
- **Annual granularity.** `calculateProjection()` computes whole years, prorating only the claim year by birth month. Benefits are monthly, and filing mid-year produces partial-year effects this smooths over.

**Directionality: mixed.** Posting lag understates (missing recent years). The others are approximations without a consistent bias.

## 3. Reference data that does not exist yet

Genuinely unknowable, currently handled by silent fallback:

| Unknown | Fallback | Who it hits |
|---|---|---|
| AWI for the indexing year | `max(AVERAGE_WAGE_INDEX.values())` | anyone turning 60 this year or later — the young end of the 58+ audience |
| Bend points for a future eligibility year | most recent published set | anyone reaching 62 after the current published year |
| Future taxable maximum | most recent published value | high earners with projected years |
| Future COLA | the single user-set rate | everyone |

Every one of these **fails silently**. That is the real problem — not that we approximate, but that we do not say so. Someone born in 1966 gets an approximated PIA and is told nothing.

**This is the cheapest disclaimer win available:** surface the approximation exactly where it applies, rather than a blanket warning.

## 4. Behavioral assumptions we impose

- **Carry-forward earnings.** Projected years assume the most recent year's amount continues. Matches SSA's own convention, but a trailing employment gap makes it resurrect an older salary.
- **Longevity.** `projections.js:50` runs to `birthYear + 95`. `useBenefitCalculations.js:128` hardcodes "assuming life expectancy of 85 years" for cumulative-gain math — **two different horizons in one product.** Reconcile.
- **Premature death** defaults to age 75 when toggled.
- **Continuous employment** to the chosen stop age, with no modeled interruption.

**Directionality: whichever way the assumption is wrong.** These are the assumptions most worth exposing as user controls, because the user knows their own situation and we do not.

---

## What to build later

1. Per-assumption disclosure at the point of use, not a global footer.
2. Surface the silent fallbacks in §3 — the user should know when their PIA rests on estimated reference data.
3. Reconcile the two longevity horizons (§4).
4. Frame inflation as a dial the user owns; consider a sensitivity view (2% / 2.5% / 3%) rather than a single line.
5. Keep the backward/forward seam visible: precise arithmetic behind them, chosen assumptions ahead of them.

## What NOT to do

- A blanket "estimates may vary" disclaimer. It protects nobody and devalues the precise half.
- A year-by-year inflation forecast. More precision, less honesty.
- Hiding the fallbacks in §3 because surfacing them looks like weakness. A tool that says "this part is estimated, here's why" is trusted more than one that quietly guesses.
