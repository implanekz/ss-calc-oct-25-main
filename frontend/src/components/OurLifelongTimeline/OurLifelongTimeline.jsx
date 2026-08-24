// frontend/src/components/OurLifelongTimeline/OurLifelongTimeline.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import CalendarPhaseBar from './CalendarPhaseBar';
import TimelineCursor from './TimelineCursor';
import DeathMarker from './DeathMarker';
import { getAxisEndYear, getHouseholdBuckets, getMilestonesForPerson, calendarYearToAge } from './timelineMath';

const PX_PER_YEAR = 50;

// How often the year ruler beneath both rows places a labeled tick.
const YEAR_TICK_INTERVAL = 5;

// The ruler's own vertical footprint (mt-3 gap + its text row) in the normal-flow layout below
// both bars -- folded into TWO_ROW_HEIGHT so the tooltip still renders below it, not on top of it.
const YEAR_RULER_HEIGHT = 28;

// Two 52px-tall CalendarPhaseBar rows plus the mb-28 (112px) gap between them -- grown from
// 32px so row 2's stacked (two-level) markers have clearance below row 1's bar -- plus the year
// ruler's own height. The tooltip (Task 7) is positioned this far down plus a small clearance
// so it never overlaps either bar or the ruler.
const TWO_ROW_HEIGHT = 52 + 112 + 52 + YEAR_RULER_HEIGHT;
const TOOLTIP_TOP_OFFSET = TWO_ROW_HEIGHT + 12;

// Approximate rendered width of the redesigned 3-box tooltip, used only to decide when it
// would run off the right edge of the currently-scrolled-into-view window and should flip to
// grow leftward from the cursor instead.
const TOOLTIP_WIDTH = 600;
const TOOLTIP_FLIP_MARGIN = 24;

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
  prematureDeath,
  deathAge,
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

  const birthYearPrimary = new Date(spouse1Dob).getFullYear();
  const birthYearSpouse = new Date(spouse2Dob).getFullYear();
  const axisStartYear = currentYear;
  const axisEndYear = getAxisEndYear(birthYearPrimary, birthYearSpouse);

  // Same computation ShowMeTheMoneyCalculator.jsx uses to build deathYearNumber for its own
  // combineProjections() calls (primary person's birth year + deathAge), so the household
  // buckets stay consistent with the tooltip's survivor-adjusted "Monthly Income" line above them.
  const deathYear = birthYearPrimary + Number(deathAge);

  const buckets = useMemo(
    () => getHouseholdBuckets({ spouse1Pia, spouse1Dob, spouse2Pia, spouse2Dob, inflation, prematureDeath, deathYear }),
    [spouse1Pia, spouse1Dob, spouse2Pia, spouse2Dob, inflation, prematureDeath, deathYear]
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
  const cumulativeIncome = combinedProjections?.preferred?.cumulative?.[cursorYear] || 0;

  const cursorPixelX = (cursorYear - axisStartYear) * PX_PER_YEAR;
  const flipLeft = cursorPixelX - viewport.scrollLeft > viewport.clientWidth - TOOLTIP_WIDTH - TOOLTIP_FLIP_MARGIN;

  const yearTicks = useMemo(() => {
    const ticks = [];
    for (let y = axisStartYear; y <= axisEndYear; y += YEAR_TICK_INTERVAL) {
      ticks.push(y);
    }
    return ticks;
  }, [axisStartYear, axisEndYear]);

  return (
    <div className="space-y-3 mt-4">
      {/*
        overflow-x-auto forces overflow-y to auto too (per CSS spec, an axis that isn't
        "visible" makes the other axis compute to "auto" as well), so anything positioned
        outside this box's own padding box gets clipped/unreachable-by-scroll:
          - CalendarPhaseBar's bolder markers (Task 4) can reach up to two stack levels above
            the bar, roughly -126px at the chip's own top edge -- pt-32 (128px) covers that
            with a small margin; the row label's older -top-5 need is comfortably inside it too.
          - TimelineCursor's tooltip now renders below both rows and the year ruler entirely
            (TOOLTIP_TOP_OFFSET, past the 244px two-row-plus-ruler block), rather than
            overlapping either bar -- pb-96 (384px) reserves enough room for that offset plus
            the tooltip's own worst-case rendered
            height (narrative header with all optional lines present, plus the 3-box row) to
            land inside the scrollable area instead of being clipped at the bottom.
      */}
      <div ref={scrollContainerRef} className="w-full overflow-x-auto pt-32 pb-96">
        <div className="relative" style={{ width: `${(axisEndYear - axisStartYear) * PX_PER_YEAR}px` }}>
          <div className="mb-28">
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
              onMilestoneClick={setCursorYear}
            />
          </div>

          {/* Year ruler: a labeled tick every YEAR_TICK_INTERVAL years, so a reader can place any
              point on either bar in calendar time without hovering for the cursor tooltip. */}
          <div className="relative mt-3 h-4 border-t border-gray-200">
            {yearTicks.map((y) => (
              <span
                key={y}
                className="absolute top-1 text-[10px] font-medium text-gray-500"
                style={{ left: `${((y - axisStartYear) / (axisEndYear - axisStartYear)) * 100}%` }}
              >
                {y}
              </span>
            ))}
          </div>

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
        </div>
      </div>

      <p className="text-xs text-gray-500 border-t border-gray-100 pt-2">
        Want a different picture? Change filing ages in the panel on the left — timing is the one lever still fully in your control.
      </p>
    </div>
  );
};

export default OurLifelongTimeline;
