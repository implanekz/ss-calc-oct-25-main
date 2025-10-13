import React, { useState } from 'react';
import ShowMeTheMoneyCalculator from './components/ShowMeTheMoneyCalculator.jsx';
import DivorcedCalculator from './components/DivorcedCalculator.jsx';
import WidowCalculator from './components/WidowCalculator.jsx';
import PIACalculator from './components/PIACalculator.jsx';
import RetirementSpendingApp from './components/helperApps/RetirementSpendingApp.jsx';
import RetirementIncomeNeedsApp from './components/helperApps/RetirementIncomeNeedsApp.jsx';
import SequenceOfReturnsApp from './components/helperApps/SequenceOfReturnsApp.jsx';
import RetirementBudgetWorksheet from './components/helperApps/RetirementBudgetWorksheet.jsx';

function App() {
  const [activeApp, setActiveApp] = useState('ss');
  const [calculatorType, setCalculatorType] = useState('married'); // married, divorced, widowed

  const calculatorTypes = [
    { id: 'married', label: 'Married/Single', icon: '👫' },
    { id: 'divorced', label: 'Divorced', icon: '💔' },
    { id: 'widowed', label: 'Widowed', icon: '🕊️' }, // Now available!
  ];

  const navItems = [
    { id: 'ss', label: 'Social Security Planner', icon: '💰' },
    { id: 'pia', label: 'PIA Calculator', icon: '🧮' },
    { id: 'helper-spending', label: 'Longevity Spending', icon: '📉' },
    { id: 'helper-income', label: 'Income Target', icon: '🎯' },
    { id: 'sequence', label: 'Sequence of Returns', icon: '📈' },
    { id: 'budget', label: 'Budget Worksheet', icon: '💵' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Navigation Bar */}
      <nav className="bg-gradient-to-r from-slate-900 to-slate-800 shadow-lg sticky top-0 z-50 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand */}
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-2xl">💼</span>
                <span className="hidden sm:inline">SS K.I.N.D. Platform</span>
                <span className="sm:hidden">SS Platform</span>
              </h1>
            </div>

            {/* Navigation Items */}
            <div className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide items-center flex-nowrap">
              {/* Calculator Type Dropdown - Only show when SS is active */}
              {activeApp === 'ss' && (
                <div className="flex flex-col items-start">
                  <select
                    value={calculatorType}
                    onChange={(e) => setCalculatorType(e.target.value)}
                    className="px-3 py-2 bg-slate-700 text-slate-200 rounded-full font-semibold text-sm border border-slate-600 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {calculatorTypes.map((type) => (
                      <option key={type.id} value={type.id} disabled={type.disabled}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>

                  {/* Simple guidance - only shows when SS is active */}
                  <details className="text-xs text-slate-300 mt-1 cursor-pointer">
                    <summary className="hover:text-white list-none flex items-center gap-1">
                      <span className="text-[10px]">💡</span> Need help choosing?
                    </summary>
                    <div className="absolute mt-2 p-3 bg-slate-800 rounded-lg shadow-xl border border-slate-600 z-50 w-64">
                      <p className="text-slate-200 font-semibold mb-2">Quick guide:</p>
                      <ul className="space-y-1.5 text-slate-400">
                        <li className="flex items-start gap-2">
                          <span className="text-slate-500">•</span>
                          <span><strong className="text-slate-300">Married or single?</strong> → Married/Single</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-slate-500">•</span>
                          <span><strong className="text-slate-300">Divorced (ex-spouse alive)?</strong> → Divorced</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-slate-500">•</span>
                          <span><strong className="text-slate-300">Divorced (ex-spouse deceased)?</strong> → Widowed</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-slate-500">•</span>
                          <span><strong className="text-slate-300">Widowed?</strong> → Widowed</span>
                        </li>
                      </ul>
                      <p className="text-[10px] text-slate-500 mt-2 italic">
                        Tip: If ex-spouse is deceased, you may qualify for survivor benefits (not ex-spouse benefits)
                      </p>
                    </div>
                  </details>
                </div>
              )}

              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveApp(item.id)}
                  className={`
                    px-3 sm:px-4 py-2 rounded-full font-semibold text-sm transition-all duration-200 whitespace-nowrap
                    ${activeApp === item.id
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 scale-105'
                      : 'bg-slate-700 text-slate-200 hover:bg-slate-600 hover:text-white'
                    }
                  `}
                  aria-label={item.label}
                  aria-current={activeApp === item.id ? 'page' : undefined}
                >
                  <span className="sm:hidden">{item.icon}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="animate-fade-in">
        {activeApp === 'ss' && (
          <>
            {calculatorType === 'married' && <ShowMeTheMoneyCalculator />}
            {calculatorType === 'divorced' && <DivorcedCalculator onSwitchToMarried={() => setCalculatorType('married')} />}
            {calculatorType === 'widowed' && <WidowCalculator />}
          </>
        )}
        {activeApp === 'pia' && <PIACalculator />}
        {activeApp === 'helper-spending' && <RetirementSpendingApp />}
        {activeApp === 'helper-income' && <RetirementIncomeNeedsApp />}
        {activeApp === 'sequence' && <SequenceOfReturnsApp />}
        {activeApp === 'budget' && <RetirementBudgetWorksheet />}
      </main>
    </div>
  );
}

export default App;
