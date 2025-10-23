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

// Onboarding screen - Single page with all fields visible
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
    children: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Use dev mode handlers if provided, otherwise use real User context
  const realUserContext = useUser();
  const { profile, completeOnboarding, updateProfile } = devMode || realUserContext;

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
    // Validation
    if (!formData.dateOfBirth) {
      setError('Please enter your date of birth');
      return;
    }
    if (!formData.relationshipStatus) {
      setError('Please select your relationship status');
      return;
    }
    if (formData.receivingBenefits === null) {
      setError('Please indicate if you are receiving Social Security benefits');
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

          // Save partner info if applicable (not required, but save if provided)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Let's personalize SS K.I.N.D.</h1>
          <p className="text-slate-600">We use your information to provide the most accurate Social Security analysis</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-6">
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column - Your Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900 border-b pb-2">Your Information</h3>
              
              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Date of birth
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Relationship Status */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Relationship status
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'single', label: 'Single' },
                    { value: 'married', label: 'Married' },
                    { value: 'divorced', label: 'Divorced' },
                    { value: 'widowed', label: 'Widowed' }
                  ].map(status => (
                    <button
                      key={status.value}
                      type="button"
                      onClick={() => setFormData({...formData, relationshipStatus: status.value})}
                      className={`py-2.5 px-4 rounded-lg border-2 transition-all font-medium ${
                        formData.relationshipStatus === status.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Benefits Status */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Receiving Social Security?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, receivingBenefits: false})}
                    className={`py-2.5 px-4 rounded-lg border-2 transition-all font-medium ${
                      formData.receivingBenefits === false
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, receivingBenefits: true})}
                    className={`py-2.5 px-4 rounded-lg border-2 transition-all font-medium ${
                      formData.receivingBenefits === true
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    Yes
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Partner & Children */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900 border-b pb-2">
                {formData.relationshipStatus === 'married' ? 'Spouse Information (optional)' :
                 formData.relationshipStatus === 'divorced' ? 'Ex-Spouse Information (optional)' :
                 formData.relationshipStatus === 'widowed' ? 'Deceased Spouse Information (optional)' :
                 'Partner Information (optional)'}
              </h3>
              
              {/* Partner DOB */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Date of birth
                </label>
                <input
                  type="date"
                  value={formData.partnerDob}
                  onChange={(e) => setFormData({...formData, partnerDob: e.target.value})}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Partner Benefits */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Receiving benefits?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, partnerReceivingBenefits: false})}
                    className={`py-2 px-4 rounded-lg border-2 transition-all font-medium ${
                      formData.partnerReceivingBenefits === false
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, partnerReceivingBenefits: true})}
                    className={`py-2 px-4 rounded-lg border-2 transition-all font-medium ${
                      formData.partnerReceivingBenefits === true
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    Yes
                  </button>
                </div>
              </div>

              {/* Divorce-specific fields */}
              {formData.relationshipStatus === 'divorced' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Divorce date
                    </label>
                    <input
                      type="date"
                      value={formData.divorceDate}
                      onChange={(e) => setFormData({...formData, divorceDate: e.target.value})}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Marriage length (years)
                    </label>
                    <input
                      type="number"
                      value={formData.marriageLength}
                      onChange={(e) => setFormData({...formData, marriageLength: e.target.value})}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="10"
                    />
                  </div>
                </>
              )}

              {/* Widowed-specific fields */}
              {formData.relationshipStatus === 'widowed' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Date of death
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfDeath}
                    onChange={(e) => setFormData({...formData, dateOfDeath: e.target.value})}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              {/* Children Section */}
              <div className="border-t pt-6 mt-2">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-700">
                    Children under 16 (optional)
                  </label>
                  <button
                    type="button"
                    onClick={addChild}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add child
                  </button>
                </div>

                {formData.children.length > 0 && (
                  <div className="space-y-2">
                    {formData.children.map((child, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="date"
                          value={child.dateOfBirth}
                          onChange={(e) => updateChild(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeChild(index)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-8">
            <button
              type="button"
              onClick={handleComplete}
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl shadow-md transition-all text-base"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </span>
              ) : (
                'Save & Continue'
              )}
            </button>
          </div>

          {/* What Happens Next */}
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-semibold text-slate-900 mb-3">What happens next?</h4>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Your profile is saved securely and can be updated anytime from Settings</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>You'll be taken to the Social Security calculator best suited for your situation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>You can switch between calculators anytime using the navigation menu</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>All your inputs are automatically saved as you work</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main calculator content
function CalculatorApp() {
  const [activeApp, setActiveApp] = useState('ss');
  const [calculatorType, setCalculatorType] = useState('married');
  const [showHelpDropdown, setShowHelpDropdown] = useState(false);

  const calculatorTypes = [
    { id: 'married', label: 'Married/Single', icon: '👫' },
    { id: 'divorced', label: 'Divorced', icon: '💔' },
    { id: 'widowed', label: 'Widowed', icon: '🕊️' },
  ];

  const navItems = [
    { id: 'ss', label: 'Social Security Planner', icon: '💰' },
  ];

  return (
    <Router>
      <Routes>
        <Route path="/settings" element={<Settings />} />
        <Route path="/pia-calculator" element={
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            <nav className="bg-gradient-to-r from-slate-900 to-slate-800 shadow-lg sticky top-0 z-50 border-b border-slate-700">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center h-16">
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-white whitespace-nowrap">
                      RISE and SHINE Method
                    </h1>
                    <a
                      href="/"
                      className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-full font-semibold text-sm hover:from-primary-600 hover:to-primary-700 shadow-lg transition-all whitespace-nowrap"
                    >
                      💰 Social Security Calculator
                    </a>
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
            <nav className="bg-gradient-to-r from-slate-900 to-slate-800 shadow-lg sticky top-0 z-50 border-b border-slate-700">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center h-16">
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-white whitespace-nowrap">
                      RISE and SHINE Method
                    </h1>
                    <a
                      href="/"
                      className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-full font-semibold text-sm hover:from-primary-600 hover:to-primary-700 shadow-lg transition-all whitespace-nowrap"
                    >
                      💰 Social Security Calculator
                    </a>
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
            <nav className="bg-gradient-to-r from-slate-900 to-slate-800 shadow-lg sticky top-0 z-50 border-b border-slate-700">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center h-16">
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-white whitespace-nowrap">
                      RISE and SHINE Method
                    </h1>
                    <a
                      href="/"
                      className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-full font-semibold text-sm hover:from-primary-600 hover:to-primary-700 shadow-lg transition-all whitespace-nowrap"
                    >
                      💰 Social Security Calculator
                    </a>
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
            <nav className="bg-gradient-to-r from-slate-900 to-slate-800 shadow-lg sticky top-0 z-50 border-b border-slate-700">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center h-16">
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-white whitespace-nowrap">
                      RISE and SHINE Method
                    </h1>
                    <a
                      href="/"
                      className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-full font-semibold text-sm hover:from-primary-600 hover:to-primary-700 shadow-lg transition-all whitespace-nowrap"
                    >
                      💰 Social Security Calculator
                    </a>
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
            <nav className="bg-gradient-to-r from-slate-900 to-slate-800 shadow-lg sticky top-0 z-50 border-b border-slate-700">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center h-16">
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-white whitespace-nowrap">
                      RISE and SHINE Method
                    </h1>
                    <a
                      href="/"
                      className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-full font-semibold text-sm hover:from-primary-600 hover:to-primary-700 shadow-lg transition-all whitespace-nowrap"
                    >
                      💰 Social Security Calculator
                    </a>
                  </div>
                </div>
              </div>
            </nav>
            <main className="animate-fade-in">
              <RetirementBudgetWorksheet />
            </main>
          </div>
        } />
        <Route path="/*" element={
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            {/* Navigation Bar */}
            <nav className="bg-gradient-to-r from-slate-900 to-slate-800 shadow-lg sticky top-0 z-50 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            {/* Logo/Brand and Navigation Items - All on left */}
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide flex-nowrap">
              <h1 className="text-xl font-bold text-white whitespace-nowrap">
                RISE and SHINE Method
              </h1>

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

              {/* Calculator Type Dropdown - Only show when SS is active */}
              {activeApp === 'ss' && (
                <>
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
                  <button
                    onClick={() => setShowHelpDropdown(!showHelpDropdown)}
                    className="text-xs text-slate-300 hover:text-white flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors"
                  >
                    <span className="text-[10px]">💡</span> Need help choosing?
                  </button>
                </>
              )}
            </div>
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
