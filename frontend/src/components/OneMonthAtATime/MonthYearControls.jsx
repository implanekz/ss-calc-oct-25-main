import React from 'react';

/**
 * MonthYearControls Component
 * 
 * Provides increment/decrement controls for selecting a filing age
 * Users can adjust by individual months or full years
 * 
 * Part of the "One Month at a Time" feature - MVP Sprint 2
 */

const MonthYearControls = ({
  currentAge = 62,
  currentMonths = 0,
  onAgeChange,
  minAge = 62,
  maxAge = 70
}) => {
  // Calculate total months from age 62
  const getTotalMonths = (years, months) => {
    return (years - 62) * 12 + months;
  };

  // Convert total months back to years and months
  const getAgeFromMonths = (totalMonths) => {
    const years = Math.floor(totalMonths / 12) + 62;
    const months = totalMonths % 12;
    return { years, months };
  };

  // Handle month increment
  const incrementMonth = () => {
    const totalMonths = getTotalMonths(currentAge, currentMonths);
    const maxMonths = (maxAge - 62) * 12;
    
    if (totalMonths < maxMonths) {
      const newTotal = totalMonths + 1;
      const newAge = getAgeFromMonths(newTotal);
      onAgeChange(newAge.years, newAge.months);
    }
  };

  // Handle month decrement
  const decrementMonth = () => {
    const totalMonths = getTotalMonths(currentAge, currentMonths);
    
    if (totalMonths > 0) {
      const newTotal = totalMonths - 1;
      const newAge = getAgeFromMonths(newTotal);
      onAgeChange(newAge.years, newAge.months);
    }
  };

  // Handle year increment (adds 12 months)
  const incrementYear = () => {
    const totalMonths = getTotalMonths(currentAge, currentMonths);
    const maxMonths = (maxAge - 62) * 12;
    
    if (totalMonths + 12 <= maxMonths) {
      const newTotal = totalMonths + 12;
      const newAge = getAgeFromMonths(newTotal);
      onAgeChange(newAge.years, newAge.months);
    }
  };

  // Handle year decrement (subtracts 12 months)
  const decrementYear = () => {
    const totalMonths = getTotalMonths(currentAge, currentMonths);
    
    if (totalMonths >= 12) {
      const newTotal = totalMonths - 12;
      const newAge = getAgeFromMonths(newTotal);
      onAgeChange(newAge.years, newAge.months);
    }
  };

  // Check if at boundaries
  const atMinimum = currentAge === minAge && currentMonths === 0;
  const atMaximum = currentAge === maxAge && currentMonths === 0;

  return (
    <div className="w-full">
      {/* Current Age Display - Compact */}
      <div className="text-center mb-3">
        <div className="text-xs text-gray-500 mb-1">Selected Filing Age</div>
        <div className="text-2xl font-bold text-blue-600">
          {currentAge}
          {currentMonths > 0 && (
            <span className="text-lg text-gray-500 ml-1">
              + {currentMonths}mo
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          {currentAge} years, {currentMonths} month{currentMonths === 1 ? '' : 's'}
        </div>
      </div>

      {/* Control Buttons - Compact */}
      <div className="grid grid-cols-2 gap-2">
        {/* Month Controls */}
        <div className="space-y-2">
          <div className="text-center text-xs font-semibold text-gray-700 mb-1">
            By Month
          </div>
          
          {/* Increment Month Button */}
          <button
            onClick={incrementMonth}
            disabled={atMaximum}
            className={`w-full py-2 px-3 rounded text-sm font-semibold transition-all ${
              atMaximum
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
            aria-label="Add one month"
          >
            + Add 1 Month
          </button>

          {/* Decrement Month Button */}
          <button
            onClick={decrementMonth}
            disabled={atMinimum}
            className={`w-full py-2 px-3 rounded text-sm font-semibold transition-all ${
              atMinimum
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gray-500 text-white hover:bg-gray-600'
            }`}
            aria-label="Subtract one month"
          >
            − Subtract 1 Month
          </button>
        </div>

        {/* Year Controls */}
        <div className="space-y-2">
          <div className="text-center text-xs font-semibold text-gray-700 mb-1">
            By Year
          </div>
          
          {/* Increment Year Button */}
          <button
            onClick={incrementYear}
            disabled={atMaximum || getTotalMonths(currentAge, currentMonths) + 12 > (maxAge - 62) * 12}
            className={`w-full py-2 px-3 rounded text-sm font-semibold transition-all ${
              atMaximum || getTotalMonths(currentAge, currentMonths) + 12 > (maxAge - 62) * 12
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
            aria-label="Add one year"
          >
            + Add 1 Year
          </button>

          {/* Decrement Year Button */}
          <button
            onClick={decrementYear}
            disabled={atMinimum || getTotalMonths(currentAge, currentMonths) < 12}
            className={`w-full py-2 px-3 rounded text-sm font-semibold transition-all ${
              atMinimum || getTotalMonths(currentAge, currentMonths) < 12
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gray-500 text-white hover:bg-gray-600'
            }`}
            aria-label="Subtract one year"
          >
            − Subtract 1 Year
          </button>
        </div>
      </div>

      {/* Progress Info - Compact */}
      <div className="mt-2 pt-2 border-t border-gray-200">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Month {getTotalMonths(currentAge, currentMonths) + 1} of 97</span>
          <span>{Math.round(((getTotalMonths(currentAge, currentMonths)) / ((maxAge - minAge) * 12)) * 100)}% to Age {maxAge}</span>
        </div>
      </div>
    </div>
  );
};

export default MonthYearControls;
