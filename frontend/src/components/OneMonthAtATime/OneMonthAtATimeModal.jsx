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
  birthYear = 1960
}) => {
  // State for current selection
  const [currentAge, setCurrentAge] = useState(62);
  const [currentMonths, setCurrentMonths] = useState(0);

  // Get benefit calculations
  const {
    getBenefitForAge,
    calculateMonthlyGain,
    calculateCumulativeGain
  } = useBenefitCalculations({
    baseBenefitAt62,
    inflationRate,
    birthYear
  });

  // Handle age change from controls
  const handleAgeChange = (newAge, newMonths) => {
    setCurrentAge(newAge);
    setCurrentMonths(newMonths);
  };

  // Calculate current values
  const baselineBenefit = getBenefitForAge(62, 0);
  const currentBenefit = getBenefitForAge(currentAge, currentMonths);
  const maxBenefit = getBenefitForAge(70, 0);
  const monthlyGain = calculateMonthlyGain(currentAge, currentMonths);
  const cumulativeTotal = calculateCumulativeGain(currentAge, currentMonths);

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
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                One Month at a Time
              </h1>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Build your retirement income bridge month by month. Each step is a micro-commitment 
                that creates guaranteed income for life.
              </p>
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              {/* Left Column: Chart and Controls */}
              <div className="space-y-6">
                {/* Three Bar Chart */}
                <ThreeBarChart
                  baselineBenefit={baselineBenefit}
                  currentBenefit={currentBenefit}
                  maxBenefit={maxBenefit}
                  currentAge={currentAge}
                  currentMonths={currentMonths}
                />

                {/* Month/Year Controls */}
                <MonthYearControls
                  currentAge={currentAge}
                  currentMonths={currentMonths}
                  onAgeChange={handleAgeChange}
                  minAge={62}
                  maxAge={70}
                />
              </div>

              {/* Right Column: Output Display */}
              <div className="flex items-center">
                <OutputDisplay
                  monthlyGain={monthlyGain}
                  cumulativeTotal={cumulativeTotal}
                  currentAge={currentAge}
                  currentMonths={currentMonths}
                />
              </div>
            </div>

            {/* Footer with RISE & SHINE messaging */}
            <div className="border-t pt-6">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center">
                      <svg 
                        className="w-6 h-6 text-white" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                        />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-indigo-900 mb-2">
                      The RISE and SHINE Method™
                    </h3>
                    <p className="text-sm text-indigo-800 mb-3">
                      This tool demonstrates the <strong>Navigate</strong> stage of the SHINE framework. 
                      By breaking down 8 years into 96 achievable micro-commitments, you can see exactly 
                      what each month of patience is worth.
                    </p>
                    <div className="grid md:grid-cols-3 gap-4 text-xs text-indigo-700">
                      <div>
                        <div className="font-semibold mb-1">✓ No Risk</div>
                        <div>Guaranteed by the U.S. Government</div>
                      </div>
                      <div>
                        <div className="font-semibold mb-1">✓ No Volatility</div>
                        <div>Your benefit is locked in, not market-dependent</div>
                      </div>
                      <div>
                        <div className="font-semibold mb-1">✓ For Life</div>
                        <div>Increases last your entire retirement</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex justify-center gap-4">
              <button
                onClick={onClose}
                className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
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
