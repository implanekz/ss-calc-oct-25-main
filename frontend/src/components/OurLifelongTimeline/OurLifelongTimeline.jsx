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

  return (
    <div className="space-y-3 mt-4">
      {/*
        overflow-x-auto forces overflow-y to auto too (per CSS spec, an axis that isn't
        "visible" makes the other axis compute to "auto" as well), so anything positioned
        outside this box's own padding box gets clipped/unreachable-by-scroll:
          - CalendarPhaseBar's row label sits at -top-5 (-20px) with text-xs (16px line-height),
            so it needs >= 20px of clearance above the bars -- pt-8 (32px) covers that.
          - TimelineCursor's tooltip is anchored top-4 (16px) below the cursor line and is
            taller than the two stacked phase bars (~136px) that establish this container's
            height -- pb-32 (128px) reserves enough room for the tooltip's full rendered
            height (~200px of text/buckets) to land inside the scrollable area instead of
            being clipped at the bottom.
      */}
      <div className="overflow-x-auto pt-8 pb-32" style={{ maxWidth: `${VISIBLE_YEARS * PX_PER_YEAR}px` }}>
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
