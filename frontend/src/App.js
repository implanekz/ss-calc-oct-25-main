import React, { useState } from 'react';
import ShowMeTheMoneyCalculator from './components/ShowMeTheMoneyCalculator.jsx';
import RetirementSpendingApp from './components/helperApps/RetirementSpendingApp.jsx';
import RetirementIncomeNeedsApp from './components/helperApps/RetirementIncomeNeedsApp.jsx';
import SequenceOfReturnsApp from './components/helperApps/SequenceOfReturnsApp.jsx';

function App() {
  const [activeApp, setActiveApp] = useState('ss');

  const navItems = [
    { id: 'ss', label: 'Social Security Planner', icon: '💰' },
    { id: 'helper-spending', label: 'Longevity Spending', icon: '📊' },
    { id: 'helper-income', label: 'Income Target', icon: '🎯' },
    { id: 'sequence', label: 'Sequence of Returns', icon: '📈' },
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
            <div className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide">
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
        {activeApp === 'ss' && <ShowMeTheMoneyCalculator />}
        {activeApp === 'helper-spending' && <RetirementSpendingApp />}
        {activeApp === 'helper-income' && <RetirementIncomeNeedsApp />}
        {activeApp === 'sequence' && <SequenceOfReturnsApp />}
      </main>
    </div>
  );
}

export default App;
