import React, { useState } from 'react';
import axios from 'axios';

const DivorcedCalculator = () => {
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
            if (err.response?.data?.detail) {
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Ex-Spouse's PIA at FRA
                                </label>
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

                                {/* Optimal Strategy */}
                                {results.optimal_strategy && (
                                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-600 rounded-lg shadow-sm p-6">
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

                                {/* All Strategies Comparison */}
                                {results.all_strategies && results.all_strategies.length > 0 && (
                                    <div className="bg-white rounded-lg shadow-sm p-6">
                                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                            📊 All Strategies Compared
                                        </h2>
                                        <div className="space-y-3">
                                            {results.all_strategies.map((strategy, index) => (
                                                <div
                                                    key={index}
                                                    className={`border-l-4 rounded-lg p-4 ${getStrategyColor(index)}`}
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
        </div>
    );
};

export default DivorcedCalculator;
