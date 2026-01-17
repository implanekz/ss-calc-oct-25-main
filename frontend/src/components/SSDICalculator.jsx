import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useCalculatorPersistence } from '../hooks/useCalculatorPersistence';
import { API_BASE_URL } from '../config/api';
import { Bar } from 'react-chartjs-2';
// Re-using UI components from other calculators for consistency
// Assuming these are available as seen in ShowMeTheMoneyCalculator/DivorcedCalculator

const SSDICalculator = () => {
    // Persistence hook
    const { state: persistedState, setState: setPersistedState, isLoaded } = useCalculatorPersistence('ssdi', {
        birthDate: '1963-01-01',
        pia: 2000,
        inflationRate: 0.025,
        longevityAge: 90
    });

    const [birthDate, setBirthDate] = useState('1963-01-01');
    const [activeFaq, setActiveFaq] = useState(null);

    // Year View State
    const [yearViewEnabled, setYearViewEnabled] = useState(false);
    const [selectedYear, setSelectedYear] = useState(70);
    const [showYearModal, setShowYearModal] = useState(false);
    const [pia, setPia] = useState(2000);
    const [inflationRate, setInflationRate] = useState(0.025);
    const [longevityAge, setLongevityAge] = useState(90);

    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Initial load from persistence
    const hasLoadedPersistedState = React.useRef(false);
    useEffect(() => {
        if (isLoaded && persistedState && !hasLoadedPersistedState.current) {
            hasLoadedPersistedState.current = true;
            if (persistedState.birthDate) setBirthDate(persistedState.birthDate);
            if (persistedState.pia) setPia(persistedState.pia);
            if (persistedState.inflationRate) setInflationRate(persistedState.inflationRate);
            if (persistedState.longevityAge) setLongevityAge(persistedState.longevityAge);
        }
    }, [isLoaded, persistedState]);

    // Save to persistence
    useEffect(() => {
        if (isLoaded) {
            setPersistedState({
                birthDate,
                pia,
                inflationRate,
                longevityAge
            });
        }
    }, [birthDate, pia, inflationRate, longevityAge, isLoaded, setPersistedState]);

    const calculateAge = (dob) => {
        const today = new Date();
        const birthDate = new Date(dob);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const currentAge = calculateAge(birthDate);

    const handleCalculate = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post(`${API_BASE_URL}/calculate-ssdi`, {
                birth_date: birthDate,
                pia: Number(pia),
                inflation_rate: Number(inflationRate),
                longevity_age: Number(longevityAge)
            });
            setResults(response.data);
        } catch (err) {
            console.error(err);
            setError('Failed to calculate SSDI benefits. Please check your inputs and try again.');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(val);
    };

    // Chart Data Preparation
    const getChartData = () => {
        if (!results || !results.timeline) return null;

        const labels = results.timeline.map(t => t.age);
        const stdData = results.timeline.map(t => t.std_monthly);
        const suspendData = results.timeline.map(t => t.suspend_monthly);

        return {
            labels,
            datasets: [
                {
                    label: 'Standard (Keep Benefit at FRA)',
                    data: stdData,
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 1
                },
                {
                    label: 'Suspend at FRA (Wait to 70)',
                    data: suspendData,
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: 'rgb(16, 185, 129)',
                    borderWidth: 1
                }
            ]
        };
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        ♿ SSDI & Disability Planner
                    </h1>
                    <p className="text-gray-600">
                        Compare Social Security Disability Insurance (SSDI) with Early Retirement, and explore strategies to maximize your lifetime value.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* LEFT PANEL: Inputs */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Information</h2>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                                <input
                                    type="date"
                                    value={birthDate}
                                    onChange={(e) => setBirthDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">Current Age: {currentAge}</p>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated PIA (Monthly Benefit)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        value={pia}
                                        onChange={(e) => setPia(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Your full benefit amount if disabled.</p>
                            </div>

                            <hr className="my-4" />

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Longevity Age: {longevityAge}</label>
                                <input
                                    type="range"
                                    min="70" max="100"
                                    value={longevityAge}
                                    onChange={(e) => setLongevityAge(e.target.value)}
                                    onMouseUp={handleCalculate}
                                    onTouchEnd={handleCalculate}
                                    className="w-full"
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Inflation Rate: {(inflationRate * 100).toFixed(1)}%</label>
                                <input
                                    type="range"
                                    min="0" max="0.1" step="0.001"
                                    value={inflationRate}
                                    onChange={(e) => setInflationRate(e.target.value)}
                                    onMouseUp={handleCalculate}
                                    onTouchEnd={handleCalculate}
                                    className="w-full"
                                />
                            </div>

                            <button
                                onClick={handleCalculate}
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex justify-center items-center"
                            >
                                {loading ? (
                                    <span className="animate-spin mr-2">⚪</span>
                                ) : null}
                                Calculate Strategy
                            </button>
                        </div>

                        {/* FAQ Section */}
                        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-3">Frequently Asked Questions</h3>

                            <div className="space-y-4">
                                <details className="group">
                                    <summary className="flex justify-between items-center font-medium cursor-pointer list-none">
                                        <span>How is SSDI calculated?</span>
                                        <span className="transition group-open:rotate-180">
                                            <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                                        </span>
                                    </summary>
                                    <p className="text-gray-600 mt-3 text-sm group-open:animate-fadeIn">
                                        SSDI uses the same Primary Insurance Amount (PIA) formula as retirement benefits. It typically pays 100% of your PIA, regardless of your age when you claim (unlike early retirement).
                                    </p>
                                </details>

                                <details className="group">
                                    <summary className="flex justify-between items-center font-medium cursor-pointer list-none">
                                        <span>What happens at Full Retirement Age (FRA)?</span>
                                        <span className="transition group-open:rotate-180">
                                            <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                                        </span>
                                    </summary>
                                    <p className="text-gray-600 mt-3 text-sm group-open:animate-fadeIn">
                                        Your SSDI benefit automatically converts to a regular retirement benefit. The monthly amount stays the same. You don't need to do anything.
                                    </p>
                                </details>

                                <details className="group">
                                    <summary className="flex justify-between items-center font-medium cursor-pointer list-none">
                                        <span>Can I earn delayed credits on SSDI?</span>
                                        <span className="transition group-open:rotate-180">
                                            <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                                        </span>
                                    </summary>
                                    <p className="text-gray-600 mt-3 text-sm group-open:animate-fadeIn">
                                        Not while receiving SSDI. However, once you reach FRA, you can voluntarily calculate to <strong>suspend</strong> your benefit (stop receiving checks) until age 70 to earn delayed retirement credits (8% per year).
                                    </p>
                                </details>
                                <details className="group">
                                    <summary className="flex justify-between items-center font-medium cursor-pointer list-none">
                                        <span>What is the "Disability Freeze"?</span>
                                        <span className="transition group-open:rotate-180">
                                            <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                                        </span>
                                    </summary>
                                    <div className="text-gray-600 mt-3 text-sm group-open:animate-fadeIn">
                                        <p className="mb-2">
                                            Think of your earnings record like a smoothie. Social Security blends your highest 35 years of earnings to determine your benefit.
                                        </p>
                                        <p className="mb-2">
                                            <strong>Without Freeze:</strong> If you stop working due to disability, you add "zero-income" years to the mix, making the smoothie (your benefit) watery and weak.
                                        </p>
                                        <p>
                                            <strong>With Freeze:</strong> SSDI hits the "pause button." It throws out those empty years so they don't drag down your average. This protects your benefit amount, keeping it as strong as if you were still working.
                                        </p>
                                    </div>
                                </details>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT PANEL: Results */}
                    <div className="lg:col-span-2 space-y-6">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                                {error}
                            </div>
                        )}

                        {!results && !loading && (
                            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center text-gray-500">
                                Enter your details and click "Calculate" to see your SSDI analysis.
                            </div>
                        )}

                        {results && (
                            <>
                                {/* 1. SSDI vs Early Retirement Card */}
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                                        <h2 className="text-xl font-bold text-white">SSDI vs. Early Retirement</h2>
                                        <p className="text-blue-100 text-sm">Why disability approval protects your income</p>
                                    </div>
                                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                        {/* SSDI Side */}
                                        <div className="text-center">
                                            <div className="inline-block p-4 rounded-full bg-blue-50 mb-3">
                                                <span className="text-4xl">♿</span>
                                            </div>
                                            <h3 className="font-bold text-gray-900">SSDI Benefit</h3>
                                            <p className="text-xs text-gray-500 mb-2">If approved for disability</p>
                                            <p className="text-3xl font-bold text-blue-600">{formatCurrency(results.ssdi_monthly_benefit)}</p>
                                            <p className="text-sm font-medium text-green-600 mt-1">100% of PIA (Full Value)</p>
                                        </div>

                                        {/* Early Retirement Side */}
                                        <div className="text-center relative">
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-full w-px bg-gray-200 hidden md:block"></div>
                                            <div className="inline-block p-4 rounded-full bg-orange-50 mb-3">
                                                <span className="text-4xl">📉</span>
                                            </div>
                                            <h3 className="font-bold text-gray-900">Early Retirement</h3>
                                            <p className="text-xs text-gray-500 mb-2">Filing at age {currentAge >= 62 ? Math.floor(currentAge) : 62}</p>
                                            {results.early_retirement.eligible ? (
                                                <>
                                                    <p className="text-3xl font-bold text-orange-600">{formatCurrency(results.early_retirement.monthly_amount)}</p>
                                                    <p className="text-sm font-medium text-red-600 mt-1">
                                                        Reduced by {results.early_retirement.reduction_percent.toFixed(1)}%
                                                    </p>
                                                </>
                                            ) : (
                                                <p className="text-gray-500 italic py-2">Not yet eligible (Must be 62+)</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-blue-50 px-6 py-3 border-t border-blue-100">
                                        <p className="text-sm text-blue-800">
                                            <strong>Key Insight:</strong> Getting approved for SSDI "locks in" your full retirement benefit immediately, avoiding the permanent reduction of filing early for retirement.
                                        </p>
                                    </div>
                                </div>

                                {/* 2. The "Aha!" Moment: Suspension Strategy */}
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                    <h2 className="text-xl font-bold text-gray-900 mb-4">💡 The "Hidden" Benefit Boost Strategy</h2>
                                    <p className="text-gray-600 mb-6">
                                        At your Full Retirement Age ({results.fra_age.toFixed(0)}), your SSDI converts to retirement.
                                        Most people continue receiving the same check. However, you have an option to <strong>Suspend</strong> payments
                                        until age 70 to earn Delayed Retirement Credits.
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                        {/* Standard Path Card */}
                                        <div className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                                            <h3 className="font-bold text-gray-700 mb-2">Path A: Standard Comparison</h3>
                                            <p className="text-sm text-gray-500 mb-4">Keep receiving checks seamlessly from FRA onwards.</p>
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-end">
                                                    <span className="text-sm text-gray-600">Monthly at 70:</span>
                                                    <span className="text-xl font-bold text-gray-900">{formatCurrency(results.strategies.standard.monthly_at_70)}*</span>
                                                </div>
                                                <div className="flex justify-between items-end border-t pt-2">
                                                    <span className="text-sm text-gray-600">Lifetime Total:</span>
                                                    <span className="text-lg font-semibold text-gray-900">{formatCurrency(results.strategies.standard.lifetime_total)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Suspension Path Card */}
                                        <div className="border border-green-200 bg-green-50 rounded-xl p-4 hover:border-green-300 transition-colors">
                                            <h3 className="font-bold text-green-800 mb-2">Path B: Suspend & Grow</h3>
                                            <p className="text-sm text-green-700 mb-4">
                                                Stop checks from FRA to 70. You earn <strong>8% Delayed Retirement Credits</strong> per year, resuming with a ~24% boost.
                                            </p>
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-end">
                                                    <span className="text-sm text-green-800">Monthly at 70:</span>
                                                    <span className="text-2xl font-bold text-green-700">{formatCurrency(results.strategies.suspension.monthly_at_70)}*</span>
                                                </div>
                                                <div className="flex justify-between items-end border-t border-green-200 pt-2">
                                                    <span className="text-sm text-green-800">Lifetime Total:</span>
                                                    <span className="text-lg font-semibold text-green-700">{formatCurrency(results.strategies.suspension.lifetime_total)}</span>
                                                </div>
                                                {results.strategies.suspension.break_even_age && (
                                                    <div className="flex justify-between items-end border-t border-green-200 pt-2 mt-2">
                                                        <span className="text-sm text-green-800 font-bold">Break-Even Age:</span>
                                                        <span className="text-lg font-bold text-black border-b-2 border-black">
                                                            {results.strategies.suspension.break_even_age.toFixed(1)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Chart */}
                                    <div className="h-80 w-full mb-4">
                                        <Bar
                                            data={getChartData()}
                                            plugins={[{
                                                id: 'breakEvenLine',
                                                afterDraw: (chart) => {
                                                    if (!results || !results.strategies.suspension.break_even_age) return;
                                                    const breakEvenAge = results.strategies.suspension.break_even_age;
                                                    const ctx = chart.ctx;
                                                    const xAxis = chart.scales.x;
                                                    const yAxis = chart.scales.y;

                                                    // Find index for the age (approximate since bars are categorical)
                                                    const ageLabels = results.timeline.map(t => t.age);
                                                    let index = ageLabels.findIndex(a => a >= breakEvenAge);
                                                    if (index === -1) return;

                                                    // Interpolate position relative to bars? simpler to just snap to bar center
                                                    const x = xAxis.getPixelForValue(index);

                                                    ctx.save();
                                                    ctx.beginPath();
                                                    ctx.strokeStyle = 'black';
                                                    ctx.lineWidth = 2;
                                                    ctx.setLineDash([5, 5]); // Dashed line
                                                    ctx.moveTo(x, yAxis.top);
                                                    ctx.lineTo(x, yAxis.bottom);
                                                    ctx.stroke();

                                                    // Label
                                                    ctx.setLineDash([]);
                                                    ctx.fillStyle = 'black';
                                                    ctx.font = 'bold 12px sans-serif';
                                                    ctx.textAlign = 'center';
                                                    ctx.fillText(`Break-Even: ${breakEvenAge.toFixed(1)}`, x, yAxis.top + 10);

                                                    ctx.restore();
                                                }
                                            }]}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: {
                                                    title: {
                                                        display: true,
                                                        text: 'Monthly Income Projection (Inflation Adjusted)'
                                                    },
                                                    tooltip: {
                                                        callbacks: {
                                                            label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
                                                        }
                                                    }
                                                },
                                                scales: {
                                                    y: {
                                                        ticks: {
                                                            callback: (val) => '$' + val.toLocaleString()
                                                        }
                                                    }
                                                },
                                                animation: {
                                                    delay: (context) => {
                                                        let delay = 0;
                                                        if (context.type === 'data' && context.mode === 'default') {
                                                            const sequenceDuration = 1000; // 1 second total sequence
                                                            const dataSize = context.chart.data.labels.length;
                                                            const dataIndex = context.dataIndex;
                                                            const delayPerBar = dataSize > 0 ? sequenceDuration / dataSize : 0;
                                                            delay = dataIndex * delayPerBar;
                                                        }
                                                        return delay;
                                                    },
                                                    duration: 500
                                                }
                                            }}
                                        />
                                    </div>

                                    {/* Year View Control Panel */}
                                    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
                                        <h4 className="font-bold text-gray-900 mb-2">Show Me Just This Single Year</h4>
                                        <div className="flex items-center gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={yearViewEnabled}
                                                    onChange={(e) => {
                                                        setYearViewEnabled(e.target.checked);
                                                        if (e.target.checked) setShowYearModal(true);
                                                    }}
                                                    className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                                                />
                                                <span className="text-sm text-gray-700">Enable year view</span>
                                            </label>

                                            {yearViewEnabled && (
                                                <select
                                                    value={selectedYear}
                                                    onChange={(e) => {
                                                        setSelectedYear(Number(e.target.value));
                                                        setShowYearModal(true);
                                                    }}
                                                    className="block w-24 pl-3 pr-10 py-1 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                                                >
                                                    {results.timeline.map(t => (
                                                        <option key={t.age} value={t.age}>{t.age}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400 text-right">*Monthly amounts shown in today's dollars for comparing value.</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
            {/* Year Detail Modal */}
            {showYearModal && results && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowYearModal(false)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
                            <div className="absolute top-0 right-0 pt-4 pr-4">
                                <button
                                    type="button"
                                    className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                    onClick={() => setShowYearModal(false)}
                                >
                                    <span className="sr-only">Close</span>
                                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="sm:flex sm:items-start w-full">
                                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                    <h3 className="text-3xl font-bold leading-6 text-gray-900 mb-2" id="modal-title">
                                        Benefits at Age {selectedYear}
                                    </h3>
                                    <p className="text-gray-500 mb-8">Comparing filing strategies for this specific year.</p>

                                    {(() => {
                                        const yearData = results.timeline.find(t => t.age === selectedYear);
                                        if (!yearData) return null;

                                        const isBestSuspend = yearData.suspend_cumulative >= yearData.std_cumulative;
                                        const diffMonthly = yearData.suspend_monthly - yearData.std_monthly;

                                        return (
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* Standard Strategy Card */}
                                                    <div className={`rounded-xl border-2 p-6 ${!isBestSuspend ? 'border-primary-500 bg-primary-50 shadow-lg ring-2 ring-primary-200' : 'border-gray-200 bg-white'}`}>
                                                        {!isBestSuspend && (
                                                            <div className="absolute -mt-10 bg-primary-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-md transform -translate-x-2">
                                                                🏆 Best Value
                                                            </div>
                                                        )}
                                                        <h4 className={`text-xl font-bold mb-4 ${!isBestSuspend ? 'text-primary-700' : 'text-gray-700'}`}>Standard (SSDI → Retirement)</h4>

                                                        {yearData.std_monthly > 0 ? (
                                                            <div className="bg-primary-100/50 text-primary-800 px-4 py-2 rounded-lg mb-6 text-center font-medium">
                                                                ✅ Receiving benefits
                                                            </div>
                                                        ) : (
                                                            <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg mb-6 text-center">
                                                                ⏳ Deferring benefits
                                                            </div>
                                                        )}

                                                        <div className="space-y-6">
                                                            <div>
                                                                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Monthly</p>
                                                                <p className={`text-3xl font-bold ${!isBestSuspend ? 'text-primary-700' : 'text-gray-900'}`}>
                                                                    {formatCurrency(yearData.std_monthly)}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Annual</p>
                                                                <p className={`text-xl font-bold ${!isBestSuspend ? 'text-primary-700' : 'text-gray-900'}`}>
                                                                    {formatCurrency(yearData.std_monthly * 12)}
                                                                </p>
                                                                <p className="text-xs text-gray-400">12 months paid this year</p>
                                                            </div>
                                                            <div className="bg-gray-50 p-3 rounded-lg">
                                                                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Cumulative Since {results.current_age}</p>
                                                                <p className={`text-xl font-bold ${!isBestSuspend ? 'text-primary-700' : 'text-gray-700'}`}>
                                                                    {formatCurrency(yearData.std_cumulative)}
                                                                </p>
                                                            </div>
                                                            {selectedYear >= 70 && (
                                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                                    <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Cumulative Since 70</p>
                                                                    <p className={`text-xl font-bold ${!isBestSuspend ? 'text-primary-700' : 'text-gray-700'}`}>
                                                                        {formatCurrency(yearData.std_cumulative_post70 || 0)}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Suspension Strategy Card */}
                                                    <div className={`rounded-xl border-2 p-6 ${isBestSuspend ? 'border-green-500 bg-green-50 shadow-lg ring-2 ring-green-200' : 'border-gray-200 bg-white'}`}>
                                                        {isBestSuspend && (
                                                            <div className="absolute -mt-10 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-md transform -translate-x-2">
                                                                🏆 Best Value
                                                            </div>
                                                        )}
                                                        <h4 className={`text-xl font-bold mb-4 ${isBestSuspend ? 'text-green-700' : 'text-gray-700'}`}>Suspend & Grow (Age 70)</h4>

                                                        {yearData.suspend_monthly > 0 ? (
                                                            <div className="bg-green-100/50 text-green-800 px-4 py-2 rounded-lg mb-6 text-center font-medium">
                                                                ✅ Receiving benefits
                                                            </div>
                                                        ) : (
                                                            <div className="bg-amber-100/50 text-amber-800 px-4 py-2 rounded-lg mb-6 text-center font-medium">
                                                                ⏸️ Benefits Suspended
                                                            </div>
                                                        )}

                                                        <div className="space-y-6">
                                                            <div>
                                                                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Monthly</p>
                                                                <p className={`text-3xl font-bold ${isBestSuspend ? 'text-green-700' : 'text-gray-900'}`}>
                                                                    {formatCurrency(yearData.suspend_monthly)}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Annual</p>
                                                                <p className={`text-xl font-bold ${isBestSuspend ? 'text-green-700' : 'text-gray-900'}`}>
                                                                    {formatCurrency(yearData.suspend_monthly * 12)}
                                                                </p>
                                                                <p className="text-xs text-gray-400">12 months paid this year</p>
                                                            </div>
                                                            <div className="bg-gray-50 p-3 rounded-lg">
                                                                <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Cumulative Since {results.current_age}</p>
                                                                <p className={`text-xl font-bold ${isBestSuspend ? 'text-green-700' : 'text-gray-700'}`}>
                                                                    {formatCurrency(yearData.suspend_cumulative)}
                                                                </p>
                                                            </div>
                                                            {selectedYear >= 70 && (
                                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                                    <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Cumulative Since 70</p>
                                                                    <p className={`text-xl font-bold ${isBestSuspend ? 'text-green-700' : 'text-gray-700'}`}>
                                                                        {formatCurrency(yearData.suspend_cumulative_post70 || 0)}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Insight Box */}
                                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                                                    <div className="text-2xl">💡</div>
                                                    <div>
                                                        <h5 className="font-bold text-blue-900">Key Insight</h5>
                                                        <p className="text-blue-800">
                                                            {yearData.suspend_monthly > yearData.std_monthly
                                                                ? `At age ${selectedYear}, suspending boosts your monthly income by ${formatCurrency(diffMonthly)} compared to the standard path.`
                                                                : `At age ${selectedYear}, the standard path provides more monthly income. Suspension is likely still in the "investment" phase.`}
                                                            {isBestSuspend && " Overall, your patience has paid off with a higher total lifetime value."}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                            <div className="mt-8 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                                    onClick={() => setShowYearModal(false)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SSDICalculator;
