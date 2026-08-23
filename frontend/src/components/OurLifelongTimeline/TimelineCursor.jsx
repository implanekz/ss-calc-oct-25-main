// frontend/src/components/OurLifelongTimeline/TimelineCursor.jsx
import React, { useRef, useState, useEffect } from 'react';
import { formatCurrency, formatBucketValue, getAnnualIncome } from './timelineMath';

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
  buckets
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
          <div className="font-bold text-gray-800 mb-1">{year}</div>
          <div className="text-gray-600 mb-2">
            {primaryLabel}: {primaryAge} &nbsp;&middot;&nbsp; {spouseLabel}: {spouseAge}
          </div>
          <div className="mb-2">
            <div>Monthly Income: <span className="font-semibold">{formatCurrency(monthlyIncome)}</span></div>
            <div>Annual Income: <span className="font-semibold">{formatCurrency(getAnnualIncome(monthlyIncome))}</span></div>
          </div>
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
