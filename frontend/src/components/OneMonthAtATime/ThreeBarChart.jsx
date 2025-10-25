import React from 'react';

/**
 * ThreeBarChart Component
 * 
 * Displays three bars representing Social Security benefits at different filing ages:
 * - Red Bar: Age 62 (minimum filing age baseline)
 * - Blue Bar: Currently selected age (variable based on user input)
 * - Green Bar: Age 70 (maximum benefit)
 * 
 * Part of the "One Month at a Time" feature - MVP Sprint 1
 */

const ThreeBarChart = ({ 
  baselineBenefit = 2500,  // Age 62 benefit
  currentBenefit = 2500,   // Current selection benefit
  maxBenefit = 4100,       // Age 70 benefit
  currentAge = 62,
  currentMonths = 0
}) => {
  // Calculate bar heights as percentages (relative to max benefit)
  const maxHeight = 400; // pixels
  const baselineHeight = (baselineBenefit / maxBenefit) * maxHeight;
  const currentHeight = (currentBenefit / maxBenefit) * maxHeight;
  const maxHeight100 = maxHeight; // Green bar is always 100%

  // Format currency for display
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format age display (e.g., "62 years, 3 months")
  const formatAge = (years, months) => {
    if (months === 0) {
      return `${years} years`;
    }
    return `${years} years, ${months} month${months === 1 ? '' : 's'}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Chart Title */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Your Social Security Filing Options
        </h2>
        <p className="text-gray-600">
          See how your monthly benefit changes month by month
        </p>
      </div>

      {/* Three Bar Chart Container */}
      <div className="flex items-end justify-around gap-8 mb-8">
        
        {/* Red Bar - Age 62 */}
        <div className="flex flex-col items-center flex-1">
          {/* Benefit Amount Label */}
          <div className="mb-2 text-center">
            <div className="text-lg font-bold text-red-600">
              {formatCurrency(baselineBenefit)}
            </div>
            <div className="text-sm text-gray-500">per month</div>
          </div>
          
          {/* Bar */}
          <div 
            className="w-full bg-red-500 rounded-t-lg relative transition-all duration-300 ease-in-out"
            style={{ height: `${baselineHeight}px`, maxWidth: '120px' }}
          >
            {/* Value indicator inside bar */}
            <div className="absolute bottom-4 left-0 right-0 text-center text-white font-semibold text-sm">
              Age 62
            </div>
          </div>
          
          {/* Age Label */}
          <div className="mt-3 text-center">
            <div className="text-sm font-semibold text-gray-700">Baseline</div>
            <div className="text-xs text-gray-500">Earliest Filing Age</div>
          </div>
        </div>

        {/* Blue Bar - Current Selection */}
        <div className="flex flex-col items-center flex-1">
          {/* Benefit Amount Label */}
          <div className="mb-2 text-center">
            <div className="text-lg font-bold text-blue-600">
              {formatCurrency(currentBenefit)}
            </div>
            <div className="text-sm text-gray-500">per month</div>
          </div>
          
          {/* Bar */}
          <div 
            className="w-full bg-blue-500 rounded-t-lg relative transition-all duration-300 ease-in-out shadow-lg"
            style={{ height: `${currentHeight}px`, maxWidth: '120px' }}
          >
            {/* Value indicator inside bar */}
            <div className="absolute bottom-4 left-0 right-0 text-center text-white font-semibold text-sm px-1">
              {formatAge(currentAge, currentMonths)}
            </div>
          </div>
          
          {/* Age Label */}
          <div className="mt-3 text-center">
            <div className="text-sm font-semibold text-gray-700">Your Selection</div>
            <div className="text-xs text-gray-500">Current Filing Age</div>
          </div>
        </div>

        {/* Green Bar - Age 70 */}
        <div className="flex flex-col items-center flex-1">
          {/* Benefit Amount Label */}
          <div className="mb-2 text-center">
            <div className="text-lg font-bold text-green-600">
              {formatCurrency(maxBenefit)}
            </div>
            <div className="text-sm text-gray-500">per month</div>
          </div>
          
          {/* Bar */}
          <div 
            className="w-full bg-green-500 rounded-t-lg relative transition-all duration-300 ease-in-out"
            style={{ height: `${maxHeight100}px`, maxWidth: '120px' }}
          >
            {/* Value indicator inside bar */}
            <div className="absolute bottom-4 left-0 right-0 text-center text-white font-semibold text-sm">
              Age 70
            </div>
          </div>
          
          {/* Age Label */}
          <div className="mt-3 text-center">
            <div className="text-sm font-semibold text-gray-700">Maximum</div>
            <div className="text-xs text-gray-500">Latest Filing Age</div>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="mt-8 bg-gray-100 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Progress to Maximum Benefit</span>
          <span className="text-sm font-semibold text-gray-800">
            {Math.round((currentBenefit / maxBenefit) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-300 rounded-full h-3">
          <div 
            className="bg-blue-500 h-3 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${(currentBenefit / maxBenefit) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default ThreeBarChart;
