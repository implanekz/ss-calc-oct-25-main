import React, { useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import ShowMeTheMoneyCalculator from './ShowMeTheMoneyCalculator.jsx';
import DivorcedCalculator from './DivorcedCalculator.jsx';
import SSDICalculator from './SSDICalculator.jsx';
import WidowCalculator from './WidowCalculator.jsx';
import PIACalculator from './PIACalculator.jsx';
import Settings from './Settings.jsx';
import RetirementSpendingApp from './helperApps/RetirementSpendingApp.jsx';
import RetirementIncomeNeedsApp from './helperApps/RetirementIncomeNeedsApp.jsx';
import SequenceOfReturnsApp from './helperApps/SequenceOfReturnsApp.jsx';
import RetirementBudgetWorksheet from './helperApps/RetirementBudgetWorksheet.jsx';
import StartStopStartCalculator from './StartStopStartCalculator.jsx';
import LifeExpectancyCalculator from './LifeExpectancyCalculator.jsx';

function CalculatorApp() {
  const [activeApp, setActiveApp] = useState('ss');
  const [calculatorType, setCalculatorType] = useState('married');
  const [showHelpDropdown, setShowHelpDropdown] = useState(false);

  const calculatorTypes = [
    { id: 'married', label: 'Married/Single', icon: '👫' },
    { id: 'divorced', label: 'Divorced', icon: '💔' },
    { id: 'widowed', label: 'Widowed', icon: '🕊️' },
    { id: 'ssdi', label: 'Disability', icon: '♿' },
  ];

  const navItems = [
    { id: 'ss', label: 'Social Security Planner', icon: '💰' },
  ];

  return (
    <Routes>
      <Route path="/settings" element={<Settings />} />
      <Route path="/pia-calculator" element={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
          <nav className="shadow-md sticky top-0 z-50 border-b border-yellow-200" style={{ backgroundColor: '#FFF8DD' }}>
            <div className="px-6 sm:px-10 lg:px-16">
              <div className="flex items-center py-3">
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <img src="/assets/logos/Ret1re Logo.png" alt="Ret1re Logo" className="h-8 sm:h-10 lg:h-14 w-auto" />
                  <span className="hidden lg:inline text-slate-300 text-2xl font-light">|</span>
                  <p className="hidden lg:block text-lg font-semibold text-slate-600 italic whitespace-nowrap">
                    Income is the #1 outcome that matters!
                  </p>
                </div>
                <div className="flex-1 min-w-[8px] sm:min-w-[16px]" />
                <div className="flex-shrink-0">
                  <h1 className="text-xl sm:text-3xl lg:text-5xl font-bold text-slate-800 whitespace-nowrap">
                    Lifelong Navigator
                  </h1>
                </div>
                <div className="flex-1 min-w-[8px] sm:min-w-[16px]" />
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <Link
                    to="/"
                    className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-full font-semibold text-sm hover:from-primary-600 hover:to-primary-700 shadow-lg transition-all whitespace-nowrap"
                  >
                    💰 Social Security Calculator
                  </Link>
                </div>
              </div>
            </div>
          </nav>
          <main className="animate-fade-in">
            <PIACalculator />
          </main>
        </div>
      } />
      <Route path="/sequence-risk" element={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
          <nav className="shadow-md sticky top-0 z-50 border-b border-yellow-200" style={{ backgroundColor: '#FFF8DD' }}>
            <div className="px-6 sm:px-10 lg:px-16">
              <div className="flex items-center py-3">
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <img src="/assets/logos/Ret1re Logo.png" alt="Ret1re Logo" className="h-8 sm:h-10 lg:h-14 w-auto" />
                  <span className="hidden lg:inline text-slate-300 text-2xl font-light">|</span>
                  <p className="hidden lg:block text-lg font-semibold text-slate-600 italic whitespace-nowrap">
                    Income is the #1 outcome that matters!
                  </p>
                </div>
                <div className="flex-1 min-w-[8px] sm:min-w-[16px]" />
                <div className="flex-shrink-0">
                  <h1 className="text-xl sm:text-3xl lg:text-5xl font-bold text-slate-800 whitespace-nowrap">
                    Lifelong Navigator
                  </h1>
                </div>
                <div className="flex-1 min-w-[8px] sm:min-w-[16px]" />
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <Link
                    to="/"
                    className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-full font-semibold text-sm hover:from-primary-600 hover:to-primary-700 shadow-lg transition-all whitespace-nowrap"
                  >
                    💰 Social Security Calculator
                  </Link>
                </div>
              </div>
            </div>
          </nav>
          <main className="animate-fade-in">
            <SequenceOfReturnsApp />
          </main>
        </div>
      } />
      <Route path="/longevity-spending" element={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
          <nav className="shadow-md sticky top-0 z-50 border-b border-yellow-200" style={{ backgroundColor: '#FFF8DD' }}>
            <div className="px-6 sm:px-10 lg:px-16">
              <div className="flex items-center py-3">
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <img src="/assets/logos/Ret1re Logo.png" alt="Ret1re Logo" className="h-8 sm:h-10 lg:h-14 w-auto" />
                  <span className="hidden lg:inline text-slate-300 text-2xl font-light">|</span>
                  <p className="hidden lg:block text-lg font-semibold text-slate-600 italic whitespace-nowrap">
                    Income is the #1 outcome that matters!
                  </p>
                </div>
                <div className="flex-1 min-w-[8px] sm:min-w-[16px]" />
                <div className="flex-shrink-0">
                  <h1 className="text-xl sm:text-3xl lg:text-5xl font-bold text-slate-800 whitespace-nowrap">
                    Lifelong Navigator
                  </h1>
                </div>
                <div className="flex-1 min-w-[8px] sm:min-w-[16px]" />
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <Link
                    to="/"
                    className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-full font-semibold text-sm hover:from-primary-600 hover:to-primary-700 shadow-lg transition-all whitespace-nowrap"
                  >
                    💰 Social Security Calculator
                  </Link>
                </div>
              </div>
            </div>
          </nav>
          <main className="animate-fade-in">
            <RetirementSpendingApp />
          </main>
        </div>
      } />
      <Route path="/income-target" element={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
          <nav className="shadow-md sticky top-0 z-50 border-b border-yellow-200" style={{ backgroundColor: '#FFF8DD' }}>
            <div className="px-6 sm:px-10 lg:px-16">
              <div className="flex items-center py-3">
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <img src="/assets/logos/Ret1re Logo.png" alt="Ret1re Logo" className="h-8 sm:h-10 lg:h-14 w-auto" />
                  <span className="hidden lg:inline text-slate-300 text-2xl font-light">|</span>
                  <p className="hidden lg:block text-lg font-semibold text-slate-600 italic whitespace-nowrap">
                    Income is the #1 outcome that matters!
                  </p>
                </div>
                <div className="flex-1 min-w-[8px] sm:min-w-[16px]" />
                <div className="flex-shrink-0">
                  <h1 className="text-xl sm:text-3xl lg:text-5xl font-bold text-slate-800 whitespace-nowrap">
                    Lifelong Navigator
                  </h1>
                </div>
                <div className="flex-1 min-w-[8px] sm:min-w-[16px]" />
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <Link
                    to="/"
                    className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-full font-semibold text-sm hover:from-primary-600 hover:to-primary-700 shadow-lg transition-all whitespace-nowrap"
                  >
                    💰 Social Security Calculator
                  </Link>
                </div>
              </div>
            </div>
          </nav>
          <main className="animate-fade-in">
            <RetirementIncomeNeedsApp />
          </main>
        </div>
      } />
      <Route path="/budget-worksheet" element={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
          <nav className="shadow-md sticky top-0 z-50 border-b border-yellow-200" style={{ backgroundColor: '#FFF8DD' }}>
            <div className="px-6 sm:px-10 lg:px-16">
              <div className="flex items-center py-3">
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <img src="/assets/logos/Ret1re Logo.png" alt="Ret1re Logo" className="h-8 sm:h-10 lg:h-14 w-auto" />
                  <span className="hidden lg:inline text-slate-300 text-2xl font-light">|</span>
                  <p className="hidden lg:block text-lg font-semibold text-slate-600 italic whitespace-nowrap">
                    Income is the #1 outcome that matters!
                  </p>
                </div>
                <div className="flex-1 min-w-[8px] sm:min-w-[16px]" />
                <div className="flex-shrink-0">
                  <h1 className="text-xl sm:text-3xl lg:text-5xl font-bold text-slate-800 whitespace-nowrap">
                    Lifelong Navigator
                  </h1>
                </div>
                <div className="flex-1 min-w-[8px] sm:min-w-[16px]" />
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <Link
                    to="/"
                    className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-full font-semibold text-sm hover:from-primary-600 hover:to-primary-700 shadow-lg transition-all whitespace-nowrap"
                  >
                    💰 Social Security Calculator
                  </Link>
                </div>
              </div>
            </div>
          </nav>
          <main className="animate-fade-in">
            <RetirementBudgetWorksheet />
          </main>
        </div>
      } />
      <Route path="/start-stop-start" element={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
          <nav className="shadow-md sticky top-0 z-50 border-b border-yellow-200" style={{ backgroundColor: '#FFF8DD' }}>
            <div className="px-6 sm:px-10 lg:px-16">
              <div className="flex items-center py-3">
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <img src="/assets/logos/Ret1re Logo.png" alt="Ret1re Logo" className="h-8 sm:h-10 lg:h-14 w-auto" />
                  <span className="hidden lg:inline text-slate-300 text-2xl font-light">|</span>
                  <p className="hidden lg:block text-lg font-semibold text-slate-600 italic whitespace-nowrap">
                    Income is the #1 outcome that matters!
                  </p>
                </div>
                <div className="flex-1 min-w-[8px] sm:min-w-[16px]" />
                <div className="flex-shrink-0">
                  <h1 className="text-xl sm:text-3xl lg:text-5xl font-bold text-slate-800 whitespace-nowrap">
                    Lifelong Navigator
                  </h1>
                </div>
                <div className="flex-1 min-w-[8px] sm:min-w-[16px]" />
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <Link
                    to="/"
                    className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-full font-semibold text-sm hover:from-primary-600 hover:to-primary-700 shadow-lg transition-all whitespace-nowrap"
                  >
                    💰 Social Security Calculator
                  </Link>
                </div>
              </div>
            </div>
          </nav>
          <main className="animate-fade-in">
            <StartStopStartCalculator />
          </main>
        </div>
      } />
      <Route path="/life-expectancy" element={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
          <nav className="shadow-md sticky top-0 z-50 border-b border-yellow-200" style={{ backgroundColor: '#FFF8DD' }}>
            <div className="px-6 sm:px-10 lg:px-16">
              <div className="flex items-center py-3">
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <img src="/assets/logos/Ret1re Logo.png" alt="Ret1re Logo" className="h-8 sm:h-10 lg:h-14 w-auto" />
                  <span className="hidden lg:inline text-slate-300 text-2xl font-light">|</span>
                  <p className="hidden lg:block text-lg font-semibold text-slate-600 italic whitespace-nowrap">
                    Income is the #1 outcome that matters!
                  </p>
                </div>
                <div className="flex-1 min-w-[8px] sm:min-w-[16px]" />
                <div className="flex-shrink-0">
                  <h1 className="text-xl sm:text-3xl lg:text-5xl font-bold text-slate-800 whitespace-nowrap">
                    Lifelong Navigator
                  </h1>
                </div>
                <div className="flex-1 min-w-[8px] sm:min-w-[16px]" />
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <Link
                    to="/"
                    className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-full font-semibold text-sm hover:from-primary-600 hover:to-primary-700 shadow-lg transition-all whitespace-nowrap"
                  >
                    💰 Social Security Calculator
                  </Link>
                </div>
              </div>
            </div>
          </nav>
          <main className="animate-fade-in">
            <LifeExpectancyCalculator />
          </main>
        </div>
      } />
      <Route path="/*" element={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
          {/* Navigation Bar */}
          <nav className="shadow-md sticky top-0 z-50 border-b border-yellow-200" style={{ backgroundColor: '#FFF8DD' }}>
            <div className="px-6 sm:px-10 lg:px-16">
              <div className="flex items-center py-3">
                {/* Logo and Tagline - Far left */}
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <img
                    src="/assets/logos/Ret1re Logo.png"
                    alt="Ret1re Logo"
                    className="h-8 sm:h-10 lg:h-14 w-auto"
                  />
                  <span className="hidden lg:inline text-slate-300 text-2xl font-light">|</span>
                  <p className="hidden lg:block text-lg font-semibold text-slate-600 italic whitespace-nowrap">
                    Income is the #1 outcome that matters!
                  </p>
                </div>

                {/* Equal spacer */}
                <div className="flex-1 min-w-[8px] sm:min-w-[16px]" />

                {/* Lifelong Navigator - Center */}
                <div className="flex-shrink-0">
                  <h1 className="text-xl sm:text-3xl lg:text-5xl font-bold text-slate-800 whitespace-nowrap">
                    Lifelong Navigator
                  </h1>
                </div>

                {/* Equal spacer */}
                <div className="flex-1 min-w-[8px] sm:min-w-[16px]" />

                {/* Navigation Items - Right side */}
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  {/* Social Security Planner Button */}
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveApp(item.id)}
                      className={`
                    px-3 sm:px-4 py-2 rounded-full font-semibold text-sm transition-all duration-200 whitespace-nowrap
                    ${activeApp === item.id
                          ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 scale-105'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300 hover:text-slate-900'
                        }
                  `}
                      aria-label={item.label}
                      aria-current={activeApp === item.id ? 'page' : undefined}
                    >
                      <span className="sm:hidden">{item.icon}</span>
                      <span className="hidden sm:inline">{item.label}</span>
                    </button>
                  ))}

                  {/* Calculator Type Dropdown - Only show when SS is active */}
                  {activeApp === 'ss' && (
                    <>
                      <select
                        value={calculatorType}
                        onChange={(e) => setCalculatorType(e.target.value)}
                        className="px-3 py-2 bg-white text-slate-700 rounded-full font-semibold text-sm border border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {calculatorTypes.map((type) => (
                          <option key={type.id} value={type.id} disabled={type.disabled}>
                            {type.icon} {type.label}
                          </option>
                        ))}
                      </select>

                      {/* Simple guidance - only shows when SS is active */}
                      <button
                        onClick={() => setShowHelpDropdown(!showHelpDropdown)}
                        className="text-sm text-slate-700 font-medium hover:text-slate-900 flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors"
                      >
                        <span className="text-sm">💡</span> Need help choosing?
                      </button>
                    </>
                  )}
                </div>
              </div>
              {/* Tagline on mobile - shown below on small screens */}
              <div className="sm:hidden pb-2">
                <p className="text-xs font-semibold text-slate-700 italic text-center">
                  Income is the #1 outcome that matters!
                </p>
              </div>
            </div>
          </nav>

          {/* Help Modal - Centered floating modal */}
          {showHelpDropdown && (
            <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setShowHelpDropdown(false)}
              />
              {/* Modal Content */}
              <div className="relative bg-slate-800 rounded-xl shadow-2xl border border-slate-600 p-6 w-full max-w-md animate-fade-in">
                <button
                  onClick={() => setShowHelpDropdown(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
                >
                  ✕
                </button>
                <h3 className="text-xl font-bold text-slate-200 mb-4">💡 Calculator Selection Guide</h3>
                <div className="space-y-3">
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <p className="text-slate-300 font-semibold mb-1">Married or single?</p>
                    <p className="text-slate-400 text-sm">→ Use <strong className="text-white">Married/Single</strong> calculator</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <p className="text-slate-300 font-semibold mb-1">Divorced (ex-spouse alive)?</p>
                    <p className="text-slate-400 text-sm">→ Use <strong className="text-white">Divorced</strong> calculator</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <p className="text-slate-300 font-semibold mb-1">Divorced (ex-spouse deceased)?</p>
                    <p className="text-slate-400 text-sm">→ Use <strong className="text-white">Widowed</strong> calculator</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <p className="text-slate-300 font-semibold mb-1">Widowed?</p>
                    <p className="text-slate-400 text-sm">→ Use <strong className="text-white">Widowed</strong> calculator</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <p className="text-slate-300 font-semibold mb-1">Considering Disability (SSDI)?</p>
                    <p className="text-slate-400 text-sm">→ Use <strong className="text-white">Disability</strong> calculator</p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg">
                  <p className="text-xs text-blue-200 italic">
                    💡 Tip: If your ex-spouse is deceased, you may qualify for survivor benefits (not ex-spouse benefits)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <main className="animate-fade-in">
            {activeApp === 'ss' && (
              <>
                {calculatorType === 'married' && <ShowMeTheMoneyCalculator />}
                {calculatorType === 'divorced' && <DivorcedCalculator onSwitchToMarried={() => setCalculatorType('married')} />}
                {calculatorType === 'widowed' && <WidowCalculator />}
                {calculatorType === 'ssdi' && <SSDICalculator />}
              </>
            )}
            {activeApp === 'start-stop-start' && <StartStopStartCalculator />}
            {activeApp === 'pia' && <PIACalculator />}
            {activeApp === 'helper-spending' && <RetirementSpendingApp />}
            {activeApp === 'helper-income' && <RetirementIncomeNeedsApp />}
            {activeApp === 'sequence' && <SequenceOfReturnsApp />}
            {activeApp === 'budget' && <RetirementBudgetWorksheet />}
          </main>
        </div>
      } />
    </Routes>
  );
}

export default CalculatorApp;
