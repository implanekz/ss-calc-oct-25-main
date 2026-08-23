# Our Lifelong Timeline — Design

Status: approved by Kurt, pending spec review
Author: Kurt + Claude (brainstorming session, 2026-08-23)
Related: [[lifelong-navigator-direction]] capability 3 ("household timeline on a calendar-year axis shared by both spouses"); blocked-later work depends on [[scenario-comparability-trap]] being resolved first (not in this spec's scope).

## Problem

Research (e.g. United Income's "Optimal vs. Actual Social Security Claim Ages" analysis of Health and Retirement Study data) shows most people claim Social Security at 62–63 despite optimal claiming ages clustering near 70 for most filers. The gap is driven by an inability to see the future consequences of the claiming decision at the moment it's made — people default to the earliest, most certain option because the tradeoff is invisible. This app's existing calculator already shows the tradeoff for a single person across ages. What it doesn't yet do is let a couple see how *both* of their timelines interact and unfold together across real calendar time.

The app already renders an age-indexed "Go-Go / Slow-Go / No-Go" retirement lifestyle phase bar per person (in `ShowMeTheMoneyCalculator.jsx`). These bars are purely a mental-model aid — they have zero effect on any Social Security calculation. They're a good input surface (people think in terms of their own age), but they don't show two people's timelines relative to each other, and they don't show income.

## Goal

Give couples a way to see their combined Social Security timeline mapped onto shared calendar years — not each person's own age — so they can inspect any future year and see what their household income actually looks like there, under both their real plan and a few alternative claiming strategies. The mechanism is visibility, not persuasion: this spec does not attempt to talk anyone into a claiming age, it makes the future legible enough that the 62-63 default stops being the only option someone can picture.

Underlying this is a premise Kurt calls **The Last Lever**: by the time someone is using this calculator, their Social Security earnings record — and therefore their PIA — is effectively fixed; there's no more leverage to be had there. The one high-leverage choice still fully within their control is *when* to file. That's why this module has no input controls of its own for PIA or filing age (see the orientation notice under Design) — those remain the main app's job. This module's job is to make the consequences of that one remaining choice visible.

## Non-goals for this version

Deliberately deferred, to keep this shippable as one coherent unit rather than a sprawl:

- **No user-added custom life events.** V1 shows only SS-derived milestones (see below).
- **No data from the Flow or Race tabs pulled into this module.** Those stay separate for now.
- **No explicit "optimal vs. actual" persuasive framing/callouts in the UI**, even though that research is the motivating thesis. Flagged as the most likely first thing to revisit after v1 ships, not a "someday."
- **No integration with scenario save/comparison.** That feature has a known bug ([[scenario-comparability-trap]]) where its comparability check reads a live/mutable field instead of a frozen snapshot — this module must not be wired into save/compare until that's fixed separately.
- **Couples only.** This module's entire value is aligning two people's timelines against each other. It is not reachable when the app is in Single mode (see Edge Cases).

## Design

### Entry point & interaction shell

The existing collapsed, age-indexed phase-bar section (per person) gets an expand affordance — a chevron or label — near it. Clicking it plays a slide-down/expand animation **in place**: the compact bars grow into the full "Our Lifelong Timeline" module, obscuring the collapsed view for as long as it's open. A collapse control reverses the animation and returns to the compact per-person bars. No route change, no modal — same DOM position, just taller while expanded.

This module is not reachable in Single mode — see Edge Cases.

### Layout inside the expanded module

- **One shared calendar-year x-axis.** Starts at the current year. Ends at the later of the two people's age-100 year (see Edge Cases for why this is the chosen rule, and for the initial-zoom mitigation).
- **Two horizontal phase bars, one per person**, each showing that person's own Go-Go/Slow-Go/No-Go segments, positioned on the *shared* calendar axis by converting their age boundaries (`goGoEndAge`/`slowGoEndAge` + DOB) into calendar years.
  - Handles remain draggable in this expanded view. Dragging writes back through the exact same setters the collapsed bars use (`setGoGoEndAge`, `setSlowGoEndAge`, and the spouse equivalents) — there is no separate/parallel state for the expanded view. Whichever view was edited most recently is what's reflected everywhere; this falls out naturally from there being one source of truth, not from any extra conflict-resolution logic.
  - Because two people's bars are independently age-derived but jointly calendar-positioned, they will generally *not* line up at the same x-position even when their durations match (e.g., a 3-year Go-Go phase for each). This is correct, not a bug — but see Edge Cases for a mitigation, since it will look wrong to a user who hasn't yet made the mental shift from age-thinking to calendar-thinking.
- **One draggable vertical green line** spanning both people's bars, defaulting to the current year. This is the inspection cursor.
- **A tooltip attached to the line**, updating live as it's dragged, showing for that calendar year:
  - Each person's age in that calendar year.
  - The household's actual Monthly Income and Annual Income, under whatever preferred filing ages are already chosen for both people.
  - Three household-cumulative buckets: "if both had filed at 62," "at 67," and "at 70." Each bucket sums total household Social Security dollars received from the relevant hypothetical filing date up through the dragged year. The household is treated as one aggregate entity for these buckets — not two independently-summed per-person totals — so, for example, the "both filed at 70" bucket is genuinely zero for any dragged year before the *later* of the two people's 70th birthdays under that hypothetical. See Edge Cases for how this is presented so a legitimate zero doesn't read as broken.
- **Life-stage milestone markers**, derived only (not user-editable in v1): each person's 62nd birthday, full retirement age, their actual chosen filing age, and 70th birthday, plotted at the correct calendar year on their respective row.
- **An orientation notice**, persistent (not a dismissible toast) somewhere in the module, telling the user that changing what they see here means changing filing age (and other) inputs in the main sidebar — this module has no input controls of its own for PIA or filing age. This is functional wayfinding, not persuasive framing toward any particular age (that stays out of scope per Non-goals above): without it, a user exploring "what if I filed differently" has no way to know where that lever actually lives, since the go-go/slow-go/no-go handles are the only things draggable in this module and they don't affect income at all.

### Data flow

No new source of truth is introduced anywhere in this design. The module reads the same scenario state that already exists (DOBs, PIA, filing ages, go-go/slow-go/no-go age boundaries for both people), converting age↔calendar-year purely for display and for translating drag gestures back into age-based writes.

The cumulative-bucket math generalizes the logic that already powers the existing file-at-62/file-at-70 comparison (used elsewhere in the calculator for a single person) to (a) a household sum and (b) a third "file at 67" case. Concretely, this means calling the existing `calculateProjection()` / `combineProjections()` functions in `frontend/src/calculators/showMeTheMoney/projections.js` per hypothetical filing age per person, rather than writing new age→year or partial-year logic for this module. Ages shown in the tooltip use the same `birthYear + age` convention already used throughout the app — no new age/year utility is introduced.

Mid-year birthdays and partial-year benefit amounts are already handled by `calculateProjection()`: the calendar year in which a person's chosen filing age is reached is prorated to the months remaining after their birth month (`monthsInYear = 12 - birthMonthIndex`), and every other year counts as a full 12 months. This is a birth-month-anchored approximation — the actual filing month affects the dollar amount of the benefit but not which months of the claiming year count toward that year's total. This module inherits that existing behavior as-is; correcting or refining it is out of scope here since it would change numbers shown elsewhere in the app, not just in this new module.

The dragged cursor's year is transient view state only. It is not persisted as part of any saved scenario/plan, and it resets to the current year each time the module is opened (not remembered across open/close cycles) — there is no requirement in this spec for it to be sticky, and adding that would be scope not currently justified by any stated need.

### Edge cases

- **Calendar-axis end year.** Hard end = the later of the two people's age-100 year. For couples with a significant age gap this can push the axis past 50 years, which would crush the near-term, most decision-relevant years into a sliver if the initial view showed the whole span at once. Mitigation: the module's default/initial zoom shows roughly the next 10–15 years, with the full axis reachable by scrolling or zooming out, rather than rendering the entire span at full width by default. Confirmed acceptable as-is — a large age gap (e.g. 15+ years) is expected to be uncommon among this app's users, so this mitigation doesn't need to be more elaborate than described.
- **Visual mismatch between same-duration phases at different DOBs.** Since each person's phases are age-derived but calendar-positioned, identical-length phases for two people with different birth years will appear at different x-positions and won't visually align — this is correct, but non-obvious. Mitigation: when a handle is actively being dragged in the expanded view, show an inline live label (e.g. "moves Ted's Go-Go boundary to 2038") so the age→year translation is legible at the moment of the edit, rather than only implied by bar position.
- **Zero-value cumulative buckets.** A bucket reading "$0" for many consecutive dragged years (because the relevant hypothetical filing hasn't occurred yet at that point on the calendar) is mathematically correct but will read as broken. Mitigation: buckets show a muted state (e.g. "starts 2041") instead of "$0" until they have a first nonzero value at the current cursor position.
- **Single mode / missing spouse data.** The module is not reachable when the app is in Single mode — the expand affordance simply isn't shown, or is disabled, in that state. The same rule applies if the app is in Married mode but a spouse's DOB or other field required to place their bar on the calendar axis is missing: the module is not reachable until that data is present, rather than rendering a partial or broken second row.

## Naming

Working name: **"Our Lifelong Timeline"** — chosen to stay consistent with the already-confirmed "My/Our Lifelong Plan" naming convention for the saved scenario feature ([[lifelong-navigator-direction]]).

## Testing notes

Because no new calculation logic is introduced beyond generalizing the existing file-at-62/67/70 comparison to a household sum, the primary testing surface is:

- Age→calendar-year conversion correctness for both people independently, including across a leap year and across a birthday that falls after the current point in the calendar year.
- The household-aggregate cumulative bucket math, specifically the zero-until-hypothetical-filing-date behavior for couples with a meaningful age gap.
- Bidirectional sync: an edit made in the expanded (calendar-year) view is reflected correctly when the module is collapsed back to the age-based bars, and vice versa.
- The module's non-reachability in Single mode, and behavior when a spouse field is missing in Married mode.
- The orientation notice is present and visible without requiring scroll or interaction, in both the module's default and expanded-zoom states.
