import React, { useEffect, useState } from 'react';
import { useUser } from '../contexts/UserContext.jsx';

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
    children: [],
    // Extended Info
    partnerEmail: '',
    isDisabled: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showPartnerHistoryModal, setShowPartnerHistoryModal] = useState(false);

  // Use dev mode handlers if provided, otherwise use real User context
  const realUserContext = useUser();
  // Alias context addChild to avoid clashing with local UI helper addChild()
  const { profile, partners, completeOnboarding, updateProfile, addPartner, addChild: addChildApi } = devMode || realUserContext;

  // Pre-populate form with existing profile/partner data if available
  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        firstName: profile.firstName || profile.first_name || prev.firstName,
        lastName: profile.lastName || profile.last_name || prev.lastName,
        dateOfBirth: profile.dateOfBirth || profile.date_of_birth || prev.dateOfBirth,
        relationshipStatus: profile.relationshipStatus || profile.relationship_status || prev.relationshipStatus,
        receivingBenefits: profile.already_receiving_benefits ?? profile.alreadyReceivingBenefits ?? prev.receivingBenefits,
        benefitAmount: profile.current_monthly_benefit || profile.currentMonthlyBenefit || prev.benefitAmount,
        everDivorced: profile.ever_divorced ?? profile.everDivorced ?? prev.everDivorced,
        everWidowed: profile.ever_widowed ?? profile.everWidowed ?? prev.everWidowed,
        isDisabled: profile.is_disabled ?? profile.isDisabled ?? prev.isDisabled,
      }));
    }

    // Pre-populate partner data if available
    if (partners && partners.length > 0) {
      const p = partners[0];
      setFormData(prev => ({
        ...prev,
        partnerFirstName: p.firstName || p.first_name || prev.partnerFirstName,
        partnerLastName: p.lastName || p.last_name || prev.partnerLastName,
        partnerDob: p.dateOfBirth || p.date_of_birth || prev.partnerDob,
        partnerReceivingBenefits: p.already_receiving_benefits ?? p.alreadyReceivingBenefits ?? prev.partnerReceivingBenefits,
        partnerBenefitAmount: p.current_monthly_benefit || p.currentMonthlyBenefit || prev.partnerBenefitAmount,
      }));
    }
  }, [profile, partners]);

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

  const updateChild = (index, field, value) => {
    const newChildren = [...formData.children];
    newChildren[index] = { ...newChildren[index], [field]: value };
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
        date_of_birth: norm(formData.dateOfBirth), // Ensure snake_case update
        firstName: formData.firstName,
        first_name: formData.firstName,
        lastName: formData.lastName,
        last_name: formData.lastName,
        relationshipStatus: formData.relationshipStatus,
        relationship_status: formData.relationshipStatus, // Ensure snake_case update
        alreadyReceivingBenefits: formData.receivingBenefits === true,
        ever_divorced: formData.everDivorced === true,
        ever_widowed: formData.everWidowed === true,
        divorce_count: formData.divorceHistory.length,
        widow_count: formData.widowHistory.length,
        is_disabled: formData.isDisabled === true
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
          alreadyReceivingBenefits: formData.partnerReceivingBenefits === true,
          email: formData.partnerEmail || undefined // Capture email
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
            const childPayload = {
              dateOfBirth: norm(child.dateOfBirth),
              isDisabled: child.isDisabled || false
            };

            if (devMode && devMode.addChild) {
              devMode.addChild({ date_of_birth: childPayload.dateOfBirth, is_disabled: childPayload.isDisabled });
            } else {
              await addChildApi(childPayload);
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Let's personalize Lifelong Navigator</h1>
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

              {/* Disability Status */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Do you have a disability?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isDisabled: false })}
                    className={`py-2.5 px-4 rounded-lg border-2 transition-all font-medium ${formData.isDisabled === false
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isDisabled: true })}
                    className={`py-2.5 px-4 rounded-lg border-2 transition-all font-medium ${formData.isDisabled === true
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                  >
                    Yes
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  This helps us check eligibility for disability-related benefits (SSDI, Disabled Widow's, etc).
                </p>
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

                {/* Partner Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Spouse Email (Recommended)
                  </label>
                  <input
                    type="email"
                    value={formData.partnerEmail}
                    onChange={(e) => setFormData({ ...formData, partnerEmail: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="spouse@email.com"
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

                <div className="border-t pt-6 mt-2">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-slate-700">
                      Children (Under 19 or Disabled)
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
                        <div key={index} className="flex gap-2 items-center">
                          <input
                            type="date"
                            value={child.dateOfBirth}
                            onChange={(e) => updateChild(index, 'dateOfBirth', e.target.value)}
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                          <label className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-2 py-2 rounded border cursor-pointer hover:bg-slate-100">
                            <input
                              type="checkbox"
                              checked={child.isDisabled || false}
                              onChange={(e) => updateChild(index, 'isDisabled', e.target.checked)}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            Disabled?
                          </label>
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
                        <div key={index} className="flex gap-2 items-center">
                          <input
                            type="date"
                            value={child.dateOfBirth}
                            onChange={(e) => updateChild(index, 'dateOfBirth', e.target.value)}
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                          <label className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-2 py-2 rounded border cursor-pointer hover:bg-slate-100">
                            <input
                              type="checkbox"
                              checked={child.isDisabled || false}
                              onChange={(e) => updateChild(index, 'isDisabled', e.target.checked)}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            Disabled?
                          </label>
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

export default OnboardingScreen;
