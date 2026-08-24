# Our Lifelong Timeline — Narrated Milestones (first slice) — Design

Status: approved by Kurt, pending spec review
Author: Kurt + Claude (brainstorming session, 2026-08-23)
Related: [[lifelong-navigator-direction]] live-testing follow-up (milestone markers "practically invisible"); [[the-last-lever-premise]] (the Do line's lever); builds on `docs/superpowers/specs/2026-08-23-our-lifelong-timeline-design.md` (the shipped v1 this spec extends, not replaces).

## Problem

Our Lifelong Timeline shipped with milestone markers (each person's 62nd birthday, full retirement age, chosen filing age, 70th birthday) rendered as 1px-wide gray divs with only a hover `title` attribute — practically invisible in live testing. Separately, the cursor tooltip that drives the module's core interaction shows a flat data table (year, ages, monthly/annual income, three filing-age buckets) with no narrative shape. Kurt's stated goal for this module — letting people see their own future clearly enough that the reflexive 62-63 claim stops being the only option they can picture (see the original spec's Problem section) — is better served by a tooltip that tells a small story at each point than by a table of numbers, since people engage more with information framed as being about themselves.

## Goal

Turn the existing single-cursor interaction into a narrated "scrapbook" experience: milestones become visible, distinctly styled waypoints instead of invisible ticks, and every reveal — whether reached by freely dragging the cursor or by clicking a milestone — is built from the same three-part template (Feel / Think / Do) instead of a plain sentence or a bare number.

This is deliberately the **first slice** of a larger "cinematic sweep" idea Kurt described (auto-play motion, go-go/slow-go transition narration, a fuller premature-death survivor story, eventual AI-authored narrative for saved scenarios). Only the pieces below are in scope now; the rest stays a documented future direction (see Non-goals).

## Non-goals for this version

- **No "stopped working" narrative beat.** Conceptually distinct from filing age in Kurt's model (people can stop working years before filing, bridging the gap with savings — the deferred "One Month at a Time" thesis). No data source exists for this yet: it would need either a direct "when did you stop working" input or detecting an earnings cliff in an uploaded SSA XML record. Not faked with filing-age data as a stand-in. Flagged as a distinct future follow-up, not scoped here.
- **No auto-play / animated sweep.** The interaction stays cursor-drag-or-click, same as today — no Race-tab-style automatic playback through years.
- **No freeform AI-generated narrative.** The Feel/Think/Do lines are template-filled from a pure function, not written by a model. The template is deliberately the seam that could later feed an AI-authored version for the saved-scenario document (see [[lifelong-navigator-direction]]), but generating that is out of scope here.
- **No go-go/slow-go/no-go transition narration.** Those phase-bar boundaries stay exactly as they are today (draggable, no narrative attached to crossing them). Only the four SS-derived milestones get the new treatment.
- **No changes to scenario save/comparison.** Still blocked on [[scenario-comparability-trap]], unrelated to this module's scope.
- **No redesign of the phase bars themselves** (Go-Go/Slow-Go/No-Go coloring, drag handles) — only the milestone markers layered on top of them change.

## Design

### Milestone markers (`CalendarPhaseBar.jsx`)

Each milestone (`age62`, `fra`, `chosenFilingAge`, `age70`) renders as a visible, color-coded marker instead of today's invisible 1px div:
- A small dot/flag glyph on the bar at the milestone's calendar-year position, plus a short always-visible label chip above it (reusing the existing `m.label` text, e.g. "Demo turns 62").
- Each kind gets its own accent color, so the four kinds read as visually distinct "chapters" along the bar rather than a flat set of ticks — the same spirit as the reference scrapbook/mind-map image Kurt shared (each branch gets its own connector color and a small icon).
- Clicking a marker calls a new `onMilestoneClick(year)` prop, which the parent (`OurLifelongTimeline.jsx`) wires to the existing `setCursorYear` — the same state the drag cursor already writes to. No new state is introduced; clicking a milestone is just another way to move the one existing cursor.
- The existing "skip markers before the visible axis start" filtering (`yearToPercent(m.year) >= 0`) is unchanged.

### Narrative content (`timelineMath.js`)

A new pure function, `buildNarrative`, replaces ad hoc string assembly in the tooltip:

```
buildNarrative({
  year, primaryLabel, primaryAge, spouseLabel, spouseAge,
  primaryMilestones, spouseMilestones,
  monthlyIncome, prematureDeath, deathYear
}) => { feel, milestoneNotes, think, doLine, survivorNote }
```

- **`feel`** (always present): `"${year}: ${primaryLabel} is ${primaryAge}, ${spouseLabel} is ${spouseAge}."` — the visceral, personal line (System 1).
- **`milestoneNotes`** (array, 0–2 entries): any milestone from either person's list whose `year === year` gets its own line, reusing that milestone's existing `label` text verbatim (e.g. "Spouse reaches full retirement age."). Both people can have a milestone land on the same year independently — both are shown, not just one.
- **`think`** (always present): the dramatic reveal — `monthlyIncome` and its annualized value, formatted for large/bold display, e.g. `"$3,140/month · $37,680/year"` (System 2, the fact).
- **`doLine`** (present only when `milestoneNotes` is non-empty): a milestone-kind-specific nudge toward the filing-age lever, keyed off the milestone's `kind`:
  - `age70`: "This is the last year waiting still grows the benefit — filing later than this doesn't add more."
  - `chosenFilingAge`: "This is the age you've chosen to file."
  - `fra`: "Filing here locks in your full, unreduced benefit — no early-claim penalty, no delayed-credit bonus."
  - `age62`: "This is the earliest possible filing age — the smallest benefit this household could lock in."
  When both people have a milestone on the same year, `doLine` is derived from the first entry in `milestoneNotes` (i.e. whichever person's milestone list produced it first — array order, not a significance ranking). On a plain drag year with no milestone, `doLine` is omitted rather than repeating a generic nudge every year — the existing persistent orientation footer below the module already covers that case, and repeating it on every dragged year would flatten milestones back into background noise instead of making them feel distinct.
- **`survivorNote`** (present only when `prematureDeath` is true and `year >= deathYear`): describes that the `think` figure already reflects the survivor-benefit adjustment (the underlying number is already correct as of the "thread premature-death adjustment into household buckets" fix — this only adds a sentence explaining it), e.g. "This reflects survivor benefits, assuming ${primaryLabel} has passed by now."

`buildNarrative` takes only data the module already computes (ages, milestone lists, the preferred-scenario monthly income, the premature-death inputs) — no new source of truth, no new calculation logic.

### Tooltip (`TimelineCursor.jsx`)

Restructured around the narrative object instead of the current flat list:
1. `feel` line.
2. `milestoneNotes`, if any (styled distinctly — this is the scrapbook "chapter" moment).
3. `think`, rendered large/bold (the dramatic reveal), replacing today's small "Monthly Income / Annual Income" lines.
4. `doLine`, if present, styled as a short call-to-action nudge.
5. `survivorNote`, if present, styled with a distinct (muted/somber) accent, separate from the reveal above it.
6. The existing 62/67/70 cumulative comparison table stays, demoted below the narrative as secondary detail — still useful for "which line do you want to be" comparison, no longer the headline.

### Visual styling

Scrapbook-inspired: warm, card-like tooltip presentation; milestone markers carry per-kind color and a small icon rather than being flat gray ticks, so the timeline reads as a sequence of labeled chapters rather than a plain axis with a data popup.

## Data flow

No new source of truth. `buildNarrative` is a pure function of state the module already holds (ages via `calendarYearToAge`, milestone lists via `getMilestonesForPerson`, `monthlyIncome` via the existing `combinedProjections.preferred.monthly` lookup, and the existing `prematureDeath`/`deathYear` values). The only new piece of state is the milestone `onClick` writing to the existing `cursorYear` — reusing `setCursorYear`, not adding a parallel state.

## Testing notes

Extend `timelineMath.test.js` with cases for `buildNarrative`:
- No milestone on the cursor year → `milestoneNotes` empty, `doLine` absent.
- Each milestone kind (`age62`, `fra`, `chosenFilingAge`, `age70`) landing on the cursor year → correct `doLine` text for that kind.
- Both people's milestones landing on the same cursor year → both appear in `milestoneNotes`.
- `prematureDeath` true, cursor year before `deathYear` → `survivorNote` absent.
- `prematureDeath` true, cursor year at/after `deathYear` → `survivorNote` present.
- `prematureDeath` false → `survivorNote` always absent regardless of year.

Marker click behavior (`onMilestoneClick` → `setCursorYear`) is covered by a component-level test or manual verification in-browser, consistent with how the existing drag-cursor behavior was verified for the original module.
