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
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      {/* Current Age Display */}
      <div className="text-center mb-6">
        <div className="text-sm text-gray-600 mb-2">Selected Filing Age</div>
        <div className="text-4xl font-bold text-blue-600">
          {currentAge}
          {currentMonths > 0 && (
            <span className="text-2xl text-gray-500 ml-2">
              + {currentMonths} mo
            </span>
          )}
        </div>
        <div className="text-sm text-gray-500 mt-1">
          {currentAge} years, {currentMonths} month{currentMonths === 1 ? '' : 's'}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-2 gap-6">
        {/* Month Controls */}
        <div className="space-y-3">
          <div className="text-center text-sm font-semibold text-gray-700 mb-2">
            By Month
          </div>
          
          {/* Increment Month Button */}
          <button
            onClick={incrementMonth}
            disabled={atMaximum}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
              atMaximum
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95 shadow-md hover:shadow-lg'
            }`}
            aria-label="Add one month"
          >
            <div className="flex items-center justify-center gap-2">
              <svg 
                className="w-5 h-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6" 
                />
              </svg>
              <span>Add 1 Month</span>
            </div>
          </button>

          {/* Decrement Month Button */}
          <button
            onClick={decrementMonth}
            disabled={atMinimum}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
              atMinimum
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gray-500 text-white hover:bg-gray-600 active:scale-95 shadow-md hover:shadow-lg'
            }`}
            aria-label="Subtract one month"
          >
            <div className="flex items-center justify-center gap-2">
              <svg 
                className="w-5 h-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M18 12H6" 
                />
              </svg>
              <span>Subtract 1 Month</span>
            </div>
          </button>
        </div>

        {/* Year Controls */}
        <div className="space-y-3">
          <div className="text-center text-sm font-semibold text-gray-700 mb-2">
            By Year
          </div>
          
          {/* Increment Year Button */}
          <button
            onClick={incrementYear}
            disabled={atMaximum || getTotalMonths(currentAge, currentMonths) + 12 > (maxAge - 62) * 12}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
              atMaximum || getTotalMonths(currentAge, currentMonths) + 12 > (maxAge - 62) * 12
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-green-500 text-white hover:bg-green-600 active:scale-95 shadow-md hover:shadow-lg'
            }`}
            aria-label="Add one year"
          >
            <div className="flex items-center justify-center gap-2">
              <svg 
                className="w-5 h-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6" 
                />
              </svg>
              <span>Add 1 Year</span>
            </div>
          </button>

          {/* Decrement Year Button */}
          <button
            onClick={decrementYear}
            disabled={atMinimum || getTotalMonths(currentAge, currentMonths) < 12}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
              atMinimum || getTotalMonths(currentAge, currentMonths) < 12
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gray-500 text-white hover:bg-gray-600 active:scale-95 shadow-md hover:shadow-lg'
            }`}
            aria-label="Subtract one year"
          >
            <div className="flex items-center justify-center gap-2">
              <svg 
                className="w-5 h-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M18 12H6" 
                />
              </svg>
              <span>Subtract 1 Year</span>
            </div>
          </button>
        </div>
      </div>

      {/* Progress Info */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex justify-between text-sm text-gray-600">
          <span>
            Month {getTotalMonths(currentAge, currentMonths) + 1} of {(maxAge - minAge) * 12 + 1}
          </span>
          <span>
            {Math.round(((getTotalMonths(currentAge, currentMonths)) / ((maxAge - minAge) * 12)) * 100)}% to Age {maxAge}
          </span>
        </div>
      </div>

      {/* Boundary Messages */}
      {atMinimum && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 text-center">
          You're at the earliest filing age (62). Benefits increase if you wait!
        </div>
      )}
      {atMaximum && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 text-center">
          You've reached the maximum benefit age (70). No additional benefit for waiting past this age.
        </div>
      )}
    </div>
  );
};

export default MonthYearControls;
