import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import ShowMeTheMoneyCalculator from './components/ShowMeTheMoneyCalculator.jsx';
import DivorcedCalculator from './components/DivorcedCalculator.jsx';
import WidowCalculator from './components/WidowCalculator.jsx';
import PIACalculator from './components/PIACalculator.jsx';
import Settings from './components/Settings.jsx';
import RetirementSpendingApp from './components/helperApps/RetirementSpendingApp.jsx';
import RetirementIncomeNeedsApp from './components/helperApps/RetirementIncomeNeedsApp.jsx';
import SequenceOfReturnsApp from './components/helperApps/SequenceOfReturnsApp.jsx';
import RetirementBudgetWorksheet from './components/helperApps/RetirementBudgetWorksheet.jsx';
import { UserProvider, useUser } from './contexts/UserContext.jsx';
import { DevModeProvider, useDevMode } from './contexts/DevModeContext.jsx';

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

// Onboarding screen - Single page with conditional sections
function OnboardingScreen({ devMode = null }) {
  const [formData, setFormData] = useState({
    dateOfBirth: '',
    relationshipStatus: '',
    receivingBenefits: null,
    // Partner info
    partnerDob: '',
    partnerReceivingBenefits: null,
    divorceDate: '',
    marriageLength: '',
    dateOfDeath: '',
    // Children
    children: [],
    // Calculator
    preferredCalculator: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Use dev mode handlers if provided, otherwise use real User context
  const realUserContext = useUser();
  const { profile, completeOnboarding, updateProfile } = devMode || realUserContext;

  // Auto-select recommended calculator based on relationship status
  const getRecommendedCalculator = (status) => {
    const mapping = {
      'single': 'married',
      'married': 'married',
      'divorced': 'divorced',
      'widowed': 'widowed'
    };
    return mapping[status] || 'married';
  };

  const handleRelationshipChange = (status) => {
    setFormData({
      ...formData,
      relationshipStatus: status,
      preferredCalculator: getRecommendedCalculator(status)
    });
  };

  const addChild = () => {
    setFormData({
      ...formData,
      children: [...formData.children, { dateOfBirth: '' }]
    });
  };

  const removeChild = (index) => {
    const newChildren = formData.children.filter((_, i) => i !== index);
    setFormData({ ...formData, children: newChildren });
  };

  const updateChild = (index, dateOfBirth) => {
    const newChildren = [...formData.children];
    newChildren[index] = { dateOfBirth };
    setFormData({ ...formData, children: newChildren });
  };

  const handleComplete = async () => {
    if (!formData.relationshipStatus) {
      setError('Please select your relationship status');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Update profile with DOB, relationship status and benefits flag
      await updateProfile({
        date_of_birth: formData.dateOfBirth,
        relationship_status: formData.relationshipStatus,
        already_receiving_benefits: formData.receivingBenefits === true
      });

      // Save partner info if applicable
      if (['married', 'divorced', 'widowed'].includes(formData.relationshipStatus) && formData.partnerDob) {
        const partnerData = {
          relationship_type: formData.relationshipStatus === 'married' ? 'spouse' : 
                            formData.relationshipStatus === 'divorced' ? 'ex_spouse' : 'deceased_spouse',
          date_of_birth: formData.partnerDob,
          already_receiving_benefits: formData.partnerReceivingBenefits === true
        };

        if (formData.relationshipStatus === 'divorced') {
          partnerData.divorce_date = formData.divorceDate;
          partnerData.marriage_length_years = parseInt(formData.marriageLength);
        }

        if (formData.relationshipStatus === 'widowed') {
          partnerData.date_of_death = formData.dateOfDeath;
        }

        // In dev mode, use the provided method, otherwise call API
        if (devMode && devMode.addPartner) {
          devMode.addPartner(partnerData);
        } else {
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/partners`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(partnerData)
          });

          if (!response.ok) throw new Error('Failed to save partner info');
        }
      }

      // Save children if any
      if (formData.children.length > 0) {
        for (const child of formData.children) {
          if (child.dateOfBirth) {
            // In dev mode, use the provided method, otherwise call API
            if (devMode && devMode.addChild) {
              devMode.addChild({ date_of_birth: child.dateOfBirth });
            } else {
              const response = await fetch(`${process.env.REACT_APP_API_URL}/api/children`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date_of_birth: child.dateOfBirth })
              });
              
              if (!response.ok) throw new Error('Failed to save child info');
            }
          }
        }
      }

      await completeOnboarding();
    } catch (err) {
      console.error('Error completing onboarding:', err);
      setError(err.message || 'Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  const showPartnerSection = ['married', 'divorced', 'widowed'].includes(formData.relationshipStatus);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Welcome to SS K.I.N.D. ✨</h1>
          <p className="text-lg text-slate-600">Let's personalize your Social Security optimization plan</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* 1. Your Date of Birth */}
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">What's your date of birth?</h2>
            <input
              type="date"
              value={formData.dateOfBirth || ''}
              onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
              required
            />
            <p className="text-sm text-slate-500 mt-2">
              📌 This cannot be changed later to protect your account security
            </p>
          </section>

          {/* 2. Relationship Status */}
          {formData.dateOfBirth && (
          <section className="animate-fade-in">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">What's your relationship status?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { value: 'single', emoji: '👤', label: 'Single', desc: 'Not currently married' },
                { value: 'married', emoji: '💑', label: 'Married', desc: 'Currently married' },
                { value: 'divorced', emoji: '💔', label: 'Divorced', desc: 'Previously married' },
                { value: 'widowed', emoji: '🕊️', label: 'Widowed', desc: 'Spouse is deceased' }
              ].map(status => (
                <button
                  key={status.value}
                  onClick={() => handleRelationshipChange(status.value)}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${
                    formData.relationshipStatus === status.value
                      ? 'border-blue-500 bg-blue-50 shadow-md scale-105'
                      : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-4xl mb-2">{status.emoji}</div>
                  <div className="font-semibold text-lg text-slate-900">{status.label}</div>
                  <div className="text-sm text-slate-600">{status.desc}</div>
                </button>
              ))}
            </div>
          </section>
          )}

          {/* 2. Benefits Status */}
          {formData.relationshipStatus && (
            <section className="animate-fade-in">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Are you currently receiving Social Security benefits?</h2>
              <div className="flex gap-4">
                <button
                  onClick={() => setFormData({...formData, receivingBenefits: false})}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    formData.receivingBenefits === false
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="text-2xl mb-1">📋</div>
                  <div className="font-semibold">No</div>
                  <div className="text-sm text-slate-600">Not yet receiving</div>
                </button>
                <button
                  onClick={() => setFormData({...formData, receivingBenefits: true})}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    formData.receivingBenefits === true
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="text-2xl mb-1">✅</div>
                  <div className="font-semibold">Yes</div>
                  <div className="text-sm text-slate-600">Currently receiving</div>
                </button>
              </div>
            </section>
          )}

          {/* 3. Partner Information */}
          {showPartnerSection && (
            <section className="animate-fade-in border-t pt-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                {formData.relationshipStatus === 'married' ? 'About your spouse' : 
                 formData.relationshipStatus === 'divorced' ? 'About your ex-spouse' : 
                 'About your deceased spouse'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {formData.relationshipStatus === 'married' ? "Spouse's" : 
                     formData.relationshipStatus === 'divorced' ? "Ex-spouse's" : 
                     "Deceased spouse's"} date of birth
                  </label>
                  <input
                    type="date"
                    value={formData.partnerDob}
                    onChange={(e) => setFormData({...formData, partnerDob: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Are they receiving Social Security benefits?
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setFormData({...formData, partnerReceivingBenefits: false})}
                      className={`flex-1 py-2 px-4 rounded-lg border-2 transition ${
                        formData.partnerReceivingBenefits === false
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      No
                    </button>
                    <button
                      onClick={() => setFormData({...formData, partnerReceivingBenefits: true})}
                      className={`flex-1 py-2 px-4 rounded-lg border-2 transition ${
                        formData.partnerReceivingBenefits === true
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      Yes
                    </button>
                  </div>
                </div>

                {formData.relationshipStatus === 'divorced' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Divorce date</label>
                      <input
                        type="date"
                        value={formData.divorceDate}
                        onChange={(e) => setFormData({...formData, divorceDate: e.target.value})}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Length of marriage (years)</label>
                      <input
                        type="number"
                        value={formData.marriageLength}
                        onChange={(e) => setFormData({...formData, marriageLength: e.target.value})}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="10"
                      />
                    </div>
                  </>
                )}

                {formData.relationshipStatus === 'widowed' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Date of death</label>
                    <input
                      type="date"
                      value={formData.dateOfDeath}
                      onChange={(e) => setFormData({...formData, dateOfDeath: e.target.value})}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 4. Children */}
          {formData.relationshipStatus && (
            <section className="animate-fade-in border-t pt-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Do you have any children under age 16?</h2>
                  <p className="text-sm text-slate-600 mt-1">Only children under 16 qualify for certain Social Security benefits</p>
                </div>
                <button
                  onClick={addChild}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition"
                >
                  + Add Child
                </button>
              </div>

              {formData.children.length > 0 && (
                <div className="space-y-3">
                  {formData.children.map((child, index) => (
                    <div key={index} className="flex gap-3 items-center">
                      <input
                        type="date"
                        value={child.dateOfBirth}
                        onChange={(e) => updateChild(index, e.target.value)}
                        className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Child's date of birth"
                      />
                      <button
                        onClick={() => removeChild(index)}
                        className="px-4 py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {formData.children.length === 0 && (
                <p className="text-slate-500 text-center py-4 italic">No children added</p>
              )}
            </section>
          )}

          {/* 5. Recommended Calculator */}
          {formData.relationshipStatus && (
            <section className="animate-fade-in border-t pt-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Choose your starting calculator</h2>
              <p className="text-sm text-slate-600 mb-4">Based on your profile, we recommend starting here (you can switch anytime)</p>
              
              <div className="grid gap-3">
                {[
                  { value: 'married', emoji: '👫', label: 'Married/Single Calculator', desc: 'Optimize benefits for couples or individuals' },
                  { value: 'divorced', emoji: '💔', label: 'Divorced Calculator', desc: 'Calculate ex-spouse and survivor benefits' },
                  { value: 'widowed', emoji: '🕊️', label: 'Widowed Calculator', desc: 'Explore widow/widower benefits' }
                ].map(calc => (
                  <button
                    key={calc.value}
                    onClick={() => setFormData({...formData, preferredCalculator: calc.value})}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      formData.preferredCalculator === calc.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-blue-300'
                    } ${getRecommendedCalculator(formData.relationshipStatus) === calc.value ? 'ring-2 ring-blue-200' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{calc.emoji}</div>
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                          {calc.label}
                          {getRecommendedCalculator(formData.relationshipStatus) === calc.value && (
                            <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">Recommended</span>
                          )}
                        </div>
                        <div className="text-sm text-slate-600">{calc.desc}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Complete Button */}
          {formData.relationshipStatus && (
            <div className="pt-6">
              <button
                onClick={handleComplete}
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold rounded-xl shadow-lg transition-all text-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Setting up your account...
                  </span>
                ) : (
                  'Complete Setup & Start Planning →'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer note */}
        <p className="text-center text-sm text-slate-500 mt-6">
          You can always update your information later from the settings menu
        </p>
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
    <Router>
      <Routes>
        <Route path="/settings" element={<Settings />} />
        <Route path="/*" element={
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
        } />
      </Routes>
    </Router>
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

// Root App with Providers
function App() {
  return (
    <DevModeProvider>
      <UserProvider>
        <AppWithDevMode />
      </UserProvider>
    </DevModeProvider>
  );
}

// Wrapper to handle Dev Mode vs Real Mode
function AppWithDevMode() {
  const { isDevMode, devUser, devProfile, toggleDevMode, devResetOnboarding, devClearAll, testScenarios, loadTestScenario } = useDevMode();
  const { user: realUser, profile: realProfile, loading: realLoading } = useUser();

  // Use dev or real data based on mode
  const user = isDevMode ? devUser : realUser;
  const profile = isDevMode ? devProfile : realProfile;
  const loading = isDevMode ? false : realLoading;

  // Dev Mode Banner and Controls
  const DevModeBanner = () => (
    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-900 px-4 py-2 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔧</span>
          <div>
            <p className="font-bold text-sm">DEV MODE ACTIVE</p>
            <p className="text-xs">Using local test data - No Supabase required</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {profile && (
            <>
              <button
                onClick={devResetOnboarding}
                className="px-3 py-1 bg-white/90 hover:bg-white text-slate-900 rounded-lg text-xs font-semibold transition"
              >
                Reset Onboarding
              </button>
              <button
                onClick={devClearAll}
                className="px-3 py-1 bg-white/90 hover:bg-white text-slate-900 rounded-lg text-xs font-semibold transition"
              >
                Clear All Data
              </button>
            </>
          )}
          <button
            onClick={toggleDevMode}
            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition"
          >
            Exit Dev Mode
          </button>
        </div>
      </div>
    </div>
  );

  // Dev Mode Toggle (when not in dev mode)
  const DevModeToggle = () => (
    <button
      onClick={toggleDevMode}
      className="fixed top-4 right-4 z-50 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-900 rounded-lg text-sm font-semibold shadow-lg transition"
    >
      🔧 Enable Dev Mode
    </button>
  );

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

  return (
    <>
      {isDevMode && <DevModeBanner />}
      {!isDevMode && !user && <DevModeToggle />}
      
      {!user ? (
        <LoginScreenWithDevMode />
      ) : !profile?.onboarding_completed ? (
        <OnboardingScreenWithDevMode />
      ) : (
        <CalculatorApp />
      )}
    </>
  );
}

// Login Screen with Dev Mode support
function LoginScreenWithDevMode() {
  const { isDevMode, devLogin, devSignup, loadTestScenario, testScenarios } = useDevMode();
  const [showScenarios, setShowScenarios] = useState(false);

  if (isDevMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">💼 SS K.I.N.D.</h1>
            <p className="text-slate-600">Social Security Optimization Platform</p>
            <p className="text-sm text-yellow-600 mt-2 font-semibold">🔧 Development Mode</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => {
                devLogin('test@test.com');
                devSignup({
                  email: 'test@test.com',
                  firstName: 'Test',
                  lastName: 'User',
                  dateOfBirth: '1965-01-15',
                  relationshipStatus: 'single'
                });
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Quick Start (Skip to Onboarding)
            </button>

            <button
              onClick={() => setShowScenarios(!showScenarios)}
              className="w-full bg-slate-600 hover:bg-slate-700 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {showScenarios ? 'Hide' : 'Load'} Test Scenarios
            </button>

            {showScenarios && (
              <div className="space-y-2 p-4 bg-slate-50 rounded-lg">
                <p className="text-sm font-semibold text-slate-700 mb-2">Pre-filled Test Scenarios:</p>
                {Object.entries(testScenarios).map(([key, scenario]) => (
                  <button
                    key={key}
                    onClick={() => {
                      loadTestScenario(key);
                    }}
                    className="w-full text-left px-3 py-2 bg-white hover:bg-blue-50 border border-slate-200 rounded text-sm transition"
                  >
                    <span className="font-semibold capitalize">{key}</span>
                    <span className="text-slate-600 ml-2">
                      ({scenario.firstName} {scenario.lastName})
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="text-center text-xs text-slate-500 mt-6">
            Dev Mode: Test unlimited scenarios without Supabase
          </p>
        </div>
      </div>
    );
  }

  return <LoginScreen />;
}

// Onboarding Screen with Dev Mode support  
function OnboardingScreenWithDevMode() {
  const { isDevMode, devUpdateProfile, devCompleteOnboarding, devAddPartner, devAddChild } = useDevMode();

  if (isDevMode) {
    // Use local state version for dev mode
    return <OnboardingScreen devMode={{
      updateProfile: devUpdateProfile,
      completeOnboarding: devCompleteOnboarding,
      addPartner: devAddPartner,
      addChild: devAddChild
    }} />;
  }

  return <OnboardingScreen />;
}

export default App;
