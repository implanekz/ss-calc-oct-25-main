import React from 'react';

/**
 * OutputDisplay Component
 * 
 * Displays two key metrics:
 * 1. Monthly gain from waiting one more month
 * 2. Cumulative lifetime benefit increase vs age 62
 * 
 * Part of the "One Month at a Time" feature - MVP Sprint 4
 */

const OutputDisplay = ({
  monthlyGain = 0,
  cumulativeTotal = 0,
  currentAge = 62,
  currentMonths = 0
}) => {
  // Format currency with commas and no decimals
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format large numbers with abbreviations
  const formatLargeNumber = (amount) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(2)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return formatCurrency(amount);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          Value of Waiting
        </h3>
        <p className="text-sm text-gray-600">
          See the guaranteed income you gain by waiting one more month
        </p>
      </div>

      {/* Monthly Gain Card */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border-2 border-blue-300 shadow-md">
        <div className="text-center">
          <div className="text-sm font-semibold text-blue-700 mb-2 uppercase tracking-wide">
            Gain from Next Month
          </div>
          <div className="text-4xl font-bold text-blue-900 mb-2">
            {formatCurrency(monthlyGain)}
          </div>
          <div className="text-sm text-blue-700">
            per month, for life
          </div>
        </div>
        
        {monthlyGain > 0 && (
          <div className="mt-4 pt-4 border-t border-blue-300">
            <div className="text-xs text-blue-800 text-center">
              <p>
                If you wait <strong>one more month</strong>, your monthly benefit 
                increases by <strong>{formatCurrency(monthlyGain)}</strong>.
              </p>
              <p className="mt-2">
                That's <strong>{formatCurrency(monthlyGain * 12)}</strong> more per year, guaranteed.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Cumulative Total Card */}
      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border-2 border-green-300 shadow-md">
        <div className="text-center">
          <div className="text-sm font-semibold text-green-700 mb-2 uppercase tracking-wide">
            Total Lifetime Gain So Far
          </div>
          <div className="text-4xl font-bold text-green-900 mb-2">
            {formatLargeNumber(cumulativeTotal)}
          </div>
          <div className="text-sm text-green-700">
            additional guaranteed income vs. filing at 62
          </div>
        </div>
        
        {cumulativeTotal > 0 && (
          <div className="mt-4 pt-4 border-t border-green-300">
            <div className="text-xs text-green-800 text-center">
              <p>
                By waiting until age <strong>{currentAge} years{currentMonths > 0 ? `, ${currentMonths} months` : ''}</strong>, 
                you've increased your total lifetime Social Security income by an estimated 
                <strong> {formatCurrency(cumulativeTotal)}</strong>.
              </p>
              <p className="mt-2 italic">
                (Based on life expectancy to age 85)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Educational Message */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg 
              className="w-6 h-6 text-purple-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-purple-900 mb-1">
              Building Your Income Bridge
            </h4>
            <p className="text-xs text-purple-800">
              Each month you wait is a micro-commitment that builds guaranteed income for life. 
              No investment risk, no market volatility—just using the Social Security system as designed.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
          <div className="text-2xl font-bold text-gray-800">
            {formatCurrency(monthlyGain * 12)}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Annual Gain from<br/>Next Month
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
          <div className="text-2xl font-bold text-gray-800">
            {((cumulativeTotal / ((currentAge - 62) * 12 + currentMonths || 1))).toFixed(0) !== 'NaN' 
              ? formatCurrency(cumulativeTotal / ((currentAge - 62) * 12 + currentMonths || 1))
              : '$0'}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Average Gain<br/>Per Month Waited
          </div>
        </div>
      </div>

      {/* Zero State (at age 62) */}
      {currentAge === 62 && currentMonths === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <p className="text-sm text-yellow-800">
            <strong>You're at the starting line!</strong><br/>
            Use the controls above to see how each month of waiting increases your benefit.
          </p>
        </div>
      )}

      {/* Maximum State (at age 70) */}
      {currentAge === 70 && currentMonths === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-sm text-green-800">
            <strong>You've reached maximum benefits!</strong><br/>
            No additional benefit for waiting past age 70.
          </p>
        </div>
      )}
    </div>
  );
};

export default OutputDisplay;
