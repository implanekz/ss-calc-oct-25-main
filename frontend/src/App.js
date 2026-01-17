import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import ShowMeTheMoneyCalculator from './components/ShowMeTheMoneyCalculator.jsx';
import DivorcedCalculator from './components/DivorcedCalculator.jsx';
import SSDICalculator from './components/SSDICalculator.jsx';
import WidowCalculator from './components/WidowCalculator.jsx';
import PIACalculator from './components/PIACalculator.jsx';
import Settings from './components/Settings.jsx';
import RetirementSpendingApp from './components/helperApps/RetirementSpendingApp.jsx';
import RetirementIncomeNeedsApp from './components/helperApps/RetirementIncomeNeedsApp.jsx';
import SequenceOfReturnsApp from './components/helperApps/SequenceOfReturnsApp.jsx';
import RetirementBudgetWorksheet from './components/helperApps/RetirementBudgetWorksheet.jsx';
import StartStopStartCalculator from './components/StartStopStartCalculator.jsx';
import { UserProvider, useUser } from './contexts/UserContext.jsx';
import { DevModeProvider, useDevMode } from './contexts/DevModeContext.jsx';
import { API_BASE_URL } from './config/api';

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
      // Extract a readable error message from varying shapes
      let msg = 'An error occurred';
      if (typeof err === 'string') {
        msg = err;
      } else if (err?.message && typeof err.message === 'string') {
        msg = err.message;
      } else if (err?.error && typeof err.error === 'string') {
        msg = err.error;
      } else if (err?.detail) {
        msg = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
      } else if (err) {
        try { msg = JSON.stringify(err); } catch (_) { msg = String(err); }
      }
      setError(msg);
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
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    relationshipStatus: '',
    receivingBenefits: null,
    benefitAmount: '',
    benefitFilingDate: '',
    benefitFilingAge: '',
    // Divorce/Widow history
    everDivorced: null,
    everWidowed: null,
    divorceHistory: [],
    widowHistory: [],
    // Partner info
    partnerFirstName: '',
    partnerLastName: '',
    partnerDob: '',
    partnerReceivingBenefits: null,
    partnerBenefitAmount: '',
    partnerBenefitFilingDate: '',
    partnerBenefitFilingAge: '',
    // Partner divorce/widow history
    partnerEverDivorced: null,
    partnerEverWidowed: null,
    partnerDivorceHistory: [],
    partnerWidowHistory: [],
    divorceDate: '',
    marriageLength: '',
    dateOfDeath: '',
    // Children
    children: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showPartnerHistoryModal, setShowPartnerHistoryModal] = useState(false);

  // Use dev mode handlers if provided, otherwise use real User context
  const realUserContext = useUser();
  // Alias context addChild to avoid clashing with local UI helper addChild()
  const { profile, completeOnboarding, updateProfile, addPartner, addChild: addChildApi } = devMode || realUserContext;

  const addChild = () => {
    setFormData({
      ...formData,
      children: [...formData.children, { dateOfBirth: '' }]
    });
  };

  const addDivorce = () => {
    setFormData({
      ...formData,
      divorceHistory: [...formData.divorceHistory, {
        marriageStartDate: '',
        divorceDate: '',
        marriageLengthYears: '',
        exSpouseAlive: true
      }]
    });
  };

  const removeDivorce = (index) => {
    const newHistory = formData.divorceHistory.filter((_, i) => i !== index);
    setFormData({ ...formData, divorceHistory: newHistory });
  };

  const updateDivorce = (index, field, value) => {
    const newHistory = [...formData.divorceHistory];
    newHistory[index] = { ...newHistory[index], [field]: value };
    setFormData({ ...formData, divorceHistory: newHistory });
  };

  const addWidowHistory = () => {
    setFormData({
      ...formData,
      widowHistory: [...formData.widowHistory, {
        marriageStartDate: '',
        spouseDateOfDeath: '',
        marriageLengthYears: ''
      }]
    });
  };

  const removeWidowHistory = (index) => {
    const newHistory = formData.widowHistory.filter((_, i) => i !== index);
    setFormData({ ...formData, widowHistory: newHistory });
  };

  const updateWidowHistory = (index, field, value) => {
    const newHistory = [...formData.widowHistory];
    newHistory[index] = { ...newHistory[index], [field]: value };
    setFormData({ ...formData, widowHistory: newHistory });
  };

  // Partner history handlers
  const addPartnerDivorce = () => {
    setFormData({
      ...formData,
      partnerDivorceHistory: [...formData.partnerDivorceHistory, {
        marriageStartDate: '',
        divorceDate: '',
        marriageLengthYears: '',
        exSpouseAlive: true
      }]
    });
  };

  const removePartnerDivorce = (index) => {
    const newHistory = formData.partnerDivorceHistory.filter((_, i) => i !== index);
    setFormData({ ...formData, partnerDivorceHistory: newHistory });
  };

  const updatePartnerDivorce = (index, field, value) => {
    const newHistory = [...formData.partnerDivorceHistory];
    newHistory[index] = { ...newHistory[index], [field]: value };
    setFormData({ ...formData, partnerDivorceHistory: newHistory });
  };

  const addPartnerWidowHistory = () => {
    setFormData({
      ...formData,
      partnerWidowHistory: [...formData.partnerWidowHistory, {
        marriageStartDate: '',
        spouseDateOfDeath: '',
        marriageLengthYears: ''
      }]
    });
  };

  const removePartnerWidowHistory = (index) => {
    const newHistory = formData.partnerWidowHistory.filter((_, i) => i !== index);
    setFormData({ ...formData, partnerWidowHistory: newHistory });
  };

  const updatePartnerWidowHistory = (index, field, value) => {
    const newHistory = [...formData.partnerWidowHistory];
    newHistory[index] = { ...newHistory[index], [field]: value };
    setFormData({ ...formData, partnerWidowHistory: newHistory });
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
      // Update profile with DOB, relationship status, benefits, and history flags
      // Normalize dates to YYYY-MM-DD
      const norm = (d) => {
        if (!d) return d;
        const dt = new Date(d);
        return isNaN(dt.getTime()) ? d : dt.toISOString().slice(0, 10);
      };
      const profileData = {
        dateOfBirth: norm(formData.dateOfBirth),
        relationshipStatus: formData.relationshipStatus,
        alreadyReceivingBenefits: formData.receivingBenefits === true,
        ever_divorced: formData.everDivorced === true,
        ever_widowed: formData.everWidowed === true,
        divorce_count: formData.divorceHistory.length,
        widow_count: formData.widowHistory.length
      };

      // Add benefit details if receiving benefits
      if (formData.receivingBenefits === true) {
        if (formData.benefitAmount) profileData.currentMonthlyBenefit = parseFloat(formData.benefitAmount);
        if (formData.benefitFilingDate) profileData.benefitFilingDate = norm(formData.benefitFilingDate);
        if (formData.benefitFilingAge) profileData.benefitFilingAge = parseInt(formData.benefitFilingAge);
      }

      await updateProfile(profileData);

      // Save partner info if applicable (not required, but save if provided)
      if (['married', 'divorced', 'widowed'].includes(formData.relationshipStatus) && formData.partnerDob) {
        const partnerData = {
          relationshipType: formData.relationshipStatus === 'married' ? 'spouse' :
            formData.relationshipStatus === 'divorced' ? 'ex_spouse' : 'deceased_spouse',
          firstName: formData.partnerFirstName || undefined,
          lastName: formData.partnerLastName || undefined,
          dateOfBirth: norm(formData.partnerDob),
          alreadyReceivingBenefits: formData.partnerReceivingBenefits === true
        };

        // Add partner benefit details if receiving benefits
        if (formData.partnerReceivingBenefits === true) {
          if (formData.partnerBenefitAmount) partnerData.currentMonthlyBenefit = parseFloat(formData.partnerBenefitAmount);
          if (formData.partnerBenefitFilingDate) partnerData.filedAgeYears = parseInt(formData.partnerBenefitFilingAge || 0);
        }

        if (formData.relationshipStatus === 'divorced') {
          partnerData.divorceDate = norm(formData.divorceDate);
          partnerData.marriageLengthYears = parseInt(formData.marriageLength || 0);
        }

        if (formData.relationshipStatus === 'widowed') {
          partnerData.dateOfDeath = norm(formData.dateOfDeath);
        }

        // Use context (handles auth token) or dev mode handler
        if (devMode && devMode.addPartner) {
          devMode.addPartner(partnerData);
        } else {
          await addPartner(partnerData);
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
              await addChildApi({ dateOfBirth: norm(child.dateOfBirth) });
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

          {/* Partner History Modal */}
          {showPartnerHistoryModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">Spouse's Marriage History Details</h2>
                  <button
                    onClick={() => setShowPartnerHistoryModal(false)}
                    className="text-slate-400 hover:text-slate-600 transition"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Divorce History Section */}
                  <div className="border-b pb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-900">Divorce History</h3>
                      <button
                        onClick={addPartnerDivorce}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        + Add Divorce
                      </button>
                    </div>

                    {formData.partnerDivorceHistory.length === 0 ? (
                      <p className="text-sm text-slate-500 italic">No divorce history added</p>
                    ) : (
                      <div className="space-y-4">
                        {formData.partnerDivorceHistory.map((divorce, index) => (
                          <div key={index} className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-amber-900">Divorce #{index + 1}</h4>
                              <button
                                onClick={() => removePartnerDivorce(index)}
                                className="text-sm text-red-600 hover:text-red-700"
                              >
                                Remove
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Marriage start</label>
                                <input
                                  type="date"
                                  value={divorce.marriageStartDate}
                                  onChange={(e) => updatePartnerDivorce(index, 'marriageStartDate', e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Divorce date</label>
                                <input
                                  type="date"
                                  value={divorce.divorceDate}
                                  onChange={(e) => updatePartnerDivorce(index, 'divorceDate', e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Marriage length (years)</label>
                                <input
                                  type="number"
                                  value={divorce.marriageLengthYears}
                                  onChange={(e) => updatePartnerDivorce(index, 'marriageLengthYears', e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                  placeholder="10"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Ex-spouse status</label>
                                <select
                                  value={divorce.exSpouseAlive ? 'alive' : 'deceased'}
                                  onChange={(e) => updatePartnerDivorce(index, 'exSpouseAlive', e.target.value === 'alive')}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                >
                                  <option value="alive">Alive</option>
                                  <option value="deceased">Deceased</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs text-amber-800">
                        <strong>Note:</strong> Marriage must have lasted 10+ years to qualify for divorced spouse benefits
                      </p>
                    </div>
                  </div>

                  {/* Widow History Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-900">Widow/Widower History</h3>
                      <button
                        onClick={addPartnerWidowHistory}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        + Add Spouse
                      </button>
                    </div>

                    {formData.partnerWidowHistory.length === 0 ? (
                      <p className="text-sm text-slate-500 italic">No widow/widower history added</p>
                    ) : (
                      <div className="space-y-4">
                        {formData.partnerWidowHistory.map((widow, index) => (
                          <div key={index} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-blue-900">Deceased Spouse #{index + 1}</h4>
                              <button
                                onClick={() => removePartnerWidowHistory(index)}
                                className="text-sm text-red-600 hover:text-red-700"
                              >
                                Remove
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Marriage start</label>
                                <input
                                  type="date"
                                  value={widow.marriageStartDate}
                                  onChange={(e) => updatePartnerWidowHistory(index, 'marriageStartDate', e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Date of death</label>
                                <input
                                  type="date"
                                  value={widow.spouseDateOfDeath}
                                  onChange={(e) => updatePartnerWidowHistory(index, 'spouseDateOfDeath', e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="block text-xs font-medium text-slate-700 mb-1">Marriage length (years)</label>
                                <input
                                  type="number"
                                  value={widow.marriageLengthYears}
                                  onChange={(e) => updatePartnerWidowHistory(index, 'marriageLengthYears', e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                  placeholder="15"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-800">
                        <strong>Note:</strong> You may qualify for survivor benefits at age 60 (50 if disabled)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowPartnerHistoryModal(false)}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* History Modal */}
          {showHistoryModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">Your Marriage History Details</h2>
                  <button
                    onClick={() => setShowHistoryModal(false)}
                    className="text-slate-400 hover:text-slate-600 transition"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Divorce History Section */}
                  <div className="border-b pb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-900">Divorce History</h3>
                      <button
                        onClick={addDivorce}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        + Add Divorce
                      </button>
                    </div>

                    {formData.divorceHistory.length === 0 ? (
                      <p className="text-sm text-slate-500 italic">No divorce history added</p>
                    ) : (
                      <div className="space-y-4">
                        {formData.divorceHistory.map((divorce, index) => (
                          <div key={index} className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-amber-900">Divorce #{index + 1}</h4>
                              <button
                                onClick={() => removeDivorce(index)}
                                className="text-sm text-red-600 hover:text-red-700"
                              >
                                Remove
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Marriage start</label>
                                <input
                                  type="date"
                                  value={divorce.marriageStartDate}
                                  onChange={(e) => updateDivorce(index, 'marriageStartDate', e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Divorce date</label>
                                <input
                                  type="date"
                                  value={divorce.divorceDate}
                                  onChange={(e) => updateDivorce(index, 'divorceDate', e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Marriage length (years)</label>
                                <input
                                  type="number"
                                  value={divorce.marriageLengthYears}
                                  onChange={(e) => updateDivorce(index, 'marriageLengthYears', e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                  placeholder="10"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Ex-spouse status</label>
                                <select
                                  value={divorce.exSpouseAlive ? 'alive' : 'deceased'}
                                  onChange={(e) => updateDivorce(index, 'exSpouseAlive', e.target.value === 'alive')}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                >
                                  <option value="alive">Alive</option>
                                  <option value="deceased">Deceased</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs text-amber-800">
                        <strong>Note:</strong> Marriage must have lasted 10+ years to qualify for divorced spouse benefits
                      </p>
                    </div>
                  </div>

                  {/* Widow History Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-900">Widow/Widower History</h3>
                      <button
                        onClick={addWidowHistory}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        + Add Spouse
                      </button>
                    </div>

                    {formData.widowHistory.length === 0 ? (
                      <p className="text-sm text-slate-500 italic">No widow/widower history added</p>
                    ) : (
                      <div className="space-y-4">
                        {formData.widowHistory.map((widow, index) => (
                          <div key={index} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-blue-900">Deceased Spouse #{index + 1}</h4>
                              <button
                                onClick={() => removeWidowHistory(index)}
                                className="text-sm text-red-600 hover:text-red-700"
                              >
                                Remove
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Marriage start</label>
                                <input
                                  type="date"
                                  value={widow.marriageStartDate}
                                  onChange={(e) => updateWidowHistory(index, 'marriageStartDate', e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Date of death</label>
                                <input
                                  type="date"
                                  value={widow.spouseDateOfDeath}
                                  onChange={(e) => updateWidowHistory(index, 'spouseDateOfDeath', e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="block text-xs font-medium text-slate-700 mb-1">Marriage length (years)</label>
                                <input
                                  type="number"
                                  value={widow.marriageLengthYears}
                                  onChange={(e) => updateWidowHistory(index, 'marriageLengthYears', e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                  placeholder="15"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-800">
                        <strong>Note:</strong> You may qualify for survivor benefits at age 60 (50 if disabled)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowHistoryModal(false)}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column - Your Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900 border-b pb-2">Your Information</h3>

              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  First name
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="First name"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Last name
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Doe"
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Date of birth
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
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
                      onClick={() => setFormData({ ...formData, relationshipStatus: status.value })}
                      className={`py-2.5 px-4 rounded-lg border-2 transition-all font-medium ${formData.relationshipStatus === status.value
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
                  Receiving Social Security Benefits?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, receivingBenefits: false })}
                    className={`py-2.5 px-4 rounded-lg border-2 transition-all font-medium ${formData.receivingBenefits === false
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, receivingBenefits: true })}
                    className={`py-2.5 px-4 rounded-lg border-2 transition-all font-medium ${formData.receivingBenefits === true
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                  >
                    Yes
                  </button>
                </div>
              </div>

              {/* Benefit Details - Show if receiving benefits */}
              {formData.receivingBenefits === true && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Current monthly benefit amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                      <input
                        type="number"
                        value={formData.benefitAmount}
                        onChange={(e) => setFormData({ ...formData, benefitAmount: e.target.value })}
                        className="w-full pl-8 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="2500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Filing date
                      </label>
                      <input
                        type="date"
                        value={formData.benefitFilingDate}
                        onChange={(e) => setFormData({ ...formData, benefitFilingDate: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Age filed
                      </label>
                      <input
                        type="number"
                        value={formData.benefitFilingAge}
                        onChange={(e) => setFormData({ ...formData, benefitFilingAge: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="67"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Divorce/Widow History - Show for Single or Married */}
              {(['single', 'married'].includes(formData.relationshipStatus)) && (
                <>
                  <div className="border-t pt-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Have you <span className="font-bold">ever</span> been divorced or widowed?
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, everDivorced: false, everWidowed: false, divorceHistory: [], widowHistory: [] });
                        }}
                        className={`py-2.5 px-4 rounded-lg border-2 transition-all font-medium ${formData.everDivorced === false && formData.everWidowed === false
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, everDivorced: true });
                          setShowHistoryModal(true);
                        }}
                        className={`py-2.5 px-4 rounded-lg border-2 transition-all font-medium ${formData.everDivorced === true || formData.everWidowed === true
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                      >
                        Yes
                      </button>
                    </div>
                  </div>

                  {/* Show summary if history exists */}
                  {(formData.divorceHistory.length > 0 || formData.widowHistory.length > 0) && (
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-slate-900 text-sm">Marriage History Summary</h4>
                        <button
                          onClick={() => setShowHistoryModal(true)}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Edit Details
                        </button>
                      </div>
                      {formData.divorceHistory.length > 0 && (
                        <p className="text-xs text-slate-700">
                          • {formData.divorceHistory.length} divorce(s) recorded
                        </p>
                      )}
                      {formData.widowHistory.length > 0 && (
                        <p className="text-xs text-slate-700">
                          • {formData.widowHistory.length} deceased spouse(s) recorded
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right Column - Partner & Children - Only show for married/divorced/widowed */}
            {['married', 'divorced', 'widowed'].includes(formData.relationshipStatus) && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-900 border-b pb-2">
                  {formData.relationshipStatus === 'married' ? 'Spouse Information (optional)' :
                    formData.relationshipStatus === 'divorced' ? 'Ex-Spouse Information (optional)' :
                      'Deceased Spouse Information (optional)'}
                </h3>

                {/* Partner First Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    First name
                  </label>
                  <input
                    type="text"
                    value={formData.partnerFirstName}
                    onChange={(e) => setFormData({ ...formData, partnerFirstName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="First name"
                  />
                </div>

                {/* Partner Last Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Last name
                  </label>
                  <input
                    type="text"
                    value={formData.partnerLastName}
                    onChange={(e) => setFormData({ ...formData, partnerLastName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Last name"
                  />
                </div>

                {/* Partner DOB */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Date of birth
                  </label>
                  <input
                    type="date"
                    value={formData.partnerDob}
                    onChange={(e) => setFormData({ ...formData, partnerDob: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Partner Benefits */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Receiving Social Security Benefits?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, partnerReceivingBenefits: false })}
                      className={`py-2 px-4 rounded-lg border-2 transition-all font-medium ${formData.partnerReceivingBenefits === false
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, partnerReceivingBenefits: true })}
                      className={`py-2 px-4 rounded-lg border-2 transition-all font-medium ${formData.partnerReceivingBenefits === true
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                    >
                      Yes
                    </button>
                  </div>
                </div>

                {/* Partner Benefit Details - Show if receiving benefits */}
                {formData.partnerReceivingBenefits === true && (
                  <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Current monthly benefit
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                        <input
                          type="number"
                          value={formData.partnerBenefitAmount}
                          onChange={(e) => setFormData({ ...formData, partnerBenefitAmount: e.target.value })}
                          className="w-full pl-8 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="2000"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Filing date
                        </label>
                        <input
                          type="date"
                          value={formData.partnerBenefitFilingDate}
                          onChange={(e) => setFormData({ ...formData, partnerBenefitFilingDate: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Age filed
                        </label>
                        <input
                          type="number"
                          value={formData.partnerBenefitFilingAge}
                          onChange={(e) => setFormData({ ...formData, partnerBenefitFilingAge: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="62"
                        />
                      </div>
                    </div>
                  </div>
                )}

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
                        onChange={(e) => setFormData({ ...formData, divorceDate: e.target.value })}
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
                        onChange={(e) => setFormData({ ...formData, marriageLength: e.target.value })}
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
                      onChange={(e) => setFormData({ ...formData, dateOfDeath: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Partner Divorce/Widow History - Show for married only */}
                {formData.relationshipStatus === 'married' && (
                  <>
                    <div className="border-t pt-6">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Has your spouse <span className="font-bold">ever</span> been divorced or widowed?
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, partnerEverDivorced: false, partnerEverWidowed: false, partnerDivorceHistory: [], partnerWidowHistory: [] });
                          }}
                          className={`py-2.5 px-4 rounded-lg border-2 transition-all font-medium ${formData.partnerEverDivorced === false && formData.partnerEverWidowed === false
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                            }`}
                        >
                          No
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, partnerEverDivorced: true });
                            setShowPartnerHistoryModal(true);
                          }}
                          className={`py-2.5 px-4 rounded-lg border-2 transition-all font-medium ${formData.partnerEverDivorced === true || formData.partnerEverWidowed === true
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                            }`}
                        >
                          Yes
                        </button>
                      </div>
                    </div>

                    {/* Show summary if history exists */}
                    {(formData.partnerDivorceHistory.length > 0 || formData.partnerWidowHistory.length > 0) && (
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-slate-900 text-sm">Spouse's Marriage History Summary</h4>
                          <button
                            onClick={() => setShowPartnerHistoryModal(true)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Edit Details
                          </button>
                        </div>
                        {formData.partnerDivorceHistory.length > 0 && (
                          <p className="text-xs text-slate-700">
                            • {formData.partnerDivorceHistory.length} divorce(s) recorded
                          </p>
                        )}
                        {formData.partnerWidowHistory.length > 0 && (
                          <p className="text-xs text-slate-700">
                            • {formData.partnerWidowHistory.length} deceased spouse(s) recorded
                          </p>
                        )}
                      </div>
                    )}
                  </>
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
            )}

            {/* Children for Single - Show on left if single */}
            {formData.relationshipStatus === 'single' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-900 border-b pb-2">Children & Dependents</h3>

                <div>
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
            )}
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
    { id: 'ssdi', label: 'Disability', icon: '♿' },
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
        <Route path="/start-stop-start" element={
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            <nav className="bg-gradient-to-r from-slate-900 to-slate-800 shadow-lg sticky top-0 z-50 border-b border-slate-700">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center h-16">
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-white whitespace-nowrap">
                      Start-Stop-Start Strategy
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
              <StartStopStartCalculator />
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
