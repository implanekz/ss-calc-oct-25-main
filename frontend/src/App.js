import React, { useState } from 'react';
import ShowMeTheMoneyCalculator from './components/ShowMeTheMoneyCalculator.jsx';
import DivorcedCalculator from './components/DivorcedCalculator.jsx';
import WidowCalculator from './components/WidowCalculator.jsx';
import PIACalculator from './components/PIACalculator.jsx';
import RetirementSpendingApp from './components/helperApps/RetirementSpendingApp.jsx';
import RetirementIncomeNeedsApp from './components/helperApps/RetirementIncomeNeedsApp.jsx';
import SequenceOfReturnsApp from './components/helperApps/SequenceOfReturnsApp.jsx';
import RetirementBudgetWorksheet from './components/helperApps/RetirementBudgetWorksheet.jsx';
import { UserProvider, useUser } from './contexts/UserContext.jsx';

// Auth screens
function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [relationshipStatus, setRelationshipStatus] = useState('single');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { login, signup } = useUser();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignup) {
        await signup({
          email,
          password,
          firstName,
          lastName,
          dateOfBirth,
          relationshipStatus
        });
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">💼 SS K.I.N.D.</h1>
          <p className="text-slate-600">Social Security Optimization Platform</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Relationship Status</label>
                <select
                  value={relationshipStatus}
                  onChange={(e) => setRelationshipStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="divorced">Divorced</option>
                  <option value="widowed">Widowed</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {loading ? 'Loading...' : isSignup ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignup(!isSignup)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            {isSignup ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Onboarding screen
function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    pia: 4000,
    hasPartner: false,
    partnerPia: 3500,
    hasChildren: false,
    preferredCalculator: 'married'
  });
  const [loading, setLoading] = useState(false);
  const { profile, completeOnboarding, updateProfile } = useUser();

  const handleComplete = async () => {
    setLoading(true);
    try {
      await updateProfile({
        pia_fra: formData.pia,
        preferred_calculator: formData.preferredCalculator
      });
      await completeOnboarding();
    } catch (err) {
      console.error('Error completing onboarding:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome to SS K.I.N.D.</h1>
          <p className="text-slate-600 mb-8">Let's set up your Social Security profile</p>

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Your PIA at Full Retirement Age (FRA)
                </label>
                <p className="text-xs text-slate-500 mb-3">
                  This is your Primary Insurance Amount - you can find this on your Social Security statement
                </p>
                <input
                  type="number"
                  value={formData.pia}
                  onChange={(e) => setFormData({...formData, pia: parseFloat(e.target.value)})}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.hasPartner}
                    onChange={(e) => setFormData({...formData, hasPartner: e.target.checked})}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <span className="ml-3 text-slate-700 font-medium">I'm married or in a partnership</span>
                </label>
              </div>

              {formData.hasPartner && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Partner's PIA at FRA
                  </label>
                  <input
                    type="number"
                    value={formData.partnerPia}
                    onChange={(e) => setFormData({...formData, partnerPia: parseFloat(e.target.value)})}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.hasChildren}
                    onChange={(e) => setFormData({...formData, hasChildren: e.target.checked})}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <span className="ml-3 text-slate-700 font-medium">I have dependent children</span>
                </label>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Continue →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Which calculator would you like to start with?
                </label>
                <div className="space-y-3">
                  {[
                    { value: 'married', label: '👫 Married/Single', desc: 'Optimize benefits for couples or individuals' },
                    { value: 'divorced', label: '💔 Divorced', desc: 'Calculate ex-spouse and survivor benefits' },
                    { value: 'widow', label: '🕊️ Widowed', desc: 'Explore widow/widower benefits' },
                    { value: 'pia', label: '🧮 PIA Calculator', desc: 'Analyze your earnings history' }
                  ].map(option => (
                    <label key={option.value} className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                      style={{borderColor: formData.preferredCalculator === option.value ? '#3b82f6' : '#e2e8f0'}}>
                      <input
                        type="radio"
                        name="calculator"
                        value={option.value}
                        checked={formData.preferredCalculator === option.value}
                        onChange={(e) => setFormData({...formData, preferredCalculator: e.target.value})}
                        className="w-5 h-5 text-blue-600 mt-1"
                      />
                      <div className="ml-3">
                        <p className="font-semibold text-slate-900">{option.label}</p>
                        <p className="text-sm text-slate-600">{option.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-3 rounded-lg transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  {loading ? 'Setting up...' : 'Complete Setup →'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main calculator content
function CalculatorApp() {
  const [activeApp, setActiveApp] = useState('ss');
  const [calculatorType, setCalculatorType] = useState('married');

  const calculatorTypes = [
    { id: 'married', label: 'Married/Single', icon: '👫' },
    { id: 'divorced', label: 'Divorced', icon: '💔' },
    { id: 'widowed', label: 'Widowed', icon: '🕊️' },
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

// Main App wrapper with auth flow
function AppWithAuth() {
  const { user, profile, loading } = useUser();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
          <p className="text-white text-lg">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (!profile?.onboarding_completed) {
    return <OnboardingScreen />;
  }

  return <CalculatorApp />;
}

// Root App with Provider
function App() {
  return (
    <UserProvider>
      <AppWithAuth />
    </UserProvider>
  );
}

export default App;
