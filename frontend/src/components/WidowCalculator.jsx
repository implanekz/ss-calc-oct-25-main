import React, { useState } from 'react';
import axios from 'axios';

const WidowCalculator = () => {
    // Form inputs
    const [birthDate, setBirthDate] = useState('1964-01-01');
    const [ownPia, setOwnPia] = useState(1800);
    const [deceasedSpousePia, setDeceasedSpousePia] = useState(2800);
    const [deceasedSpouseDeathDate, setDeceasedSpouseDeathDate] = useState('2023-01-01');
    const [isRemarried, setIsRemarried] = useState(false);
    const [remarriageDate, setRemarriageDate] = useState('');
    const [longevityAge, setLongevityAge] = useState(95);
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

    const calculateRemarriageAge = () => {
        if (!remarriageDate || !birthDate) return null;
        const birth = new Date(birthDate);
        const remarriage = new Date(remarriageDate);
        let age = remarriage.getFullYear() - birth.getFullYear();
        const monthDiff = remarriage.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && remarriage.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    const remarriageAge = calculateRemarriageAge();

    const handleCalculate = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await axios.post('http://localhost:8000/calculate-widow', {
                birth_date: birthDate,
                own_pia: ownPia,
                deceased_spouse_pia: deceasedSpousePia,
                deceased_spouse_death_date: deceasedSpouseDeathDate,
                is_remarried: isRemarried,
                remarriage_date: isRemarried && remarriageDate ? remarriageDate : null,
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
            case 'own_only': return '👤';
            case 'survivor_only': return '🕊️';
            case 'crossover': return '🔄';
            case 'reverse_crossover': return '↩️';
            default: return '📊';
        }
    };

    const getStrategyColor = (index) => {
        const colors = [
            'bg-emerald-50 border-emerald-500',
            'bg-blue-50 border-blue-500',
            'bg-purple-50 border-purple-500',
            'bg-amber-50 border-amber-500',
            'bg-pink-50 border-pink-500'
        ];
        return colors[index % colors.length];
    };

    const isCrossoverStrategy = (type) => {
        return type === 'crossover' || type === 'reverse_crossover';
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        🕊️ Widowed Social Security Calculator
                    </h1>
                    <p className="text-gray-600">
                        Calculate your optimal Social Security strategy including survivor benefits and crossover strategies
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

                            <hr className="my-4" />

                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Deceased Spouse Details</h3>

                            {/* Deceased Spouse PIA */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Deceased Spouse's PIA at FRA
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        value={deceasedSpousePia}
                                        onChange={(e) => setDeceasedSpousePia(Number(e.target.value))}
                                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Death Date */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Date of Spouse's Death
                                </label>
                                <input
                                    type="date"
                                    value={deceasedSpouseDeathDate}
                                    onChange={(e) => setDeceasedSpouseDeathDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <hr className="my-4" />

                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Remarriage Status</h3>

                            {/* Remarried */}
                            <div className="mb-4">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={isRemarried}
                                        onChange={(e) => setIsRemarried(e.target.checked)}
                                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <span className="text-sm font-medium text-gray-700">I have remarried</span>
                                </label>
                            </div>

                            {/* Remarriage Date */}
                            {isRemarried && (
                                <div className="mb-4 ml-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Remarriage Date
                                    </label>
                                    <input
                                        type="date"
                                        value={remarriageDate}
                                        onChange={(e) => setRemarriageDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    {remarriageAge !== null && (
                                        <p className="text-xs mt-1">
                                            {remarriageAge < 60 ? (
                                                <span className="text-red-600">
                                                    ⚠️ Remarried at age {remarriageAge} (before 60 - may affect eligibility)
                                                </span>
                                            ) : (
                                                <span className="text-green-600">
                                                    ✅ Remarried at age {remarriageAge} (after 60 - still eligible!)
                                                </span>
                                            )}
                                        </p>
                                    )}
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
                                <div className={`rounded-lg shadow-sm p-6 ${results.eligible_for_survivor ? 'bg-green-50 border-2 border-green-500' : 'bg-amber-50 border-2 border-amber-500'}`}>
                                    <h2 className="text-xl font-semibold mb-2">
                                        {results.eligible_for_survivor ? '✅ Eligible for Survivor Benefits' : '⚠️ Eligibility Status'}
                                    </h2>
                                    <p className="text-gray-700">{results.eligibility_reason}</p>
                                </div>

                                {/* Optimal Strategy */}
                                {results.optimal_strategy && (
                                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-600 rounded-lg shadow-sm p-6">
                                        <h2 className="text-2xl font-bold text-emerald-900 mb-4">
                                            🏆 Optimal Strategy
                                        </h2>
                                        <div className="bg-white bg-opacity-60 rounded-lg p-4 mb-4">
                                            <p className="text-lg font-semibold text-gray-900 mb-2">
                                                {getStrategyIcon(results.optimal_strategy.type)} {results.optimal_strategy.strategy}
                                            </p>

                                            {isCrossoverStrategy(results.optimal_strategy.type) && (
                                                <div className="bg-blue-50 rounded-lg p-3 mb-3">
                                                    <p className="text-sm font-semibold text-blue-900 mb-2">🔄 Crossover Strategy Explained:</p>
                                                    <p className="text-sm text-blue-800">
                                                        Start with one benefit early while letting the other grow with delayed credits,
                                                        then switch to the higher benefit later for maximum lifetime value.
                                                    </p>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-4 mt-3">
                                                <div>
                                                    <p className="text-sm text-gray-600">Initial Monthly</p>
                                                    <p className="text-xl font-bold text-emerald-700">
                                                        {formatCurrency(results.optimal_strategy.initial_monthly)}
                                                    </p>
                                                </div>
                                                {results.optimal_strategy.switched_monthly && (
                                                    <div>
                                                        <p className="text-sm text-gray-600">After Switch</p>
                                                        <p className="text-xl font-bold text-emerald-700">
                                                            {formatCurrency(results.optimal_strategy.switched_monthly)}
                                                        </p>
                                                    </div>
                                                )}
                                                <div className="col-span-2">
                                                    <p className="text-sm text-gray-600">Lifetime Total Value</p>
                                                    <p className="text-3xl font-bold text-emerald-900">
                                                        {formatCurrency(results.optimal_strategy.lifetime_total)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        {results.all_strategies && results.all_strategies.length > 1 && (
                                            <p className="text-sm text-emerald-800">
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
                                                                // Calculate bar height based on dynamic Y-axis
                                                                const heightPercent = Math.min(100, Math.max(0,
                                                                    ((strategy.lifetime_total - yAxisMin) / yAxisRange) * 100
                                                                ));

                                                                // Color gradient: red (worst) → yellow (middle) → green (best)
                                                                const totalStrategies = strategies.length;
                                                                const reverseIndex = totalStrategies - 1 - index;
                                                                const denominator = Math.max(totalStrategies - 1, 1);
                                                                const colorPercent = reverseIndex / denominator;

                                                               let bgColor, borderColor;
                                                               if (colorPercent < 0.33) {
                                                                   // Worst third: Red
                                                                   bgColor = 'bg-red-400';
                                                                    borderColor = 'border-red-600';
                                                                } else if (colorPercent < 0.67) {
                                                                    // Middle third: Yellow/Orange
                                                                    bgColor = 'bg-yellow-400';
                                                                    borderColor = 'border-yellow-600';
                                                                } else {
                                                                    // Best third: Green
                                                                    bgColor = 'bg-green-400';
                                                                    borderColor = 'border-green-600';
                                                                }

                                                                // Highlight the optimal strategy
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
                                                        {formatCurrency(strategies[0].lifetime_total - strategies[strategies.length - 1].lifetime_total)}
                                                    </span>
                                                    {' '}over your lifetime. Hover over each bar to see details.
                                                </p>
                                            </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
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
                                                            {isCrossoverStrategy(strategy.type) && (
                                                                <p className="text-xs text-gray-500 mt-1">
                                                                    🔄 Crossover at age {strategy.switch_age}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="text-right ml-4">
                                                            <p className="text-xs text-gray-500">Lifetime Value</p>
                                                            <p className="text-lg font-bold text-gray-900">
                                                                {formatCurrency(strategy.lifetime_total)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-sm text-gray-500 mt-3 text-center">
                                            Analyzed {results.all_strategies.length} strategies to find your optimal solution
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {!results && !error && !loading && (
                            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                                <div className="text-6xl mb-4">🕊️</div>
                                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                                    Widowed Social Security Calculator
                                </h2>
                                <p className="text-gray-600 max-w-2xl mx-auto mb-6">
                                    Enter your information on the left to calculate your optimal Social Security strategy,
                                    including survivor benefits and powerful crossover strategies.
                                </p>
                                <div className="text-left max-w-2xl mx-auto bg-purple-50 rounded-lg p-4">
                                    <p className="font-semibold text-purple-900 mb-2">💡 Key Benefits You May Qualify For:</p>
                                    <ul className="space-y-2 text-sm text-purple-800">
                                        <li>✅ <strong>Survivor benefits:</strong> Up to 100% of your deceased spouse's benefit</li>
                                        <li>✅ <strong>Early claiming at 60:</strong> Can claim survivor benefits as early as age 60</li>
                                        <li>✅ <strong>Crossover strategy:</strong> Take one benefit early, switch to the other later (often optimal!)</li>
                                        <li>✅ <strong>Remarriage after 60:</strong> You can still claim survivor benefits if you remarried after age 60</li>
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

export default WidowCalculator;
