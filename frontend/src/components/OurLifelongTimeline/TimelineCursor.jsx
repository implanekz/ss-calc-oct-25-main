// frontend/src/components/OurLifelongTimeline/TimelineCursor.jsx
import React, { useRef, useState, useEffect } from 'react';
import { formatBucketValue, buildNarrative } from './timelineMath';

const TimelineCursor = ({
  axisStartYear,
  axisEndYear,
  pxPerYear,
  year,
  setYear,
  primaryLabel,
  primaryAge,
  spouseLabel,
  spouseAge,
  monthlyIncome,
  buckets,
  primaryMilestones,
  spouseMilestones,
  prematureDeath,
  deathYear
}) => {
  const trackRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const totalYears = axisEndYear - axisStartYear;

  const yearToPercent = (y) => ((y - axisStartYear) / totalYears) * 100;

  const xToYear = (clientX) => {
    if (!trackRef.current) return year;
    const rect = trackRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const rawYear = axisStartYear + (percent / 100) * totalYears;
    return Math.round(Math.max(axisStartYear, Math.min(axisEndYear, rawYear)));
  };

  useEffect(() => {
    if (!isDragging) return undefined;
    const handleMouseMove = (e) => setYear(xToYear(e.clientX));
    const handleMouseUp = () => setIsDragging(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    // setYear is a useState setter (stable) and xToYear/axisStartYear/axisEndYear are read via
    // closure from props that only change on scenario updates -- same mount-while-dragging
    // pattern as CalendarPhaseBar and the existing RetirementStagesSlider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  const narrative = buildNarrative({
    year,
    primaryLabel,
    primaryAge,
    spouseLabel,
    spouseAge,
    primaryMilestones,
    spouseMilestones,
    monthlyIncome,
    prematureDeath,
    deathYear
  });

  return (
    <div
      ref={trackRef}
      className="absolute top-0 bottom-0 left-0"
      style={{ width: `${totalYears * pxPerYear}px` }}
    >
      <div
        className="absolute top-0 bottom-0 w-px bg-green-500 cursor-ew-resize z-20"
        style={{ left: `${yearToPercent(year)}%` }}
        onMouseDown={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
      >
        <div className="absolute -top-2 -left-1.5 w-3 h-3 rounded-full bg-green-500 shadow" />

        <div className="absolute top-4 left-3 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-lg text-sm">
          <div className="font-bold text-gray-800 mb-1">{narrative.feel}</div>

          {narrative.milestoneNotes.length > 0 && (
            <div className="mb-2 space-y-1">
              {narrative.milestoneNotes.map((note) => (
                <div key={note} className="text-xs font-semibold text-amber-800 bg-amber-50 rounded px-2 py-1">
                  {note}
                </div>
              ))}
            </div>
          )}

          <div className="text-xl font-extrabold text-primary-700 mb-1">{narrative.think}</div>

          {narrative.doLine && (
            <div className="text-xs italic text-gray-600 mb-2">{narrative.doLine}</div>
          )}

          {narrative.survivorNote && (
            <div className="text-xs text-gray-500 bg-gray-50 border-l-2 border-gray-300 rounded px-2 py-1 mb-2">
              {narrative.survivorNote}
            </div>
          )}

          <div className="border-t border-gray-100 pt-2 space-y-1">
            {buckets.map((bucket) => {
              const { display, muted } = formatBucketValue(bucket, year);
              return (
                <div key={bucket.filingAge} className={muted ? 'text-gray-400' : 'text-gray-700'}>
                  If both filed at {bucket.filingAge}: <span className="font-semibold">{display}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineCursor;
