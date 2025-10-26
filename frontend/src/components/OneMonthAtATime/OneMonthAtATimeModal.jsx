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
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);
  const [showOnlyPrimary, setShowOnlyPrimary] = useState(!isMarried);

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

  // Only include spouse if married AND not in "show only primary" mode
  const includeSpouse = isMarried && !showOnlyPrimary;
  const spouseBaseline = includeSpouse ? spouseCalcs.getBenefitForAge(62, 0) : 0;
  const spouseCurrent = includeSpouse ? spouseCalcs.getBenefitForAge(spouseAge, spouseMonths) : 0;
  const spouseMax = includeSpouse ? spouseCalcs.getBenefitForAge(70, 0) : 0;

  // Combined totals (will be just primary if showOnlyPrimary is true)
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
  const spouseCumulativeIncome = includeSpouse ? calculateCumulativeIncome(spouseCurrent, spouseAge, spouseMonths, longevityAge) : 0;
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

                  {/* Marital Status Toggle */}
                  <div className="mt-3 pt-2 border-t border-blue-200">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={showOnlyPrimary}
                        onChange={(e) => setShowOnlyPrimary(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span 
                        className="text-xs font-medium text-gray-700 group-hover:text-blue-700 transition-colors"
                        title="This setting can also be changed in the Settings section"
                      >
                        {showOnlyPrimary ? 'Show only this person' : 'Include spouse in calculations'}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Spouse Section (if married and not hidden) */}
                {isMarried && !showOnlyPrimary && (
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

            {/* Action Buttons */}
            <div className="mt-6 flex justify-center gap-4">
              <button
                onClick={() => setShowFormulaInfo(true)}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                How SSA Calculates Benefits
              </button>
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

      {/* Formula Info Modal (Nested) */}
      {showFormulaInfo && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black bg-opacity-70 transition-opacity"
            onClick={() => setShowFormulaInfo(false)}
          />
          
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
              {/* Close Button */}
              <button
                onClick={() => setShowFormulaInfo(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="p-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  How Social Security Calculates Early & Delayed Benefits
                </h2>
                <p className="text-gray-600 mb-6">
                  Understanding the SSA formulas helps you make informed filing decisions
                </p>

                {/* Visual Graph */}
                <div className="mb-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border-2 border-blue-200">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">
                    Benefit Adjustment by Filing Age
                  </h3>
                  
                  {/* SVG Bar Chart with Zone Backgrounds */}
                  <svg viewBox="0 0 800 420" className="w-full h-auto">
                    {/* Zone Background Shading */}
                    {/* Early Filing Penalty Zone (62-66) */}
                    <rect x="100" y="40" width="320" height="305" fill="#FEE2E2" opacity="0.5" rx="8" />
                    
                    {/* FRA Zone (67) */}
                    <rect x="340" y="40" width="120" height="305" fill="#E5E7EB" opacity="0.5" rx="8" />
                    
                    {/* Delayed Credit Zone (68-70) */}
                    <rect x="480" y="40" width="220" height="305" fill="#D1FAE5" opacity="0.5" rx="8" />
                    
                    {/* Zone Labels */}
                    <text x="260" y="25" fontSize="13" fontWeight="700" textAnchor="middle" fill="#B91C1C">Early Filing Penalty Zone</text>
                    <text x="400" y="25" fontSize="13" fontWeight="700" textAnchor="middle" fill="#6B7280">FRA</text>
                    <text x="590" y="25" fontSize="13" fontWeight="700" textAnchor="middle" fill="#047857">Delayed Credit Zone</text>
                    
                    {/* Horizontal baseline at 100% */}
                    <line x1="100" y1="200" x2="700" y2="200" stroke="#6B7280" strokeWidth="2" strokeDasharray="5,5" />
                    <text x="50" y="205" fontSize="14" fill="#6B7280" fontWeight="600">100%</text>
                    
                    {/* Age 62 - Red bar */}
                    <rect x="120" y="200" width="50" height="120" fill="#EF4444" rx="4" />
                    <text x="145" y="335" fontSize="14" fontWeight="600" textAnchor="middle" fill="#1F2937">62</text>
                    <text x="145" y="315" fontSize="15" fontWeight="700" textAnchor="middle" fill="#DC2626">70%</text>
                    
                    {/* Age 63 */}
                    <rect x="180" y="200" width="50" height="100" fill="#F87171" rx="4" />
                    <text x="205" y="335" fontSize="14" fontWeight="600" textAnchor="middle" fill="#1F2937">63</text>
                    <text x="205" y="310" fontSize="14" fontWeight="600" textAnchor="middle" fill="#DC2626">75%</text>
                    
                    {/* Age 64 */}
                    <rect x="240" y="200" width="50" height="80" fill="#FCA5A5" rx="4" />
                    <text x="265" y="335" fontSize="14" fontWeight="600" textAnchor="middle" fill="#1F2937">64</text>
                    <text x="265" y="295" fontSize="14" fontWeight="600" textAnchor="middle" fill="#DC2626">80%</text>
                    
                    {/* Age 65 */}
                    <rect x="300" y="200" width="50" height="53" fill="#FED7AA" rx="4" />
                    <text x="325" y="335" fontSize="14" fontWeight="600" textAnchor="middle" fill="#1F2937">65</text>
                    <text x="325" y="268" fontSize="13" fontWeight="600" textAnchor="middle" fill="#C2410C">86.7%</text>
                    
                    {/* Age 66 */}
                    <rect x="360" y="200" width="50" height="27" fill="#FDBA74" rx="4" />
                    <text x="385" y="335" fontSize="14" fontWeight="600" textAnchor="middle" fill="#1F2937">66</text>
                    <text x="385" y="245" fontSize="13" fontWeight="600" textAnchor="middle" fill="#C2410C">93.3%</text>
                    
                    {/* Age 67 - Gray bar (baseline) - FRA */}
                    <rect x="420" y="195" width="50" height="10" fill="#6B7280" rx="4" />
                    <text x="445" y="335" fontSize="15" fontWeight="700" textAnchor="middle" fill="#1F2937">67</text>
                    <text x="445" y="180" fontSize="16" fontWeight="700" textAnchor="middle" fill="#374151">100%</text>
                    <text x="445" y="162" fontSize="12" fontWeight="600" textAnchor="middle" fill="#4B5563">FRA</text>
                    
                    {/* Age 68 - Light green bar */}
                    <rect x="500" y="136" width="50" height="64" fill="#86EFAC" rx="4" />
                    <text x="525" y="335" fontSize="14" fontWeight="600" textAnchor="middle" fill="#1F2937">68</text>
                    <text x="525" y="120" fontSize="14" fontWeight="600" textAnchor="middle" fill="#059669">108%</text>
                    
                    {/* Age 69 */}
                    <rect x="560" y="104" width="50" height="96" fill="#6EE7B7" rx="4" />
                    <text x="585" y="335" fontSize="14" fontWeight="600" textAnchor="middle" fill="#1F2937">69</text>
                    <text x="585" y="88" fontSize="14" fontWeight="600" textAnchor="middle" fill="#047857">116%</text>
                    
                    {/* Age 70 - Green bar */}
                    <rect x="620" y="72" width="50" height="128" fill="#10B981" rx="4" />
                    <text x="645" y="335" fontSize="15" fontWeight="700" textAnchor="middle" fill="#1F2937">70</text>
                    <text x="645" y="56" fontSize="16" fontWeight="700" textAnchor="middle" fill="#047857">124%</text>
                    
                    {/* Bottom label */}
                    <text x="400" y="365" fontSize="16" fontWeight="600" textAnchor="middle" fill="#374151">Filing Age</text>
                    
                    {/* Extreme labels */}
                    <text x="145" y="295" fontSize="11" textAnchor="middle" fill="#7F1D1D">-30%</text>
                    <text x="645" y="40" fontSize="11" textAnchor="middle" fill="#065F46">+24%</text>
                  </svg>

                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <div className="font-semibold text-red-900 mb-1">Early Filing Penalty</div>
                      <div className="text-red-700 text-xs">Up to 30% reduction at age 62</div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded p-3">
                      <div className="font-semibold text-green-900 mb-1">Delayed Credits</div>
                      <div className="text-green-700 text-xs">Up to 24% increase at age 70</div>
                    </div>
                  </div>
                </div>

                {/* SSA Formulas */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">The Official SSA Formulas</h3>
                  
                  <div className="space-y-4">
                    {/* Early Filing */}
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                      <h4 className="font-bold text-red-900 mb-2">Early Filing (Before FRA)</h4>
                      <div className="space-y-2 text-sm text-gray-700">
                        <p><strong>First 36 months early:</strong> <span className="font-mono bg-white px-2 py-1 rounded">5/9 of 1% per month</span> (≈0.556%)</p>
                        <p><strong>Each month beyond 36:</strong> <span className="font-mono bg-white px-2 py-1 rounded">5/12 of 1% per month</span> (≈0.417%)</p>
                        <p className="mt-2 text-xs italic">Example: Filing at 62 (60 months early for FRA 67) = 30% reduction</p>
                      </div>
                    </div>

                    {/* Delayed Credits */}
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                      <h4 className="font-bold text-green-900 mb-2">Delayed Retirement Credits (After FRA)</h4>
                      <div className="space-y-2 text-sm text-gray-700">
                        <p><strong>For each month delayed:</strong> <span className="font-mono bg-white px-2 py-1 rounded">2/3 of 1% per month</span> = <span className="font-semibold">8% per year</span></p>
                        <p><strong>Maximum:</strong> Credits stop at age 70 (no benefit to waiting beyond 70)</p>
                        <p className="mt-2 text-xs italic">Example: Waiting until 70 (36 months after FRA 67) = 24% increase</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary Table */}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Benefit Amounts by Filing Age (FRA = 67)</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-300 border border-gray-300 rounded-lg overflow-hidden">
                      <thead className="bg-gradient-to-r from-blue-600 to-indigo-600">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-bold text-white">Filing Age</th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-white">Adjustment</th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-white">% of FRA Benefit</th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-white">If FRA = $1,000</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        <tr className="bg-red-50 hover:bg-red-100 transition-colors">
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">62</td>
                          <td className="px-4 py-3 text-sm text-red-700 font-semibold">-30%</td>
                          <td className="px-4 py-3 text-sm font-bold text-red-900">70%</td>
                          <td className="px-4 py-3 text-sm font-mono text-red-900">$700</td>
                        </tr>
                        <tr className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">63</td>
                          <td className="px-4 py-3 text-sm text-red-600">-25%</td>
                          <td className="px-4 py-3 text-sm font-bold text-red-800">75%</td>
                          <td className="px-4 py-3 text-sm font-mono text-red-800">$750</td>
                        </tr>
                        <tr className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">64</td>
                          <td className="px-4 py-3 text-sm text-red-600">-20%</td>
                          <td className="px-4 py-3 text-sm font-bold text-red-700">80%</td>
                          <td className="px-4 py-3 text-sm font-mono text-red-700">$800</td>
                        </tr>
                        <tr className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">65</td>
                          <td className="px-4 py-3 text-sm text-orange-600">-13.3%</td>
                          <td className="px-4 py-3 text-sm font-bold text-orange-700">86.7%</td>
                          <td className="px-4 py-3 text-sm font-mono text-orange-700">$867</td>
                        </tr>
                        <tr className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">66</td>
                          <td className="px-4 py-3 text-sm text-orange-600">-6.7%</td>
                          <td className="px-4 py-3 text-sm font-bold text-orange-600">93.3%</td>
                          <td className="px-4 py-3 text-sm font-mono text-orange-600">$933</td>
                        </tr>
                        <tr className="bg-blue-100 hover:bg-blue-200 transition-colors">
                          <td className="px-4 py-3 text-sm font-bold text-blue-900">67 (FRA)</td>
                          <td className="px-4 py-3 text-sm text-blue-900 font-semibold">No change</td>
                          <td className="px-4 py-3 text-sm font-bold text-blue-900">100%</td>
                          <td className="px-4 py-3 text-sm font-mono font-bold text-blue-900">$1,000</td>
                        </tr>
                        <tr className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">68</td>
                          <td className="px-4 py-3 text-sm text-green-600">+8%</td>
                          <td className="px-4 py-3 text-sm font-bold text-green-700">108%</td>
                          <td className="px-4 py-3 text-sm font-mono text-green-700">$1,080</td>
                        </tr>
                        <tr className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">69</td>
                          <td className="px-4 py-3 text-sm text-green-600">+16%</td>
                          <td className="px-4 py-3 text-sm font-bold text-green-700">116%</td>
                          <td className="px-4 py-3 text-sm font-mono text-green-700">$1,160</td>
                        </tr>
                        <tr className="bg-green-50 hover:bg-green-100 transition-colors">
                          <td className="px-4 py-3 text-sm font-bold text-green-900">70</td>
                          <td className="px-4 py-3 text-sm text-green-700 font-semibold">+24%</td>
                          <td className="px-4 py-3 text-sm font-bold text-green-900">124%</td>
                          <td className="px-4 py-3 text-sm font-mono font-bold text-green-900">$1,240</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Key Takeaways */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-blue-900 mb-3">💡 Key Takeaways</h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold mt-0.5">•</span>
                      <span><strong>Early filing penalty is permanent</strong> - reduces benefits by up to 30% for life</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold mt-0.5">•</span>
                      <span><strong>Delayed credits are also permanent</strong> - increases benefits by up to 24% for life</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold mt-0.5">•</span>
                      <span><strong>No benefit to waiting past 70</strong> - delayed credits stop accumulating at age 70</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold mt-0.5">•</span>
                      <span><strong>These are monthly calculations</strong> - even one month makes a difference!</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold mt-0.5">•</span>
                      <span><strong>COLA adjustments apply on top</strong> - these percentages show the base adjustment, then annual cost-of-living increases are added to your benefit amount</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => setShowFormulaInfo(false)}
                    className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                  >
                    Got It!
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OneMonthAtATimeModal;
