import React, { useState } from 'react';
import ThreeBarChart from './ThreeBarChart';
import MonthYearControls from './MonthYearControls';
import OutputDisplay from './OutputDisplay';
import useBenefitCalculations from '../../hooks/useBenefitCalculations';

/**
 * OneMonthAtATimeModal Component
 * 
 * Main container for the "One Month at a Time" feature
 * Integrates all MVP components:
 * - ThreeBarChart: Visual representation of benefits
 * - MonthYearControls: Increment/decrement controls
 * - OutputDisplay: Shows monetary value
 * - useBenefitCalculations: Calculation logic
 * 
 * Part of the "One Month at a Time" feature - MVP Sprint 5
 */

const OneMonthAtATimeModal = ({
  isOpen = false,
  onClose,
  baseBenefitAt62 = 2500,
  inflationRate = 0.03,
  birthYear = 1960,
  isMarried = false,
  spouseBenefitAt62 = 2000,
  spouseBirthYear = 1962
}) => {
  // State for current selection - separate for each spouse when married
  const [primaryAge, setPrimaryAge] = useState(62);
  const [primaryMonths, setPrimaryMonths] = useState(0);
  const [spouseAge, setSpouseAge] = useState(62);
  const [spouseMonths, setSpouseMonths] = useState(0);
  const [longevityAge, setLongevityAge] = useState(85);

  // Get benefit calculations for primary
  const primaryCalcs = useBenefitCalculations({
    baseBenefitAt62,
    inflationRate,
    birthYear
  });

  // Get benefit calculations for spouse - always call hook (React rules)
  // We just won't use it if not married
  const spouseCalcs = useBenefitCalculations({
    baseBenefitAt62: spouseBenefitAt62,
    inflationRate,
    birthYear: spouseBirthYear
  });

  // Handle age change from controls
  const handlePrimaryAgeChange = (newAge, newMonths) => {
    setPrimaryAge(newAge);
    setPrimaryMonths(newMonths);
  };

  const handleSpouseAgeChange = (newAge, newMonths) => {
    setSpouseAge(newAge);
    setSpouseMonths(newMonths);
  };

  // Calculate combined values for display
  const primaryBaseline = primaryCalcs.getBenefitForAge(62, 0);
  const primaryCurrent = primaryCalcs.getBenefitForAge(primaryAge, primaryMonths);
  const primaryMax = primaryCalcs.getBenefitForAge(70, 0);

  const spouseBaseline = isMarried ? spouseCalcs.getBenefitForAge(62, 0) : 0;
  const spouseCurrent = isMarried ? spouseCalcs.getBenefitForAge(spouseAge, spouseMonths) : 0;
  const spouseMax = isMarried ? spouseCalcs.getBenefitForAge(70, 0) : 0;

  // Combined totals for married couples
  const baselineBenefit = primaryBaseline + spouseBaseline;
  const currentBenefit = primaryCurrent + spouseCurrent;
  const maxBenefit = primaryMax + spouseMax;

  // Calculate gains
  const monthlyGainFromBaseline = currentBenefit - baselineBenefit;
  const potentialRemainingGain = maxBenefit - currentBenefit;
  const totalPossibleGain = maxBenefit - baselineBenefit;

  // Calculate cumulative lifetime income
  const calculateCumulativeIncome = (monthlyBenefit, filingAge, filingMonths, endAge) => {
    const startAgeInMonths = filingAge * 12 + filingMonths;
    const endAgeInMonths = endAge * 12;
    const monthsOfPayment = endAgeInMonths - startAgeInMonths;
    return monthsOfPayment > 0 ? monthlyBenefit * monthsOfPayment : 0;
  };

  const primaryCumulativeIncome = calculateCumulativeIncome(primaryCurrent, primaryAge, primaryMonths, longevityAge);
  const spouseCumulativeIncome = isMarried ? calculateCumulativeIncome(spouseCurrent, spouseAge, spouseMonths, longevityAge) : 0;
  const totalCumulativeIncome = primaryCumulativeIncome + spouseCumulativeIncome;

  const baselineCumulativeIncome = calculateCumulativeIncome(baselineBenefit, 62, 0, longevityAge);
  const cumulativeGain = totalCumulativeIncome - baselineCumulativeIncome;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
            aria-label="Close modal"
          >
            <svg 
              className="w-6 h-6" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          </button>

          {/* Modal Content */}
          <div className="p-8">
            {/* Main Content Layout - Grid with 40/60 split */}
            <div className="grid lg:grid-cols-5 gap-6 mb-6">
              {/* Left Column: Control Panels - 40% (2 of 5 columns) - Compact */}
              <div className="lg:col-span-2 space-y-3">
                {/* Primary Filer Section */}
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <h3 className="text-xs font-bold text-blue-900 mb-2">
                    Primary Filer
                  </h3>
                  <MonthYearControls
                    currentAge={primaryAge}
                    currentMonths={primaryMonths}
                    onAgeChange={handlePrimaryAgeChange}
                    minAge={62}
                    maxAge={70}
                  />
                  {/* Primary Stats - Inline */}
                  <div className="mt-2 pt-2 border-t border-blue-200 flex items-baseline justify-between">
                    <div>
                      <div className="text-xs text-gray-600">Monthly Benefit</div>
                      <div className="text-lg font-bold text-blue-700">
                        ${primaryCurrent.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {primaryAge}y {primaryMonths}m
                    </div>
                  </div>
                </div>

                {/* Spouse Section (if married) */}
                {isMarried && (
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                    <h3 className="text-xs font-bold text-purple-900 mb-2">
                      Spouse
                    </h3>
                    <MonthYearControls
                      currentAge={spouseAge}
                      currentMonths={spouseMonths}
                      onAgeChange={handleSpouseAgeChange}
                      minAge={62}
                      maxAge={70}
                    />
                    {/* Spouse Stats - Inline */}
                    <div className="mt-2 pt-2 border-t border-purple-200 flex items-baseline justify-between">
                      <div>
                        <div className="text-xs text-gray-600">Monthly Benefit</div>
                        <div className="text-lg font-bold text-purple-700">
                          ${spouseCurrent.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {spouseAge}y {spouseMonths}m
                      </div>
                    </div>
                  </div>
                )}

                {/* Cumulative Income Calculator */}
                <div className="bg-white rounded-lg p-4 border-2 border-gray-300">
                  <h3 className="text-xs font-bold text-gray-700 mb-1">The Power of Waiting</h3>
                  <p className="text-xs text-gray-600 mb-3">See your total lifetime income at different longevity ages</p>
                  
                  {/* Age Slider */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-2">
                      <span>Longevity Age</span>
                      <span className="font-semibold text-gray-700">{longevityAge}</span>
                    </div>
                    <input
                      type="range"
                      min="62"
                      max="95"
                      step="1"
                      value={longevityAge}
                      onChange={(e) => setLongevityAge(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1 px-0.5">
                      <span className="text-center" style={{width: '20px'}}>62</span>
                      <span className="text-center" style={{width: '20px'}}>70</span>
                      <span className="text-center" style={{width: '20px'}}>75</span>
                      <span className="text-center" style={{width: '20px'}}>85</span>
                      <span className="text-center" style={{width: '20px'}}>90</span>
                      <span className="text-center" style={{width: '20px'}}>95</span>
                    </div>
                  </div>

                  {/* Cumulative Gain Display */}
                  <div className={`rounded-lg p-3 border ${cumulativeGain >= 0 ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' : 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200'}`}>
                    <div className="text-xs text-gray-600 mb-1 text-center">
                      Additional lifetime income by waiting
                    </div>
                    <div className={`text-2xl font-bold text-center ${cumulativeGain >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {cumulativeGain >= 0 ? '+' : ''}${Math.abs(cumulativeGain).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-xs text-center mt-1 text-gray-600">
                      vs. filing at 62 • through age {longevityAge}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Social Security Filing Options Chart - 60% (3 of 5 columns) */}
              <div className="lg:col-span-3 bg-gray-50 rounded-lg p-6 border-2 border-gray-200">
                
                {/* Three Bar Chart */}
                <ThreeBarChart
                  baselineBenefit={baselineBenefit}
                  currentBenefit={currentBenefit}
                  maxBenefit={maxBenefit}
                  currentAge={isMarried ? null : primaryAge}
                  currentMonths={isMarried ? null : primaryMonths}
                  showSankeyFlow={false}
                />

                {/* Summary Stats Below Chart */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Gain Made</div>
                    <div className="text-sm font-bold text-green-700">
                      +${monthlyGainFromBaseline.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div className="text-center border-x border-gray-300">
                    <div className="text-xs text-gray-500 mb-1">Potential</div>
                    <div className="text-sm font-bold text-blue-700">
                      +${potentialRemainingGain.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Progress</div>
                    <div className="text-sm font-bold text-gray-800">
                      {Math.round((currentBenefit / maxBenefit) * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section: Cumulative Income Display */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border-2 border-green-200 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-1">
                    {isMarried ? 'Combined Household Income' : 'Monthly Benefit'}
                  </h3>
                  <div className="text-4xl font-bold text-green-700">
                    ${currentBenefit.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    <span className="text-lg text-gray-600 font-normal ml-2">/month</span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Gain Already Made */}
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-2 mb-1">
                      <span className="text-xs font-semibold text-green-900">Gain Already Made</span>
                      <div className="text-xs bg-green-200 text-green-900 px-2 py-0.5 rounded-full font-bold">
                        Locked In ✓
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-green-700">
                      +${monthlyGainFromBaseline.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">vs. filing at 62</div>
                  </div>

                  {/* Potential Remaining */}
                  <div className="text-right border-l-2 border-green-300 pl-6">
                    <div className="flex items-center justify-end gap-2 mb-1">
                      <span className="text-xs font-semibold text-blue-900">Potential Remaining</span>
                      <div className="text-xs bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full font-bold">
                        Available 🎯
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-blue-700">
                      +${potentialRemainingGain.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">if you wait until 70</div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="w-full bg-gray-300 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ 
                      width: `${(currentBenefit / maxBenefit) * 100}%`,
                      background: 'linear-gradient(to right, #10b981, #3b82f6)'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div className="mt-6 flex justify-center">
              <button
                onClick={onClose}
                className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
              >
                Done Exploring
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OneMonthAtATimeModal;
