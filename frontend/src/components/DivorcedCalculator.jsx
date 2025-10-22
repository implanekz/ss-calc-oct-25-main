import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { StrategyTimelineToaster } from './ui';

const DivorcedCalculator = ({ onSwitchToMarried }) => {
    // Form inputs
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
            const response = await axios.post('http://localhost:8000/calculate-divorced', {
                birth_date: birthDate,
                own_pia: ownPia,
                ex_spouse_pia: exSpousePia,
                marriage_duration_years: marriageDurationYears,
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
                                        onChange={(e) => setOwnPia(Number(e.target.value))}
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
                                        className="text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-0.5"
                                        aria-label="How to get ex-spouse's PIA information"
                                    >
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        value={exSpousePia}
                                        onChange={(e) => setExSpousePia(Number(e.target.value))}
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
                                    onChange={(e) => setMarriageDurationYears(Number(e.target.value))}
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
                                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                            📊 All Strategies Compared
                                        </h2>
                                        <p className="text-sm text-gray-500 mb-3">
                                            Hover or click any strategy to preview the detailed income timeline.
                                        </p>
                                        
                                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 relative">
                                            {/* Strategy Cards - Left Side (40%) */}
                                            <div className="lg:col-span-2 space-y-3">
                                                {results.all_strategies.map((strategy, index) => (
                                                    <div
                                                        key={index}
                                                        id={`strategy-card-${index}`}
                                                        className={`border-l-4 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 ${getStrategyColor(index)} ${hoveredStrategyIndex === index ? 'shadow-lg scale-[1.02]' : ''}`}
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
                                                        <div className="flex justify-between items-start mb-2">
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

            {/* Ex-Spouse PIA Info Modal */}
            {showExSpousePiaModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    📋 How to Get Your Ex-Spouse's PIA Information
                                </h2>
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

                            <div className="space-y-4">
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                    <h3 className="text-lg font-semibold text-amber-900 mb-2">
                                        ⚠️ Important: Social Security Won't Tell You Directly
                                    </h3>
                                    <p className="text-amber-800">
                                        Social Security will <strong>NOT</strong> disclose your ex-spouse's actual PIA amount to you due to privacy regulations.
                                    </p>
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <h3 className="text-lg font-semibold text-blue-900 mb-3">
                                        ✅ What You CAN Ask For
                                    </h3>
                                    <p className="text-blue-800 mb-3">
                                        Instead, ask Social Security this specific question:
                                    </p>
                                    <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
                                        <p className="text-blue-900 font-semibold italic">
                                            "If I were to file for divorced spouse benefits at my full retirement age, what would that monthly benefit amount be?"
                                        </p>
                                    </div>
                                    <p className="text-blue-800 mt-3 text-sm">
                                        Social Security will tell you this amount, which is 50% of your ex-spouse's PIA. You can then multiply by 2 to calculate the ex-spouse's actual PIA.
                                    </p>
                                </div>

                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <h3 className="text-lg font-semibold text-green-900 mb-3">
                                        📄 Required Documentation
                                    </h3>
                                    <p className="text-green-800 mb-3">
                                        When contacting Social Security, you'll need to provide:
                                    </p>
                                    <ul className="space-y-2 text-green-800">
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-600 mt-0.5">•</span>
                                            <span><strong>Certified copy of marriage certificate</strong></span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-green-600 mt-0.5">•</span>
                                            <span><strong>Certified copy of divorce decree</strong></span>
                                        </li>
                                    </ul>
                                </div>

                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                    <h3 className="text-lg font-semibold text-purple-900 mb-2">
                                        ⏱️ The 10-Year Rule
                                    </h3>
                                    <p className="text-purple-800">
                                        The dates on your marriage certificate and divorce decree must be <strong>10 years or more apart</strong> to qualify for divorced spouse benefits. 
                                        Social Security will verify this when you provide the documents.
                                    </p>
                                </div>

                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                        💡 Quick Calculation Example
                                    </h3>
                                    <div className="space-y-2 text-sm text-gray-700">
                                        <p>If Social Security tells you that your divorced spouse benefit at FRA would be <strong>$1,400/month</strong>:</p>
                                        <p className="pl-4">→ Your ex-spouse's PIA = $1,400 × 2 = <strong className="text-blue-600">$2,800</strong></p>
                                        <p className="pl-4 text-gray-600 italic">Enter $2,800 in the "Ex-Spouse's PIA at FRA" field above</p>
                                    </div>
                                </div>

                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                    <h3 className="text-lg font-semibold text-orange-900 mb-2">
                                        ⏰ Start Early
                                    </h3>
                                    <p className="text-orange-800">
                                        With current resource constraints at Social Security, obtaining this information may take time. 
                                        It's best to <strong>start the process early</strong> to ensure you have accurate numbers for your planning.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={() => setShowExSpousePiaModal(false)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                                >
                                    Got It
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
