import React, { useState, useEffect, useMemo } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { useCalculatorPersistence } from '../hooks/useCalculatorPersistence';
import { Button } from './ui';
import { getFra, earlyReductionFromAges, drcIncreaseFromAges, adjustPIAForPreClaim } from '../utils/benefitFormulas';

const StartStopStartCalculator = () => {
    // Persistence hook for ALL user inputs
    const { state: persistedState, setState: setPersistedState, isLoaded } = useCalculatorPersistence('startStopStart', {
        pia: 3000,
        birthYear: 1960,
        earlyFilingAge: 62,
        suspensionAge: 67,
        restartAge: 70,
        colaRate: 0.025,
        longevityAge: 95
    });

    // Form inputs
    const [pia, setPia] = useState(3000);
    const [birthYear, setBirthYear] = useState(1960);
    const [earlyFilingAge, setEarlyFilingAge] = useState(62);
    const [suspensionAge, setSuspensionAge] = useState(67);
    const [restartAge, setRestartAge] = useState(70);
    const [colaRate, setColaRate] = useState(0.025);
    const [longevityAge, setLongevityAge] = useState(95);

    // Track if we've loaded initial persisted state
    const hasLoadedPersistedState = React.useRef(false);

    // Load persisted state when it becomes available
    useEffect(() => {
        if (isLoaded && persistedState && !hasLoadedPersistedState.current) {
            hasLoadedPersistedState.current = true;
            if (persistedState.pia !== undefined) setPia(persistedState.pia);
            if (persistedState.birthYear !== undefined) setBirthYear(persistedState.birthYear);
            if (persistedState.earlyFilingAge !== undefined) setEarlyFilingAge(persistedState.earlyFilingAge);
            if (persistedState.suspensionAge !== undefined) setSuspensionAge(persistedState.suspensionAge);
            if (persistedState.restartAge !== undefined) setRestartAge(persistedState.restartAge);
            if (persistedState.colaRate !== undefined) setColaRate(persistedState.colaRate);
            if (persistedState.longevityAge !== undefined) setLongevityAge(persistedState.longevityAge);
        }
    }, [isLoaded, persistedState]);

    // Persist ALL state changes
    useEffect(() => {
        if (isLoaded) {
            setPersistedState({
                pia,
                birthYear,
                earlyFilingAge,
                suspensionAge,
                restartAge,
                colaRate,
                longevityAge
            });
        }
    }, [pia, birthYear, earlyFilingAge, suspensionAge, restartAge, colaRate, longevityAge, isLoaded, setPersistedState]);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    // Calculate all scenarios
    const calculations = useMemo(() => {
        const fra = getFra(birthYear);
        const fraAge = fra.years + (fra.months / 12);

        // Pre-claim PIA adjustment: treat input PIA as at FRA; only grow if claim after FRA
        const getAdjustedPIA = (claimAge) => adjustPIAForPreClaim(pia, claimAge, fraAge, colaRate);

        // Scenario 1: Start-Stop-Start Strategy
        const startStopStart = {
            name: 'Start-Stop-Start',
            color: '#9333EA',
            earlyBenefit: 0,
            restartBenefit: 0,
            totalEarlyPeriod: 0,
            totalSuspensionPeriod: 0,
            totalRestartPeriod: 0,
            lifetimeTotal: 0,
            monthlyByAge: {}
        };

        // Early filing reduction
        const earlyReduction = earlyReductionFromAges(earlyFilingAge, fraAge);
        const adjustedPIAAtEarly = getAdjustedPIA(earlyFilingAge);
        startStopStart.earlyBenefit = adjustedPIAAtEarly * earlyReduction;

        // Calculate total during early period (62 to suspension)
        for (let age = earlyFilingAge; age < suspensionAge; age++) {
            const yearlyBenefit = startStopStart.earlyBenefit * Math.pow(1 + colaRate, age - earlyFilingAge) * 12;
            startStopStart.totalEarlyPeriod += yearlyBenefit;
        }

        // Restart benefit calculation
        // Key: DRCs are additive to the early reduction percentage, not multiplicative
        const adjustedPIAAtRestart = getAdjustedPIA(restartAge);
        const drcIncrease = drcIncreaseFromAges(restartAge, fraAge);
        const finalPercentage = earlyReduction + drcIncrease; // Additive!
        startStopStart.restartBenefit = adjustedPIAAtRestart * finalPercentage;

        // Calculate total during restart period (70 to longevity)
        for (let age = restartAge; age <= longevityAge; age++) {
            const yearlyBenefit = startStopStart.restartBenefit * Math.pow(1 + colaRate, age - restartAge) * 12;
            startStopStart.totalRestartPeriod += yearlyBenefit;
        }

        startStopStart.lifetimeTotal = startStopStart.totalEarlyPeriod + startStopStart.totalRestartPeriod;

        // Build monthly by age for charting
        for (let age = earlyFilingAge; age <= longevityAge; age++) {
            if (age < suspensionAge) {
                startStopStart.monthlyByAge[age] = startStopStart.earlyBenefit * Math.pow(1 + colaRate, age - earlyFilingAge);
            } else if (age < restartAge) {
                startStopStart.monthlyByAge[age] = 0; // Suspended
                // Add to suspension total
                const foregoneBenefit = startStopStart.earlyBenefit * Math.pow(1 + colaRate, age - earlyFilingAge) * 12;
                startStopStart.totalSuspensionPeriod += foregoneBenefit;
            } else {
                startStopStart.monthlyByAge[age] = startStopStart.restartBenefit * Math.pow(1 + colaRate, age - restartAge);
            }
        }

        // Scenario 2: Wait Until 70
        const waitUntil70 = {
            name: 'Wait Until 70',
            color: '#14B8A6',
            monthlyBenefit: 0,
            lifetimeTotal: 0,
            monthlyByAge: {}
        };

        const drc70 = drcIncreaseFromAges(70, fraAge);
        const adjustedPIAAt70 = getAdjustedPIA(70);
        waitUntil70.monthlyBenefit = adjustedPIAAt70 * (1 + drc70);

        for (let age = 70; age <= longevityAge; age++) {
            const yearlyBenefit = waitUntil70.monthlyBenefit * Math.pow(1 + colaRate, age - 70) * 12;
            waitUntil70.lifetimeTotal += yearlyBenefit;
            waitUntil70.monthlyByAge[age] = waitUntil70.monthlyBenefit * Math.pow(1 + colaRate, age - 70);
        }

        // Fill in zeros for ages before 70
        for (let age = earlyFilingAge; age < 70; age++) {
            waitUntil70.monthlyByAge[age] = 0;
        }

        // Scenario 3: File at 62, Never Suspend
        const fileAt62 = {
            name: 'File at 62, Never Suspend',
            color: '#EF4444',
            monthlyBenefit: 0,
            lifetimeTotal: 0,
            monthlyByAge: {}
        };

        const reduction62 = earlyReductionFromAges(62, fraAge);
        const adjustedPIAAt62 = getAdjustedPIA(62);
        fileAt62.monthlyBenefit = adjustedPIAAt62 * reduction62;

        for (let age = 62; age <= longevityAge; age++) {
            const yearlyBenefit = fileAt62.monthlyBenefit * Math.pow(1 + colaRate, age - 62) * 12;
            fileAt62.lifetimeTotal += yearlyBenefit;
            fileAt62.monthlyByAge[age] = fileAt62.monthlyBenefit * Math.pow(1 + colaRate, age - 62);
        }

        // Calculate break-even age (Start-Stop-Start vs File at 62 Never Suspend)
        let breakEvenAge = null;
        const monthlyAdvantage = startStopStart.restartBenefit - (fileAt62.monthlyBenefit * Math.pow(1 + colaRate, restartAge - 62));
        if (monthlyAdvantage > 0) {
            const monthsToBreakEven = startStopStart.totalEarlyPeriod / monthlyAdvantage;
            breakEvenAge = restartAge + (monthsToBreakEven / 12);
        }

        return {
            startStopStart,
            waitUntil70,
            fileAt62,
            breakEvenAge,
            fraAge
        };
    }, [pia, birthYear, earlyFilingAge, suspensionAge, restartAge, colaRate, longevityAge]);

    // Chart data for monthly benefits over time
    const monthlyChartData = useMemo(() => {
        const ages = [];
        for (let age = earlyFilingAge; age <= longevityAge; age++) {
            ages.push(age);
        }

        return {
            labels: ages.map(age => `${age}`),
            datasets: [
                {
                    label: 'Start-Stop-Start',
                    data: ages.map(age => calculations.startStopStart.monthlyByAge[age] || 0),
                    borderColor: calculations.startStopStart.color,
                    backgroundColor: calculations.startStopStart.color + '30',
                    fill: true,
                    tension: 0.1
                },
                {
                    label: 'Wait Until 70',
                    data: ages.map(age => calculations.waitUntil70.monthlyByAge[age] || 0),
                    borderColor: calculations.waitUntil70.color,
                    backgroundColor: 'transparent',
                    borderDash: [5, 5],
                    tension: 0.1
                },
                {
                    label: 'File at 62, Never Suspend',
                    data: ages.map(age => calculations.fileAt62.monthlyByAge[age] || 0),
                    borderColor: calculations.fileAt62.color,
                    backgroundColor: 'transparent',
                    borderDash: [10, 5],
                    tension: 0.1
                }
            ]
        };
    }, [calculations, earlyFilingAge, longevityAge]);

    // Chart data for cumulative totals
    const cumulativeChartData = useMemo(() => {
        const ages = [];
        for (let age = earlyFilingAge; age <= longevityAge; age++) {
            ages.push(age);
        }

        const calculateCumulative = (scenario) => {
            let cumulative = 0;
            return ages.map(age => {
                const monthly = scenario.monthlyByAge[age] || 0;
                cumulative += monthly * 12;
                return cumulative;
            });
        };

        return {
            labels: ages.map(age => `${age}`),
            datasets: [
                {
                    label: 'Start-Stop-Start',
                    data: calculateCumulative(calculations.startStopStart),
                    borderColor: calculations.startStopStart.color,
                    backgroundColor: 'transparent',
                    tension: 0.1,
                    borderWidth: 3
                },
                {
                    label: 'Wait Until 70',
                    data: calculateCumulative(calculations.waitUntil70),
                    borderColor: calculations.waitUntil70.color,
                    backgroundColor: 'transparent',
                    borderDash: [5, 5],
                    tension: 0.1,
                    borderWidth: 2
                },
                {
                    label: 'File at 62, Never Suspend',
                    data: calculateCumulative(calculations.fileAt62),
                    borderColor: calculations.fileAt62.color,
                    backgroundColor: 'transparent',
                    borderDash: [10, 5],
                    tension: 0.1,
                    borderWidth: 2
                }
            ]
        };
    }, [calculations, earlyFilingAge, longevityAge]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom'
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function(value) {
                        return formatCurrency(value);
                    }
                }
            }
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        🔄 Start-Stop-Start Strategy Calculator
                    </h1>
                    <p className="text-gray-600">
                        Analyze the strategy of filing early at 62, suspending at FRA, and restarting at 70 for maximum delayed retirement credits
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Input Panel */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Information</h2>

                            {/* PIA */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Primary Insurance Amount (PIA)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        value={pia}
                                        onChange={(e) => setPia(Number(e.target.value))}
                                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        min="0"
                                        step="100"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Your benefit at Full Retirement Age</p>
                            </div>

                            {/* Birth Year */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Birth Year
                                </label>
                                <input
                                    type="number"
                                    value={birthYear}
                                    onChange={(e) => setBirthYear(Number(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    min="1940"
                                    max="2000"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Your FRA: {(() => {
                                        const fra = getFra(birthYear);
                                        return fra.months > 0 ? `${fra.years} years ${fra.months} months` : `${fra.years} years`;
                                    })()}
                                </p>
                            </div>

                            <hr className="my-4" />

                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Strategy Parameters</h3>

                            {/* Early Filing Age */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Early Filing Age: {earlyFilingAge}
                                </label>
                                <input
                                    type="range"
                                    value={earlyFilingAge}
                                    onChange={(e) => setEarlyFilingAge(Number(e.target.value))}
                                    min="62"
                                    max={suspensionAge - 1}
                                    className="w-full"
                                />
                            </div>

                            {/* Suspension Age */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Suspension Age: {suspensionAge}
                                </label>
                                <input
                                    type="range"
                                    value={suspensionAge}
                                    onChange={(e) => setSuspensionAge(Number(e.target.value))}
                                    min={earlyFilingAge + 1}
                                    max={restartAge - 1}
                                    className="w-full"
                                />
                                <p className="text-xs text-gray-500 mt-1">Typically your FRA ({calculations.fraAge.toFixed(1)})</p>
                            </div>

                            {/* Restart Age */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Restart Age: {restartAge}
                                </label>
                                <input
                                    type="range"
                                    value={restartAge}
                                    onChange={(e) => setRestartAge(Number(e.target.value))}
                                    min={suspensionAge + 1}
                                    max="70"
                                    className="w-full"
                                />
                            </div>

                            <hr className="my-4" />

                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Assumptions</h3>

                            {/* COLA */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    COLA Rate: {(colaRate * 100).toFixed(1)}%
                                </label>
                                <input
                                    type="range"
                                    value={colaRate}
                                    onChange={(e) => setColaRate(Number(e.target.value))}
                                    min="0"
                                    max="0.05"
                                    step="0.001"
                                    className="w-full"
                                />
                            </div>

                            {/* Longevity */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Longevity Age: {longevityAge}
                                </label>
                                <input
                                    type="range"
                                    value={longevityAge}
                                    onChange={(e) => setLongevityAge(Number(e.target.value))}
                                    min="75"
                                    max="100"
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Results Panel */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Key Metrics */}
                        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-500 rounded-lg shadow-sm p-6">
                            <h2 className="text-2xl font-bold text-purple-900 mb-4">
                                🎯 Start-Stop-Start Results
                            </h2>
                            
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-white bg-opacity-60 rounded-lg p-4">
                                    <p className="text-sm text-gray-600 mb-1">Monthly at Age {earlyFilingAge}</p>
                                    <p className="text-2xl font-bold text-purple-900">
                                        {formatCurrency(calculations.startStopStart.earlyBenefit)}
                                    </p>
                                </div>
                                <div className="bg-white bg-opacity-60 rounded-lg p-4">
                                    <p className="text-sm text-gray-600 mb-1">Monthly at Age {restartAge}</p>
                                    <p className="text-2xl font-bold text-purple-900">
                                        {formatCurrency(calculations.startStopStart.restartBenefit)}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white bg-opacity-60 rounded-lg p-4">
                                    <p className="text-xs text-gray-600 mb-1">Early Period Total</p>
                                    <p className="text-sm font-bold text-green-700">
                                        {formatCurrency(calculations.startStopStart.totalEarlyPeriod)}
                                    </p>
                                    <p className="text-xs text-gray-500">Ages {earlyFilingAge}-{suspensionAge}</p>
                                </div>
                                <div className="bg-white bg-opacity-60 rounded-lg p-4">
                                    <p className="text-xs text-gray-600 mb-1">Foregone (Suspended)</p>
                                    <p className="text-sm font-bold text-red-700">
                                        -{formatCurrency(calculations.startStopStart.totalSuspensionPeriod)}
                                    </p>
                                    <p className="text-xs text-gray-500">Ages {suspensionAge}-{restartAge}</p>
                                </div>
                                <div className="bg-white bg-opacity-60 rounded-lg p-4">
                                    <p className="text-xs text-gray-600 mb-1">Restart Period Total</p>
                                    <p className="text-sm font-bold text-green-700">
                                        {formatCurrency(calculations.startStopStart.totalRestartPeriod)}
                                    </p>
                                    <p className="text-xs text-gray-500">Ages {restartAge}-{longevityAge}</p>
                                </div>
                            </div>

                            <div className="mt-4 bg-white bg-opacity-60 rounded-lg p-4">
                                <p className="text-sm text-gray-600 mb-1">Lifetime Total Value</p>
                                <p className="text-3xl font-bold text-purple-900">
                                    {formatCurrency(calculations.startStopStart.lifetimeTotal)}
                                </p>
                            </div>
                        </div>

                        {/* Comparison Table */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h3 className="text-xl font-semibold text-gray-900 mb-4">📊 Strategy Comparison</h3>
                            
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Strategy
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Monthly at {restartAge}
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Lifetime Total
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Difference
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        <tr className="bg-purple-50">
                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-purple-900">
                                                🔄 Start-Stop-Start
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-purple-900">
                                                {formatCurrency(calculations.startStopStart.restartBenefit)}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-purple-900">
                                                {formatCurrency(calculations.startStopStart.lifetimeTotal)}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500">
                                                —
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                                ⏰ Wait Until 70
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                                                {formatCurrency(calculations.waitUntil70.monthlyBenefit)}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                                                {formatCurrency(calculations.waitUntil70.lifetimeTotal)}
                                            </td>
                                            <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-semibold ${
                                                calculations.startStopStart.lifetimeTotal > calculations.waitUntil70.lifetimeTotal
                                                    ? 'text-green-600'
                                                    : 'text-red-600'
                                            }`}>
                                                {calculations.startStopStart.lifetimeTotal > calculations.waitUntil70.lifetimeTotal ? '+' : ''}
                                                {formatCurrency(calculations.startStopStart.lifetimeTotal - calculations.waitUntil70.lifetimeTotal)}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                                📌 File at 62, Never Suspend
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                                                {formatCurrency(calculations.fileAt62.monthlyBenefit * Math.pow(1 + colaRate, restartAge - 62))}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                                                {formatCurrency(calculations.fileAt62.lifetimeTotal)}
                                            </td>
                                            <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-semibold ${
                                                calculations.startStopStart.lifetimeTotal > calculations.fileAt62.lifetimeTotal
                                                    ? 'text-green-600'
                                                    : 'text-red-600'
                                            }`}>
                                                {calculations.startStopStart.lifetimeTotal > calculations.fileAt62.lifetimeTotal ? '+' : ''}
                                                {formatCurrency(calculations.startStopStart.lifetimeTotal - calculations.fileAt62.lifetimeTotal)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Break-Even Analysis */}
                        {calculations.breakEvenAge && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg shadow-sm p-6">
                                <h3 className="text-xl font-semibold text-blue-900 mb-3">
                                    ⚖️ Break-Even Analysis
                                </h3>
                                <p className="text-blue-800 mb-4">
                                    Comparing Start-Stop-Start vs. File at 62, Never Suspend:
                                </p>
                                <div className="bg-white bg-opacity-60 rounded-lg p-4">
                                    <p className="text-sm text-gray-700 mb-2">
                                        <strong>Early benefits collected:</strong> {formatCurrency(calculations.startStopStart.totalEarlyPeriod)}
                                    </p>
                                    <p className="text-sm text-gray-700 mb-2">
                                        <strong>Monthly advantage at restart:</strong> {formatCurrency(calculations.startStopStart.restartBenefit - (calculations.fileAt62.monthlyBenefit * Math.pow(1 + colaRate, restartAge - 62)))}
                                    </p>
                                    <p className="text-lg font-bold text-blue-900 mt-3">
                                        Break-even age: ~{Math.round(calculations.breakEvenAge)} years old
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Monthly Benefits Chart */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h3 className="text-xl font-semibold text-gray-900 mb-4">
                                📈 Monthly Benefits Over Time
                            </h3>
                            <div style={{ height: '400px' }}>
                                <Line data={monthlyChartData} options={chartOptions} />
                            </div>
                        </div>

                        {/* Cumulative Benefits Chart */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h3 className="text-xl font-semibold text-gray-900 mb-4">
                                📊 Cumulative Lifetime Benefits
                            </h3>
                            <div style={{ height: '400px' }}>
                                <Line data={cumulativeChartData} options={chartOptions} />
                            </div>
                        </div>

                        {/* Educational Info */}
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-lg shadow-sm p-6">
                            <h3 className="text-xl font-semibold text-amber-900 mb-3">
                                💡 How the Start-Stop-Start Strategy Works
                            </h3>
                            <div className="space-y-3 text-amber-900">
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">1️⃣</span>
                                    <div>
                                        <p className="font-semibold">File early at age {earlyFilingAge}</p>
                                        <p className="text-sm text-amber-800">Receive reduced benefits immediately</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">2️⃣</span>
                                    <div>
                                        <p className="font-semibold">Suspend benefits at your FRA (age {suspensionAge})</p>
                                        <p className="text-sm text-amber-800">Stop receiving payments to earn delayed retirement credits</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">3️⃣</span>
                                    <div>
                                        <p className="font-semibold">Restart at age {restartAge}</p>
                                        <p className="text-sm text-amber-800">Resume benefits with increased monthly amount from delayed credits</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-amber-200">
                                <p className="text-sm text-amber-800">
                                    <strong>Key Point:</strong> Delayed retirement credits (DRCs) are <em>additive</em>, not multiplicative. 
                                    The 8% annual increase is added to your early reduction percentage, not multiplied by it.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StartStopStartCalculator;
