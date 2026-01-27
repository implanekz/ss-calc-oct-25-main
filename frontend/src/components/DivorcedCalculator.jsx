import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { StrategyTimelineToaster } from './ui';
import { useCalculatorPersistence } from '../hooks/useCalculatorPersistence';
import { API_BASE_URL } from '../config/api';

const DivorcedCalculator = ({ onSwitchToMarried }) => {
    // Persistence hook for ALL user inputs
    const { state: persistedState, setState: setPersistedState, isLoaded } = useCalculatorPersistence('divorced', {
        birthDate: '1963-01-01',
        ownPia: 1800,
        exSpousePia: 2800,
        marriageDurationYears: 15,
        divorceDate: '2010-01-01',
        isRemarried: false,
        hasChildUnder16: false,
        childBirthDate: '2015-01-01',
        longevityAge: 90,
        inflationRate: 0.025
    });

    // Form inputs - initialized with defaults, loaded from persistence in useEffect
    const [birthDate, setBirthDate] = useState('1963-01-01');
    const [ownPia, setOwnPia] = useState(1800);
    const [exSpousePia, setExSpousePia] = useState(2800);
    const [marriageDurationYears, setMarriageDurationYears] = useState(15);
    const [divorceDate, setDivorceDate] = useState('2010-01-01');
    const [isRemarried, setIsRemarried] = useState(false);
    const [hasChildUnder16, setHasChildUnder16] = useState(false);
    const [childBirthDate, setChildBirthDate] = useState('2015-01-01');
    const [longevityAge, setLongevityAge] = useState(90);
    const [inflationRate, setInflationRate] = useState(0.025);

    // Results
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeStrategyDetails, setActiveStrategyDetails] = useState(null);
    const [showExSpousePiaModal, setShowExSpousePiaModal] = useState(false);
    const [hoveredStrategyIndex, setHoveredStrategyIndex] = useState(null);
    const [detailPanelOffset, setDetailPanelOffset] = useState(0);

    // Scenario comparison state
    const [selectedScenarios, setSelectedScenarios] = useState([]);
    const [showComparisonModal, setShowComparisonModal] = useState(false);
    const [comparisonViewMode, setComparisonViewMode] = useState('monthly'); // 'monthly' or 'annual'

    // Track if we've loaded initial persisted state to prevent infinite loop
    const hasLoadedPersistedState = React.useRef(false);

    // Load persisted state when it becomes available (only once on mount)
    useEffect(() => {
        if (isLoaded && persistedState && !hasLoadedPersistedState.current) {
            hasLoadedPersistedState.current = true;
            if (persistedState.birthDate) setBirthDate(persistedState.birthDate);
            if (persistedState.ownPia !== undefined) setOwnPia(persistedState.ownPia);
            if (persistedState.exSpousePia !== undefined) setExSpousePia(persistedState.exSpousePia);
            if (persistedState.marriageDurationYears !== undefined) setMarriageDurationYears(persistedState.marriageDurationYears);
            if (persistedState.divorceDate) setDivorceDate(persistedState.divorceDate);
            if (persistedState.isRemarried !== undefined) setIsRemarried(persistedState.isRemarried);
            if (persistedState.hasChildUnder16 !== undefined) setHasChildUnder16(persistedState.hasChildUnder16);
            if (persistedState.childBirthDate) setChildBirthDate(persistedState.childBirthDate);
            if (persistedState.longevityAge !== undefined) setLongevityAge(persistedState.longevityAge);
            if (persistedState.inflationRate !== undefined) setInflationRate(persistedState.inflationRate);
        }
    }, [isLoaded, persistedState]);

    // Persist ALL state changes
    useEffect(() => {
        if (isLoaded) {
            setPersistedState({
                birthDate,
                ownPia,
                exSpousePia,
                marriageDurationYears,
                divorceDate,
                isRemarried,
                hasChildUnder16,
                childBirthDate,
                longevityAge,
                inflationRate
            });
        }
    }, [birthDate, ownPia, exSpousePia, marriageDurationYears, divorceDate, isRemarried, hasChildUnder16, childBirthDate, longevityAge, inflationRate, isLoaded, setPersistedState]);

    useEffect(() => {
        setActiveStrategyDetails(null);
    }, [results]);

    const calculateAge = (birthDateStr) => {
        const today = new Date();
        const birth = new Date(birthDateStr);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    const currentAge = calculateAge(birthDate);

    const updateDetailPanelPosition = (cardIndex) => {
        if (cardIndex === null) return;

        const cardElement = document.getElementById(`strategy-card-${cardIndex}`);
        const detailElement = document.getElementById('inline-detail-chart');

        if (cardElement && detailElement) {
            const cardRect = cardElement.getBoundingClientRect();
            const detailRect = detailElement.getBoundingClientRect();

            // Calculate how far the detail panel should move to align with the card
            const offset = cardRect.top - detailRect.top;
            setDetailPanelOffset(offset);
        }
    };

    useEffect(() => {
        if (hoveredStrategyIndex === null) return;

        // Update position on scroll
        const handleScroll = () => {
            updateDetailPanelPosition(hoveredStrategyIndex);
        };

        // Add scroll listener
        window.addEventListener('scroll', handleScroll, { passive: true });

        // Also update on animation frame for smooth tracking
        let animationFrameId;
        const trackPosition = () => {
            updateDetailPanelPosition(hoveredStrategyIndex);
            animationFrameId = requestAnimationFrame(trackPosition);
        };
        animationFrameId = requestAnimationFrame(trackPosition);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [hoveredStrategyIndex]);

    const showStrategyDetails = (strategy, cardIndex = null) => {
        if (!strategy || !strategy.benefit_timeline || strategy.benefit_timeline.length === 0) {
            return;
        }
        setActiveStrategyDetails({
            ...strategy,
            description: describeStrategy(strategy)
        });

        // Calculate initial offset to align detail panel with hovered card
        if (cardIndex !== null) {
            updateDetailPanelPosition(cardIndex);
        }
    };

    const dismissStrategyDetails = () => setActiveStrategyDetails(null);

    const handleStrategyKey = (event, strategy) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            showStrategyDetails(strategy);
        }
    };

    const handleCalculate = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await axios.post(`${API_BASE_URL}/calculate-divorced`, {
                birth_date: birthDate,
                own_pia: ownPia === '' ? 0 : Number(ownPia),
                ex_spouse_pia: exSpousePia === '' ? 0 : Number(exSpousePia),
                marriage_duration_years: marriageDurationYears === '' ? 0 : Number(marriageDurationYears),
                divorce_date: divorceDate,
                is_remarried: isRemarried,
                has_child_under_16: hasChildUnder16,
                child_birth_date: hasChildUnder16 ? childBirthDate : null,
                longevity_age: longevityAge,
                inflation_rate: inflationRate
            });

            setResults(response.data);
        } catch (err) {
            // Handle validation errors from FastAPI (array format)
            let errorMessage = 'Calculation failed. Please check your inputs.';

            // Check if this is a network/connection error
            if (err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED' || err.message?.includes('Network Error')) {
                errorMessage = '⚠️ Cannot connect to the calculation server. Please make sure the backend server is running on port 8000. Run: cd backend && python3 -m uvicorn core.integrated_ss_api:app --reload --port 8000';
            } else if (err.response?.data?.detail) {
                if (Array.isArray(err.response.data.detail)) {
                    // Pydantic validation errors
                    errorMessage = err.response.data.detail
                        .map(e => e.msg || JSON.stringify(e))
                        .join(', ');
                } else if (typeof err.response.data.detail === 'string') {
                    errorMessage = err.response.data.detail;
                }
            }
            setError(errorMessage);
            console.error('Calculation error:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    const getStrategyIcon = (type) => {
        switch (type) {
            case 'own': return '👤';
            case 'ex_spouse': return '💑';
            case 'switching': return '🔄';
            case 'child_in_care': return '👶';
            default: return '📊';
        }
    };

    const getStrategyColor = (index) => {
        const colors = [
            'bg-green-50 border-green-500',
            'bg-blue-50 border-blue-500',
            'bg-purple-50 border-purple-500',
            'bg-orange-50 border-orange-500',
            'bg-pink-50 border-pink-500'
        ];
        return colors[index % colors.length];
    };

    const describeStrategy = (strategy) => {
        if (!strategy) return '';

        switch (strategy.type) {
            case 'switching':
                return `Start with the ex-spouse benefit at age ${strategy.claiming_age}, then switch to your own benefit at age ${strategy.switch_age}.`;
            case 'ex_spouse':
                return `Collect the divorced spouse benefit from age ${strategy.claiming_age} onward.`;
            case 'own':
                return `Rely on your own retirement benefit starting at age ${strategy.claiming_age}.`;
            case 'child_in_care':
                return `Receive child-in-care benefits for approximately ${strategy.years_of_benefits?.toFixed?.(1) || strategy.years_of_benefits} years while your child remains under 16.`;
            default:
                return 'Review the projected income for this strategy before you lock it in.';
        }
    };

    // Handle scenario selection for comparison
    const handleScenarioSelection = (index) => {
        setSelectedScenarios(prev => {
            if (prev.includes(index)) {
                // Deselect if already selected
                return prev.filter(i => i !== index);
            } else if (prev.length < 2) {
                // Select if less than 2 selected
                return [...prev, index];
            } else {
                // Replace oldest selection if 2 already selected
                return [prev[1], index];
            }
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        💔 Divorced Social Security Calculator
                    </h1>
                    <p className="text-gray-600">
                        Calculate your optimal Social Security strategy including ex-spouse benefits and child-in-care benefits
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Input Panel */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Information</h2>

                            {/* Birth Date */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Your Birth Date
                                </label>
                                <input
                                    type="date"
                                    value={birthDate}
                                    onChange={(e) => setBirthDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">Current age: {currentAge}</p>
                            </div>

                            {/* Your PIA */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Your PIA at FRA
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        value={ownPia}
                                        onChange={(e) => setOwnPia(e.target.value === '' ? '' : Number(e.target.value))}
                                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Ex-Spouse PIA */}
                            <div className="mb-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <label className="text-sm font-medium text-gray-700">
                                        Ex-Spouse's PIA at FRA
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowExSpousePiaModal(true)}
                                        className="flex items-center gap-1 text-red-600 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-0.5 transition-colors"
                                        aria-label="How to get ex-spouse's PIA information"
                                    >
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-xs font-bold underline decoration-dotted">Important information</span>
                                    </button>
                                </div>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        value={exSpousePia}
                                        onChange={(e) => setExSpousePia(e.target.value === '' ? '' : Number(e.target.value))}
                                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <hr className="my-4" />

                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Marriage Details</h3>

                            {/* Marriage Duration */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Marriage Duration (years)
                                </label>
                                <input
                                    type="number"
                                    value={marriageDurationYears}
                                    onChange={(e) => setMarriageDurationYears(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {marriageDurationYears < 10 && (
                                    <p className="text-xs text-red-600 mt-1">⚠️ Need 10+ years for ex-spouse benefits</p>
                                )}
                            </div>

                            {/* Divorce Date */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Divorce Date
                                </label>
                                <input
                                    type="date"
                                    value={divorceDate}
                                    onChange={(e) => setDivorceDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Remarried */}
                            <div className="mb-4">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={isRemarried}
                                        onChange={(e) => setIsRemarried(e.target.checked)}
                                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Currently remarried</span>
                                </label>
                                {isRemarried && (
                                    <p className="text-xs text-amber-600 mt-1">ℹ️ Cannot claim ex-spouse benefits while remarried</p>
                                )}
                            </div>

                            <hr className="my-4" />

                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Child-in-Care Benefits</h3>

                            {/* Has Child Under 16 */}
                            <div className="mb-4">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={hasChildUnder16}
                                        onChange={(e) => setHasChildUnder16(e.target.checked)}
                                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <span className="text-sm font-medium text-gray-700">I have a child under 16</span>
                                </label>
                            </div>

                            {/* Child Birth Date */}
                            {hasChildUnder16 && (
                                <div className="mb-4 ml-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Child's Birth Date
                                    </label>
                                    <input
                                        type="date"
                                        value={childBirthDate}
                                        onChange={(e) => setChildBirthDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-xs text-green-600 mt-1">
                                        💡 You may be eligible NOW (any age!)
                                    </p>
                                </div>
                            )}

                            <hr className="my-4" />

                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Planning Assumptions</h3>

                            {/* Longevity */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Longevity Age: {longevityAge}
                                </label>
                                <input
                                    type="range"
                                    value={longevityAge}
                                    onChange={(e) => setLongevityAge(Number(e.target.value))}
                                    min="70"
                                    max="100"
                                    className="w-full"
                                />
                            </div>

                            {/* Inflation */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Inflation (COLA): {(inflationRate * 100).toFixed(1)}%
                                </label>
                                <input
                                    type="range"
                                    value={inflationRate}
                                    onChange={(e) => setInflationRate(Number(e.target.value))}
                                    min="0"
                                    max="0.1"
                                    step="0.001"
                                    className="w-full"
                                />
                            </div>

                            {/* Calculate Button */}
                            <button
                                onClick={handleCalculate}
                                disabled={loading}
                                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? 'Calculating...' : 'Calculate Optimal Strategy'}
                            </button>
                        </div>
                    </div>

                    {/* Results Panel */}
                    <div className="lg:col-span-2">
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                                <p className="text-red-800 font-medium">❌ {error}</p>
                            </div>
                        )}

                        {results && (
                            <div className="space-y-6">
                                {/* Own Benefit is Higher - Redirect Message */}
                                {ownPia > (exSpousePia * 0.5) && (
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-600 rounded-lg shadow-lg p-6">
                                        <div className="flex items-start gap-4">
                                            <div className="flex-shrink-0 text-4xl">
                                                👤
                                            </div>
                                            <div className="flex-1">
                                                <h2 className="text-2xl font-bold text-blue-900 mb-3">
                                                    Your Own Benefit is Higher
                                                </h2>
                                                <p className="text-blue-800 mb-4 leading-relaxed">
                                                    Your Social Security retirement benefit (${ownPia.toLocaleString()}) is larger than 50% of your ex-spouse's benefit
                                                    (${(exSpousePia * 0.5).toLocaleString()}). Due to Social Security's <strong>deemed filing rule</strong>,
                                                    you will always receive your own higher benefit, not the ex-spousal amount.
                                                </p>
                                                <div className="bg-white bg-opacity-70 rounded-lg p-4 mb-4">
                                                    <h3 className="font-semibold text-blue-900 mb-2">📋 How Deemed Filing Works:</h3>
                                                    <ul className="space-y-2 text-sm text-blue-800">
                                                        <li className="flex items-start gap-2">
                                                            <span className="text-blue-600 mt-0.5">•</span>
                                                            <span>When you apply for any retirement benefit, Social Security automatically compares all benefits you're eligible for</span>
                                                        </li>
                                                        <li className="flex items-start gap-2">
                                                            <span className="text-blue-600 mt-0.5">•</span>
                                                            <span>You'll always be paid the higher of the two amounts—never both combined</span>
                                                        </li>
                                                        <li className="flex items-start gap-2">
                                                            <span className="text-blue-600 mt-0.5">•</span>
                                                            <span>Since your own benefit exceeds 50% of your ex's benefit, your personal benefit wins</span>
                                                        </li>
                                                        <li className="flex items-start gap-2">
                                                            <span className="text-blue-600 mt-0.5">•</span>
                                                            <span>The ex-spouse's benefit cannot "top off" your personal benefit</span>
                                                        </li>
                                                    </ul>
                                                </div>
                                                <div className="bg-blue-100 rounded-lg p-4 mb-4">
                                                    <p className="text-sm text-blue-900">
                                                        <strong>💡 What This Means:</strong> You should focus on optimizing your own Social Security claiming strategy
                                                        rather than considering ex-spouse benefits. The Married/Single calculator is better suited for your situation.
                                                    </p>
                                                </div>
                                                {onSwitchToMarried && (
                                                    <button
                                                        onClick={onSwitchToMarried}
                                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                                                    >
                                                        <span>→</span>
                                                        <span>Switch to Married/Single Calculator</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Eligibility Status */}
                                <div className={`rounded-lg shadow-sm p-6 ${results.eligible_for_ex_spouse ? 'bg-green-50 border-2 border-green-500' : 'bg-amber-50 border-2 border-amber-500'}`}>
                                    <h2 className="text-xl font-semibold mb-2">
                                        {results.eligible_for_ex_spouse ? '✅ Eligible for Ex-Spouse Benefits' : '⚠️ Eligibility Status'}
                                    </h2>
                                    <p className="text-gray-700">{results.eligibility_reason}</p>
                                </div>

                                {/* Child-in-Care Benefits */}
                                {results.child_in_care_details && results.child_in_care_details.eligible && (
                                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-500 rounded-lg shadow-sm p-6">
                                        <h2 className="text-2xl font-bold text-purple-900 mb-2">
                                            🎉 Child-in-Care Benefits - Eligible NOW!
                                        </h2>
                                        <p className="text-purple-800 mb-4 font-medium">
                                            You don't have to wait until age 62! You can collect benefits RIGHT NOW.
                                        </p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white bg-opacity-60 rounded-lg p-4">
                                                <p className="text-sm text-gray-600 mb-1">Monthly Benefit</p>
                                                <p className="text-2xl font-bold text-purple-900">
                                                    {formatCurrency(results.child_in_care_details.monthly_benefit)}
                                                </p>
                                            </div>
                                            <div className="bg-white bg-opacity-60 rounded-lg p-4">
                                                <p className="text-sm text-gray-600 mb-1">Years of Benefits</p>
                                                <p className="text-2xl font-bold text-purple-900">
                                                    {results.child_in_care_details.years_of_benefits} years
                                                </p>
                                            </div>
                                            <div className="bg-white bg-opacity-60 rounded-lg p-4 col-span-2">
                                                <p className="text-sm text-gray-600 mb-1">Total Value Until Child Turns 16</p>
                                                <p className="text-3xl font-bold text-purple-900">
                                                    {formatCurrency(results.child_in_care_details.total_lifetime_value)}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-sm text-purple-700 mt-4 italic">
                                            💡 Plus you can collect additional benefits from age 62 onwards!
                                        </p>
                                    </div>
                                )}

                                {/* Deemed filing warning */}
                                {results.deemed_filing_applies && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                        <h3 className="text-lg font-semibold text-amber-900 mb-1">
                                            ⚠️ Deemed Filing Applies
                                        </h3>
                                        <p className="text-sm text-amber-800">
                                            Because you were born on or after January 2, 1954, Social Security will
                                            automatically deem you to file for both your own and any ex-spouse benefits at the same
                                            time. Switching from an ex-spouse benefit to your own benefit later is not available
                                            under current rules (exceptions apply only for survivor or child-in-care cases).
                                        </p>
                                    </div>
                                )}

                                {/* Optimal Strategy */}
                                {results.optimal_strategy && (
                                    <div
                                        className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-600 rounded-lg shadow-sm p-6 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => showStrategyDetails(results.optimal_strategy, null)}
                                        onMouseEnter={() => showStrategyDetails(results.optimal_strategy, null)}
                                        onFocus={() => showStrategyDetails(results.optimal_strategy, null)}
                                        onKeyDown={(event) => handleStrategyKey(event, results.optimal_strategy)}
                                    >
                                        <h2 className="text-2xl font-bold text-green-900 mb-4">
                                            🏆 Optimal Strategy
                                        </h2>
                                        <div className="bg-white bg-opacity-60 rounded-lg p-4 mb-4">
                                            <p className="text-lg font-semibold text-gray-900 mb-2">
                                                {getStrategyIcon(results.optimal_strategy.type)} {results.optimal_strategy.strategy}
                                            </p>
                                            <div className="grid grid-cols-2 gap-4 mt-3">
                                                <div>
                                                    <p className="text-sm text-gray-600">Initial Monthly</p>
                                                    <p className="text-xl font-bold text-green-700">
                                                        {formatCurrency(results.optimal_strategy.initial_monthly)}
                                                    </p>
                                                </div>
                                                {results.optimal_strategy.switched_monthly && (
                                                    <div>
                                                        <p className="text-sm text-gray-600">After Switch</p>
                                                        <p className="text-xl font-bold text-green-700">
                                                            {formatCurrency(results.optimal_strategy.switched_monthly)}
                                                        </p>
                                                    </div>
                                                )}
                                                <div className="col-span-2">
                                                    <p className="text-sm text-gray-600">Lifetime Total Value</p>
                                                    <p className="text-3xl font-bold text-green-900">
                                                        {formatCurrency(results.optimal_strategy.lifetime_total)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        {results.all_strategies && results.all_strategies.length > 1 && (
                                            <p className="text-sm text-green-800">
                                                💰 This strategy is worth{' '}
                                                <span className="font-bold">
                                                    {formatCurrency(results.optimal_strategy.lifetime_total - results.all_strategies[1].lifetime_total)}
                                                </span>
                                                {' '}more than the next best option!
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Strategy Comparison Bar Chart */}
                                {results.all_strategies && results.all_strategies.length > 0 && (
                                    <div className="bg-white rounded-lg shadow-sm p-6">
                                        <h2 className="text-xl font-semibold text-gray-900 mb-2">
                                            📊 Strategy Comparison: Worst to Best
                                        </h2>
                                        <p className="text-sm text-gray-600 mb-6">
                                            Visual comparison of all {results.all_strategies.length} strategies analyzed
                                        </p>

                                        <div className="relative">
                                            {(() => {
                                                const strategies = results.all_strategies;
                                                const allValues = strategies.map(s => s.lifetime_total);
                                                const minValue = Math.min(...allValues);
                                                const maxValue = Math.max(...allValues);
                                                const rawRange = Math.max(maxValue - minValue, Math.max(maxValue * 0.05, 5000));
                                                const bottomPadding = rawRange * 0.15;
                                                const topPadding = rawRange * 0.05;
                                                const rawMin = Math.max(0, minValue - bottomPadding);
                                                const rawMax = maxValue + topPadding;
                                                const roundingIncrement = rawMax >= 1000000 ? 25000 : 10000;
                                                const yAxisMin = Math.floor(rawMin / roundingIncrement) * roundingIncrement;
                                                const yAxisMax = Math.ceil(rawMax / roundingIncrement) * roundingIncrement;
                                                const computedRange = yAxisMax - yAxisMin;
                                                const yAxisRange = computedRange > 0 ? computedRange : (yAxisMax || 1);

                                                const formatAxisLabel = (value) => {
                                                    if (value >= 1000000) {
                                                        return `$${(value / 1000000).toFixed(1)}M`;
                                                    }
                                                    return `$${Math.round(value / 1000)}K`;
                                                };

                                                return (
                                                    <>
                                                        {/* Y-axis with values */}
                                                        <div className="flex items-start gap-2 mb-2">
                                                            <div className="text-xs text-gray-500">Lifetime Value</div>
                                                            <div className="text-xs text-gray-600">
                                                                (Y-axis: {formatAxisLabel(yAxisMin)} to {formatAxisLabel(yAxisMax)})
                                                            </div>
                                                        </div>

                                                        {/* Bar chart container */}
                                                        <div className="flex items-end justify-between gap-2 h-96 border-b-2 border-l-2 border-gray-300 pl-2 pb-2">
                                                            {strategies.map((strategy, index) => {
                                                                const heightPercent = Math.min(100, Math.max(0,
                                                                    ((strategy.lifetime_total - yAxisMin) / yAxisRange) * 100
                                                                ));

                                                                const totalStrategies = strategies.length;
                                                                const reverseIndex = totalStrategies - 1 - index;
                                                                const denominator = Math.max(totalStrategies - 1, 1);
                                                                const colorPercent = reverseIndex / denominator;

                                                                let bgColor, borderColor;
                                                                if (colorPercent < 0.33) {
                                                                    bgColor = 'bg-red-400';
                                                                    borderColor = 'border-red-600';
                                                                } else if (colorPercent < 0.67) {
                                                                    bgColor = 'bg-yellow-400';
                                                                    borderColor = 'border-yellow-600';
                                                                } else {
                                                                    bgColor = 'bg-green-400';
                                                                    borderColor = 'border-green-600';
                                                                }

                                                                const isOptimal = index === 0;

                                                                return (
                                                                    <div key={index} className="flex-1 flex flex-col justify-end items-center group relative h-full">
                                                                        {/* Tooltip on hover - positioned above bar */}
                                                                        <div className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap z-20 shadow-lg pointer-events-none">
                                                                            <div className="font-semibold mb-1">{strategy.strategy}</div>
                                                                            <div className="text-green-300">{formatCurrency(strategy.lifetime_total)}</div>
                                                                            {isOptimal && <div className="text-yellow-300 mt-1">👑 Optimal</div>}
                                                                            {/* Arrow */}
                                                                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                                                        </div>

                                                                        {/* Bar */}
                                                                        <div
                                                                            className={`w-full ${bgColor} ${borderColor} border-2 rounded-t transition-all group-hover:opacity-80 cursor-pointer ${isOptimal ? 'ring-4 ring-emerald-500 ring-opacity-50' : ''}`}
                                                                            style={{ height: `${heightPercent}%` }}
                                                                        >
                                                                        </div>

                                                                        {/* Value label on top of bar (for optimal strategy) */}
                                                                        {isOptimal && (
                                                                            <div className="absolute -top-10 text-xs font-bold text-emerald-700 whitespace-nowrap">
                                                                                👑 {formatCurrency(strategy.lifetime_total)}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </>
                                                );
                                            })()}

                                            {/* Legend */}
                                            <div className="flex items-center justify-center gap-6 mt-6 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-4 h-4 bg-green-400 border-2 border-green-600 rounded"></div>
                                                    <span className="text-gray-700">Highest Value</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-4 h-4 bg-yellow-400 border-2 border-yellow-600 rounded"></div>
                                                    <span className="text-gray-700">Mid-Range</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-4 h-4 bg-red-400 border-2 border-red-600 rounded"></div>
                                                    <span className="text-gray-700">Lowest Value</span>
                                                </div>
                                            </div>

                                            {/* Key insight */}
                                            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                <p className="text-sm text-blue-900">
                                                    <span className="font-semibold">💡 Key Insight:</span> The difference between the optimal strategy and the worst strategy is{' '}
                                                    <span className="font-bold text-blue-700">
                                                        {formatCurrency(results.all_strategies[0].lifetime_total - results.all_strategies[results.all_strategies.length - 1].lifetime_total)}
                                                    </span>
                                                    {' '}over your lifetime. Hover over each bar to see details.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* All Strategies Comparison with Inline Detail View */}
                                {results.all_strategies && results.all_strategies.length > 0 && (
                                    <div className="bg-white rounded-lg shadow-sm p-6 relative overflow-hidden">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h2 className="text-xl font-semibold text-gray-900">
                                                    📊 All Strategies Compared
                                                </h2>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    Hover or click any strategy to preview the detailed income timeline.
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {selectedScenarios.length > 0 && (
                                                    <span className="text-sm text-gray-600">
                                                        {selectedScenarios.length} of 2 selected
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => setShowComparisonModal(true)}
                                                    disabled={selectedScenarios.length !== 2}
                                                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                                                >
                                                    Compare Selected ({selectedScenarios.length}/2)
                                                </button>
                                            </div>
                                        </div>
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                            <p className="text-sm text-blue-900">
                                                💡 <strong>Compare Scenarios:</strong> Select any 2 strategies using the checkboxes to see a side-by-side comparison chart.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 relative">
                                            {/* Strategy Cards - Left Side (40%) */}
                                            <div className="lg:col-span-2 space-y-3">
                                                {results.all_strategies.map((strategy, index) => (
                                                    <div
                                                        key={index}
                                                        id={`strategy-card-${index}`}
                                                        className={`border-l-4 rounded-lg p-4 transition-all hover:shadow-md ${getStrategyColor(index)} ${hoveredStrategyIndex === index ? 'shadow-lg scale-[1.02]' : ''} ${selectedScenarios.includes(index) ? 'ring-2 ring-purple-500' : ''}`}
                                                    >
                                                        <div className="flex items-start gap-3 mb-2">
                                                            {/* Checkbox for comparison */}
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedScenarios.includes(index)}
                                                                onChange={(e) => {
                                                                    e.stopPropagation();
                                                                    handleScenarioSelection(index);
                                                                }}
                                                                className="mt-1 h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded cursor-pointer"
                                                                aria-label={`Select ${strategy.strategy} for comparison`}
                                                            />
                                                            <div
                                                                className="flex-1 cursor-pointer"
                                                                role="button"
                                                                tabIndex={0}
                                                                onClick={() => showStrategyDetails(strategy, index)}
                                                                onMouseEnter={() => {
                                                                    showStrategyDetails(strategy, index);
                                                                    setHoveredStrategyIndex(index);
                                                                }}
                                                                onMouseLeave={() => {
                                                                    setHoveredStrategyIndex(null);
                                                                    setDetailPanelOffset(0);
                                                                }}
                                                                onFocus={() => showStrategyDetails(strategy, index)}
                                                                onKeyDown={(event) => handleStrategyKey(event, strategy)}
                                                            >
                                                                <div className="flex justify-between items-start">
                                                                    <div className="flex-1">
                                                                        <p className="font-semibold text-gray-900">
                                                                            {index === 0 && '👑 '}
                                                                            {getStrategyIcon(strategy.type)} {strategy.strategy}
                                                                        </p>
                                                                        <p className="text-sm text-gray-600 mt-1">
                                                                            Initial: {formatCurrency(strategy.initial_monthly)}/month
                                                                            {strategy.switched_monthly && (
                                                                                <> → {formatCurrency(strategy.switched_monthly)}/month</>
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                    <div className="text-right ml-4">
                                                                        <p className="text-xs text-gray-500">Lifetime Value</p>
                                                                        <p className="text-lg font-bold text-gray-900">
                                                                            {formatCurrency(strategy.lifetime_total)}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                {strategy.note && (
                                                                    <p className="text-xs text-gray-600 italic mt-2">{strategy.note}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                <p className="text-sm text-gray-500 mt-3 text-center">
                                                    Analyzed {results.all_strategies.length} strategies
                                                </p>
                                            </div>

                                            {/* Detail Chart - Right Side (60%) - Sticky with dynamic positioning */}
                                            <div
                                                id="inline-detail-chart"
                                                className="lg:col-span-3 flex items-start sticky top-6 self-start transition-transform duration-150 ease-out"
                                                style={{
                                                    transform: `translateY(${detailPanelOffset}px)`
                                                }}
                                            >
                                                {activeStrategyDetails ? (
                                                    <div className="w-full">
                                                        <StrategyTimelineToaster
                                                            strategy={activeStrategyDetails}
                                                            onClose={dismissStrategyDetails}
                                                            clientType="divorced"
                                                            inline={true}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center w-full h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                                        <div className="text-center text-gray-400">
                                                            <svg className="w-16 h-16 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                            </svg>
                                                            <p className="text-sm">Hover over a strategy to see details</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Sankey Flow Animation */}
                                            {hoveredStrategyIndex !== null && activeStrategyDetails && (() => {
                                                const cardColors = {
                                                    0: { from: 'rgba(34, 197, 94, 0.6)', to: 'rgba(34, 197, 94, 0.2)' },   // green
                                                    1: { from: 'rgba(59, 130, 246, 0.6)', to: 'rgba(59, 130, 246, 0.2)' },  // blue
                                                    2: { from: 'rgba(168, 85, 247, 0.6)', to: 'rgba(168, 85, 247, 0.2)' },  // purple
                                                    3: { from: 'rgba(249, 115, 22, 0.6)', to: 'rgba(249, 115, 22, 0.2)' },  // orange
                                                    4: { from: 'rgba(236, 72, 153, 0.6)', to: 'rgba(236, 72, 153, 0.2)' }   // pink
                                                };
                                                const colorIndex = hoveredStrategyIndex % 5;
                                                const color = cardColors[colorIndex];

                                                return (
                                                    <svg
                                                        className="absolute inset-0 pointer-events-none"
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            zIndex: 10
                                                        }}
                                                    >
                                                        <defs>
                                                            <linearGradient id={`sankeyFlow-${hoveredStrategyIndex}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                                                <stop offset="0%" style={{ stopColor: color.from, stopOpacity: 0.8 }} />
                                                                <stop offset="100%" style={{ stopColor: color.to, stopOpacity: 0.3 }} />
                                                            </linearGradient>
                                                        </defs>
                                                        {(() => {
                                                            try {
                                                                const cardElement = document.getElementById(`strategy-card-${hoveredStrategyIndex}`);
                                                                const detailElement = document.getElementById('inline-detail-chart');
                                                                const containerElement = cardElement?.closest('.grid');

                                                                if (!cardElement || !detailElement || !containerElement) return null;

                                                                const cardRect = cardElement.getBoundingClientRect();
                                                                const detailRect = detailElement.getBoundingClientRect();
                                                                const containerRect = containerElement.getBoundingClientRect();

                                                                // Start from right edge of card
                                                                const startX = cardRect.right - containerRect.left;
                                                                const startY = cardRect.top + cardRect.height / 2 - containerRect.top;

                                                                // End at left edge of detail chart
                                                                const endX = detailRect.left - containerRect.left;
                                                                const endYTop = detailRect.top - containerRect.top;
                                                                const endYBottom = detailRect.bottom - containerRect.top;

                                                                // Create flowing path with varying widths (Sankey style)
                                                                const midX = (startX + endX) / 2;

                                                                // Path data for area (filled shape)
                                                                const topPath = `M ${startX},${cardRect.top - containerRect.top} C ${startX + 60},${cardRect.top - containerRect.top} ${midX - 60},${endYTop} ${endX},${endYTop}`;
                                                                const bottomPath = `L ${endX},${endYBottom} C ${midX - 60},${endYBottom} ${startX + 60},${cardRect.bottom - containerRect.top} ${startX},${cardRect.bottom - containerRect.top}`;

                                                                return (
                                                                    <>
                                                                        {/* Sankey flow area */}
                                                                        <path
                                                                            d={`${topPath} ${bottomPath} Z`}
                                                                            fill={`url(#sankeyFlow-${hoveredStrategyIndex})`}
                                                                            opacity="0.4"
                                                                            className="animate-pulse"
                                                                        />
                                                                        {/* Top edge */}
                                                                        <path
                                                                            d={topPath}
                                                                            stroke={color.from}
                                                                            strokeWidth="2"
                                                                            fill="none"
                                                                            opacity="0.6"
                                                                        />
                                                                        {/* Bottom edge */}
                                                                        <path
                                                                            d={bottomPath.substring(2)}
                                                                            stroke={color.from}
                                                                            strokeWidth="2"
                                                                            fill="none"
                                                                            opacity="0.6"
                                                                        />
                                                                    </>
                                                                );
                                                            } catch (e) {
                                                                console.error('Sankey flow error:', e);
                                                                return null;
                                                            }
                                                        })()}
                                                    </svg>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {!results && !error && !loading && (
                            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                                <div className="text-6xl mb-4">💔</div>
                                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                                    Divorced Social Security Calculator
                                </h2>
                                <p className="text-gray-600 max-w-2xl mx-auto">
                                    Enter your information on the left to calculate your optimal Social Security strategy,
                                    including ex-spouse benefits and child-in-care benefits.
                                </p>
                                <div className="mt-6 text-left max-w-2xl mx-auto bg-blue-50 rounded-lg p-4">
                                    <p className="font-semibold text-blue-900 mb-2">💡 Key Benefits You May Qualify For:</p>
                                    <ul className="space-y-2 text-sm text-blue-800">
                                        <li>✅ <strong>Ex-spouse benefits:</strong> Up to 50% of your ex's benefit (if married 10+ years)</li>
                                        <li>✅ <strong>Child-in-care benefits:</strong> Claim at ANY age if you have a child under 16</li>
                                        <li>✅ <strong>Switching strategies:</strong> Take ex-spouse benefit early, switch to your own later</li>
                                        <li>✅ <strong>No impact on ex:</strong> Your benefits don't affect what your ex-spouse receives</li>
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Scenario Comparison Modal */}
            {showComparisonModal && selectedScenarios.length === 2 && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        📊 Scenario Comparison
                                    </h2>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Comparing benefits at key milestone ages
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    {/* Monthly/Annual Toggle */}
                                    <div className="flex bg-gray-100 rounded-lg p-1">
                                        <button
                                            onClick={() => setComparisonViewMode('monthly')}
                                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${comparisonViewMode === 'monthly'
                                                ? 'bg-white text-purple-700 shadow'
                                                : 'text-gray-600 hover:text-gray-900'
                                                }`}
                                        >
                                            Monthly
                                        </button>
                                        <button
                                            onClick={() => setComparisonViewMode('annual')}
                                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${comparisonViewMode === 'annual'
                                                ? 'bg-white text-purple-700 shadow'
                                                : 'text-gray-600 hover:text-gray-900'
                                                }`}
                                        >
                                            Annual
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setShowComparisonModal(false)}
                                        className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded p-1"
                                        aria-label="Close comparison"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {(() => {
                                const scenario1 = results.all_strategies[selectedScenarios[0]];
                                const scenario2 = results.all_strategies[selectedScenarios[1]];
                                const milestoneAges = [62, 67, 70, 75, 80, 85, 90, 95];
                                const multiplier = comparisonViewMode === 'annual' ? 12 : 1;

                                // Get benefits for each milestone age
                                const getData = (strategy) => {
                                    return milestoneAges.map(age => {
                                        if (age < currentAge) {
                                            return null; // N/A for past ages
                                        }

                                        // Find benefit for this age from timeline
                                        const timelineEntry = strategy.benefit_timeline?.find(entry => entry.age === age);
                                        return timelineEntry ? timelineEntry.monthly_benefit * multiplier : null;
                                    });
                                };

                                const data1 = getData(scenario1);
                                const data2 = getData(scenario2);

                                // Find max value for scaling
                                const allValues = [...data1, ...data2].filter(v => v !== null);
                                const maxValue = Math.max(...allValues);
                                const yAxisMax = Math.ceil(maxValue / 1000) * 1000;

                                return (
                                    <div className="space-y-6">
                                        {/* Legend */}
                                        <div className="flex items-center justify-center gap-8">
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 bg-gradient-to-b from-blue-600 to-blue-400 rounded"></div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{scenario1.strategy}</p>
                                                    <p className="text-sm text-gray-600">Lifetime: {formatCurrency(scenario1.lifetime_total)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 bg-gradient-to-b from-orange-500 to-orange-300 rounded"></div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{scenario2.strategy}</p>
                                                    <p className="text-sm text-gray-600">Lifetime: {formatCurrency(scenario2.lifetime_total)}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bar Chart */}
                                        <div className="bg-gray-50 rounded-lg p-6">
                                            <div className="flex items-end justify-between gap-4 h-96 border-b-2 border-l-2 border-gray-300">
                                                {milestoneAges.map((age, index) => {
                                                    const value1 = data1[index];
                                                    const value2 = data2[index];
                                                    const isPast = age < currentAge;

                                                    return (
                                                        <div key={age} className="flex-1 flex flex-col justify-end items-center h-full">
                                                            {/* Age label */}
                                                            <div className="text-xs font-semibold text-gray-700 mb-2">
                                                                Age {age}
                                                            </div>

                                                            {isPast ? (
                                                                /* N/A indicator for past ages */
                                                                <div className="flex flex-col items-center justify-center h-32 w-full">
                                                                    <div className="text-gray-400 text-sm font-medium">N/A</div>
                                                                    <div className="text-gray-400 text-xs">(past)</div>
                                                                </div>
                                                            ) : (
                                                                /* Bars for future ages */
                                                                <div className="flex gap-2 items-end w-full h-full pb-8">
                                                                    {/* Scenario 1 bar - Blue gradient */}
                                                                    <div className="flex-1 flex flex-col items-center justify-end group relative h-full">
                                                                        <div
                                                                            className="w-full bg-gradient-to-b from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 transition-colors rounded-t cursor-pointer shadow-sm"
                                                                            style={{ height: `${(value1 / yAxisMax) * 100}%` }}
                                                                        >
                                                                        </div>
                                                                        {/* Tooltip */}
                                                                        <div className="hidden group-hover:block absolute bottom-full mb-2 bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-20">
                                                                            {formatCurrency(value1)}
                                                                            {comparisonViewMode === 'monthly' ? '/mo' : '/yr'}
                                                                        </div>
                                                                    </div>
                                                                    {/* Scenario 2 bar - Orange gradient */}
                                                                    <div className="flex-1 flex flex-col items-center justify-end group relative h-full">
                                                                        <div
                                                                            className="w-full bg-gradient-to-b from-orange-500 to-orange-300 hover:from-orange-600 hover:to-orange-400 transition-colors rounded-t cursor-pointer shadow-sm"
                                                                            style={{ height: `${(value2 / yAxisMax) * 100}%` }}
                                                                        >
                                                                        </div>
                                                                        {/* Tooltip */}
                                                                        <div className="hidden group-hover:block absolute bottom-full mb-2 bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-20">
                                                                            {formatCurrency(value2)}
                                                                            {comparisonViewMode === 'monthly' ? '/mo' : '/yr'}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Y-axis label */}
                                            <div className="mt-4 text-center">
                                                <p className="text-sm text-gray-600">
                                                    {comparisonViewMode === 'monthly' ? 'Monthly' : 'Annual'} Benefit Amount
                                                </p>
                                            </div>
                                        </div>

                                        {/* Key Insights */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                <h3 className="font-semibold text-blue-900 mb-2">{scenario1.strategy}</h3>
                                                <p className="text-sm text-blue-800">
                                                    {describeStrategy(scenario1)}
                                                </p>
                                            </div>
                                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                                <h3 className="font-semibold text-purple-900 mb-2">{scenario2.strategy}</h3>
                                                <p className="text-sm text-purple-800">
                                                    {describeStrategy(scenario2)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Lifetime Difference */}
                                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                                            <p className="text-center text-gray-900">
                                                <span className="font-semibold">💰 Lifetime Difference:</span>{' '}
                                                <span className="text-lg font-bold text-green-700">
                                                    {formatCurrency(Math.abs(scenario1.lifetime_total - scenario2.lifetime_total))}
                                                </span>
                                                {' '}in favor of{' '}
                                                <span className="font-semibold">
                                                    {scenario1.lifetime_total > scenario2.lifetime_total ? scenario1.strategy : scenario2.strategy}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* Ex-Spouse PIA Info Modal */}
            {showExSpousePiaModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-8">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        📋 How to Get Your Ex-Spouse's PIA Information
                                    </h2>
                                    <p className="text-gray-600 mt-1">Everything you need to know about the "Secret" PIA Rule and requirements.</p>
                                </div>
                                <button
                                    onClick={() => setShowExSpousePiaModal(false)}
                                    className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
                                    aria-label="Close modal"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* 1. The "Secret" PIA Rule */}
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 shadow-sm">
                                    <h3 className="flex items-center text-lg font-bold text-blue-900 mb-3">
                                        <span className="text-2xl mr-2">🤫</span> 1. The "Secret" PIA Rule (Privacy Loophole)
                                    </h3>
                                    <p className="text-blue-800 mb-4 leading-relaxed">
                                        You are correct about the "loophole." In practice, SSA claims specialists often will not explicitly state,
                                        "Your ex-husband's PIA is $3,000." However, by giving you your potential divorced spouse benefit
                                        (e.g., $1,500), they are mathematically revealing it.
                                    </p>

                                    <div className="bg-white bg-opacity-80 rounded-lg p-4 border-l-4 border-blue-500 mb-4">
                                        <p className="text-sm text-blue-900 font-medium mb-1">THE TECHNICAL NUANCE</p>
                                        <p className="text-sm text-gray-700 italic mb-2">
                                            "We may disclose the NH’s [Number Holder's] PIA to his wife... so she can determine whether she would be entitled to a wife's benefit..."
                                            <span className="text-xs text-gray-500 ml-1 block mt-1">— SSA Policy POM GN 03316.110</span>
                                        </p>
                                    </div>

                                    <p className="text-sm text-blue-800">
                                        Despite this, many agents are conservative. The result is the same: you get the number you need to do the math.
                                        <strong> (Benefit × 2 = Ex-Spouse PIA)</strong>.
                                    </p>
                                </div>

                                {/* 2. Document Requirements */}
                                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 shadow-sm">
                                    <h3 className="flex items-center text-lg font-bold text-amber-900 mb-3">
                                        <span className="text-2xl mr-2">📑</span> 2. Document Requirements ("Price of Admission")
                                    </h3>
                                    <p className="text-amber-800 mb-3">
                                        To get this number, you typically cannot just walk in and ask. You must prove you are a potential claimant
                                        by providing <strong>certified copies</strong> of two key documents:
                                    </p>

                                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                                        <div className="bg-white p-3 rounded-lg border border-amber-100">
                                            <p className="font-semibold text-amber-900">1. Marriage Certificate</p>
                                            <p className="text-sm text-gray-600">Must prove the marriage lasted at least <strong>10 years</strong>.</p>
                                        </div>
                                        <div className="bg-white p-3 rounded-lg border border-amber-100">
                                            <p className="font-semibold text-amber-900">2. Divorce Decree</p>
                                            <p className="text-sm text-gray-600">Must prove the marriage is legally ended.</p>
                                        </div>
                                    </div>

                                    <p className="text-xs text-amber-800 bg-amber-100 inline-block px-2 py-1 rounded">
                                        ⚠️ "Certified" means it has the raised seal or official stamp. Photocopies are generally rejected.
                                    </p>

                                    <div className="mt-4">
                                        <p className="text-sm font-semibold text-amber-900 mb-2">Exceptions where you might NOT need papers:</p>
                                        <ul className="text-sm text-amber-800 space-y-1 ml-4 list-disc">
                                            <li><strong>Evidence Already on File:</strong> If you received spousal benefits <em>before</em> the divorce.</li>
                                            <li><strong>Ex-Spouse Claimed You:</strong> If they listed you on a past application.</li>
                                        </ul>
                                    </div>

                                    {/* Source for Exceptions */}
                                    <div className="mt-2 text-xs text-amber-700 italic">
                                        Sources: POMS RS 00202.070, RS 00202.100
                                    </div>
                                </div>

                                {/* 3. Basic Eligibility Cheat Sheet */}
                                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5 shadow-sm">
                                    <h3 className="flex items-center text-lg font-bold text-green-900 mb-3">
                                        <span className="text-2xl mr-2">✅</span> 3. Basic Eligibility "Cheat Sheet"
                                    </h3>
                                    <div className="grid md:grid-cols-2 gap-x-6 gap-y-3">
                                        <div className="flex items-start gap-2">
                                            <span className="text-green-600 text-lg">💍</span>
                                            <div>
                                                <p className="font-semibold text-gray-900 text-sm">Marriage Length</p>
                                                <p className="text-sm text-gray-600">Married for <strong>10 continuous years</strong> or more.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-green-600 text-lg">👤</span>
                                            <div>
                                                <p className="font-semibold text-gray-900 text-sm">Current Status</p>
                                                <p className="text-sm text-gray-600">Currently <strong>unmarried</strong> (unless remarried after 60).</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-green-600 text-lg">🎂</span>
                                            <div>
                                                <p className="font-semibold text-gray-900 text-sm">Your Age</p>
                                                <p className="text-sm text-gray-600">You must be at least <strong>62</strong>.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-green-600 text-lg">⏳</span>
                                            <div>
                                                <p className="font-semibold text-gray-900 text-sm">Divorce Timing</p>
                                                <p className="text-sm text-gray-600">If ex isn't collecting yet, you must be divorced <strong>2+ years</strong>.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-green-200">
                                        <p className="text-sm text-green-900">
                                            <strong>🎓 Expert Note:</strong> Your benefit is 50% of their <em>FRA Benefit</em> (PIA), not 50% of what they visibly receive.
                                            If they claimed early/late, it doesn't hurt your base calculation.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end">
                                <button
                                    onClick={() => setShowExSpousePiaModal(false)}
                                    className="bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transition-all transform hover:scale-105"
                                >
                                    I Understand
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DivorcedCalculator;
