import React, { useState } from 'react';
import ShowMeTheMoneyCalculator from './components/ShowMeTheMoneyCalculator.jsx';
import RetirementSpendingApp from './components/helperApps/RetirementSpendingApp.jsx';
import RetirementIncomeNeedsApp from './components/helperApps/RetirementIncomeNeedsApp.jsx';
import SequenceOfReturnsApp from './components/helperApps/SequenceOfReturnsApp.jsx';

function App() {
  const [activeApp, setActiveApp] = useState('ss');

  return (
    <div className="App" style={{ minHeight: '100vh', background: '#e2e8f0' }}>
      <nav style={{
        display: 'flex',
        gap: '12px',
        padding: '16px 24px',
        background: '#0f172a',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
      >
        <button
          type="button"
          onClick={() => setActiveApp('ss')}
          style={{
            padding: '10px 18px',
            borderRadius: '999px',
            border: '1px solid transparent',
            background: activeApp === 'ss' ? '#38bdf8' : '#1e293b',
            color: '#f8fafc',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Social Security Planner
        </button>
        <button
          type="button"
          onClick={() => setActiveApp('helper-spending')}
          style={{
            padding: '10px 18px',
            borderRadius: '999px',
            border: '1px solid transparent',
            background: activeApp === 'helper-spending' ? '#38bdf8' : '#1e293b',
            color: '#f8fafc',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Longevity Spending
        </button>
        <button
          type="button"
          onClick={() => setActiveApp('helper-income')}
          style={{
            padding: '10px 18px',
            borderRadius: '999px',
            border: '1px solid transparent',
            background: activeApp === 'helper-income' ? '#38bdf8' : '#1e293b',
            color: '#f8fafc',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Income Target
        </button>
        <button
          type="button"
          onClick={() => setActiveApp('sequence')}
          style={{
            padding: '10px 18px',
            borderRadius: '999px',
            border: '1px solid transparent',
            background: activeApp === 'sequence' ? '#38bdf8' : '#1e293b',
            color: '#f8fafc',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Sequence of Returns
        </button>
      </nav>

      {activeApp === 'ss' && <ShowMeTheMoneyCalculator />}
      {activeApp === 'helper-spending' && <RetirementSpendingApp />}
      {activeApp === 'helper-income' && <RetirementIncomeNeedsApp />}
      {activeApp === 'sequence' && <SequenceOfReturnsApp />}
    </div>
  );
}

export default App;
