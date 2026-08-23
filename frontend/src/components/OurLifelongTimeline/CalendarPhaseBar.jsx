// frontend/src/components/OurLifelongTimeline/CalendarPhaseBar.jsx
import React, { useRef, useEffect } from 'react';

const MIN_AGE = 62;
const MAX_AGE = 95;

const CalendarPhaseBar = ({
  label,
  birthYear,
  axisStartYear,
  axisEndYear,
  pxPerYear,
  goGoEndAge,
  setGoGoEndAge,
  slowGoEndAge,
  setSlowGoEndAge,
  isDraggingGoGo,
  setIsDraggingGoGo,
  isDraggingSlowGo,
  setIsDraggingSlowGo,
  milestones
}) => {
  const trackRef = useRef(null);
  const totalYears = axisEndYear - axisStartYear;

  const yearToPercent = (year) => ((year - axisStartYear) / totalYears) * 100;
  const ageToPercent = (age) => yearToPercent(birthYear + age);

  const xToAge = (clientX) => {
    if (!trackRef.current) return MIN_AGE;
    const rect = trackRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    return Math.round(MIN_AGE + (percent / 100) * (MAX_AGE - MIN_AGE));
  };

  const handleGoGoMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingGoGo(true);
  };

  const handleSlowGoMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingSlowGo(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingGoGo) {
        const newAge = xToAge(e.clientX);
        if (newAge < slowGoEndAge) {
          setGoGoEndAge(newAge);
        }
      } else if (isDraggingSlowGo) {
        const newAge = xToAge(e.clientX);
        if (newAge > goGoEndAge && newAge <= MAX_AGE) {
          setSlowGoEndAge(newAge);
        }
      }
    };

    const handleMouseUp = () => {
      setIsDraggingGoGo(false);
      setIsDraggingSlowGo(false);
    };

    if (isDraggingGoGo || isDraggingSlowGo) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingGoGo, isDraggingSlowGo, goGoEndAge, slowGoEndAge, setGoGoEndAge, setSlowGoEndAge, setIsDraggingGoGo, setIsDraggingSlowGo]);

  const barLeftPercent = ageToPercent(MIN_AGE);
  const barWidthPercent = ageToPercent(MAX_AGE) - ageToPercent(MIN_AGE);
  const goGoWidth = ((goGoEndAge - MIN_AGE) / (MAX_AGE - MIN_AGE)) * 100;
  const slowGoWidth = ((slowGoEndAge - goGoEndAge) / (MAX_AGE - MIN_AGE)) * 100;
  const noGoWidth = 100 - goGoWidth - slowGoWidth;

  return (
    <div className="relative" style={{ width: `${totalYears * pxPerYear}px`, height: '52px' }}>
      {label && (
        <div className="absolute -top-5 left-0 text-xs font-extrabold uppercase tracking-wider text-gray-500">
          {label}
        </div>
      )}

      {/* Milestone markers, positioned on the full shared track independent of the bar itself */}
      {milestones.map((m) => (
        <div
          key={`${m.kind}-${m.year}`}
          className="absolute top-0 bottom-0 w-px bg-gray-300"
          style={{ left: `${yearToPercent(m.year)}%` }}
          title={m.label}
        />
      ))}

      {/* The 62-95 phase bar itself, absolutely positioned within the shared track */}
      <div
        ref={trackRef}
        className="absolute top-3 h-9 flex rounded-lg overflow-hidden shadow-md border-2 border-gray-300"
        style={{ left: `${barLeftPercent}%`, width: `${barWidthPercent}%` }}
      >
        <div
          className="relative flex items-center justify-center text-white font-bold text-sm"
          style={{ width: `${goGoWidth}%`, backgroundColor: '#E67E22' }}
        >
          {goGoWidth > 15 ? <span className="drop-shadow-sm">Go-Go</span> : null}
        </div>

        <div
          className="absolute top-0 bottom-0 w-6 flex items-center justify-center cursor-ew-resize z-10 group"
          style={{ left: `calc(${goGoWidth}% - 12px)` }}
          onMouseDown={handleGoGoMouseDown}
        >
          <div className={`w-1 h-full ${isDraggingGoGo ? 'bg-gray-800' : 'bg-gray-600 group-hover:bg-gray-700'}`} />
        </div>

        <div
          className="relative flex items-center justify-center text-white font-bold text-sm"
          style={{ width: `${slowGoWidth}%`, backgroundColor: '#F1C40F' }}
        >
          {slowGoWidth > 15 ? <span className="drop-shadow-sm">Slow-Go</span> : null}
        </div>

        <div
          className="absolute top-0 bottom-0 w-6 flex items-center justify-center cursor-ew-resize z-10 group"
          style={{ left: `calc(${goGoWidth + slowGoWidth}% - 12px)` }}
          onMouseDown={handleSlowGoMouseDown}
        >
          <div className={`w-1 h-full ${isDraggingSlowGo ? 'bg-gray-800' : 'bg-gray-600 group-hover:bg-gray-700'}`} />
        </div>

        <div
          className="relative flex items-center justify-center text-white font-bold text-sm"
          style={{ width: `${noGoWidth}%`, backgroundColor: '#95A5A6' }}
        >
          {noGoWidth > 15 ? <span className="drop-shadow-sm">No-Go</span> : null}
        </div>
      </div>
    </div>
  );
};

export default CalendarPhaseBar;
