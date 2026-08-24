// frontend/src/components/OurLifelongTimeline/DeathMarker.jsx
import React from 'react';

// Neutral/dark, distinct from all four MILESTONE_STYLES colors in CalendarPhaseBar.jsx --
// this marker represents a household event (loss of a spouse), not a personal milestone.
const DEATH_MARKER_COLOR = '#4B5563';

const DeathMarker = ({ axisStartYear, axisEndYear, deathYear, pxPerYear }) => {
  const totalYears = axisEndYear - axisStartYear;
  const yearToPercent = (year) => ((year - axisStartYear) / totalYears) * 100;
  const percent = yearToPercent(deathYear);

  // Same convention CalendarPhaseBar's own milestones use: a marker before the visible axis
  // start would sit off-canvas to the left of the overflow-x-auto track with no way to scroll
  // to it -- skip rendering it entirely rather than leave an unreachable marker.
  if (percent < 0) return null;

  return (
    <div
      className="absolute top-0 bottom-0 w-6 z-10 flex flex-col items-center pointer-events-none"
      style={{ left: `calc(${percent}% - 12px)` }}
      title={`Loss of a spouse (${deathYear})`}
    >
      <span
        className="absolute w-3.5 h-3.5 rounded-full border-2 border-white shadow"
        style={{ backgroundColor: DEATH_MARKER_COLOR, top: '-16px' }}
      />
      {/* h-full on a div spanning top-0 bottom-0 of the shared track (not one person's row)
          is what draws this line through both phase bars, distinguishing a household event
          from CalendarPhaseBar's own per-person milestone lines, which only span one row. */}
      <span className="w-1 h-full rounded-full" style={{ backgroundColor: DEATH_MARKER_COLOR }} />
      <span
        className="absolute flex flex-col items-center whitespace-nowrap text-white font-bold rounded px-1.5 py-0.5 leading-none"
        style={{ backgroundColor: DEATH_MARKER_COLOR, top: '-48px' }}
      >
        <span className="text-xs">Loss of a spouse</span>
        <span className="text-[9px] font-semibold opacity-90">{deathYear}</span>
      </span>
    </div>
  );
};

export default DeathMarker;
