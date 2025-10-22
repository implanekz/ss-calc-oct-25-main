import React, { useMemo, useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const PHASE_GRADIENTS = {
    own: ['#f59e0b', '#2563eb'],
    survivor: ['#fbbf24', '#0ea5e9'],
    ex_spouse: ['#f97316', '#a855f7'],
    child_in_care: ['#fb923c', '#2dd4bf'],
    default: ['#f97316', '#2563eb']
};

const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
        minimumFractionDigits: 0
    }).format(value);
};

const StrategyTimelineToaster = ({ strategy, onClose, clientType, inline = false }) => {
    const [viewMode, setViewMode] = useState('annual'); // annual | monthly

    useEffect(() => {
        setViewMode('annual');
    }, [strategy?.strategy]);

    const timeline = strategy?.benefit_timeline || [];

    const chartData = useMemo(() => {
        if (!timeline.length) {
            return null;
        }

        const labels = timeline.map(entry => `${entry.year}`);
        const values = timeline.map(entry => viewMode === 'annual' ? entry.annual_total : entry.monthly_benefit);

        return {
            labels,
            datasets: [
                {
                    data: values,
                    borderRadius: 12,
                    hoverBorderRadius: 12,
                    maxBarThickness: 32,
                    backgroundColor: (context) => {
                        const { chart, dataIndex } = context;
                        const chartArea = chart.chartArea;
                        if (!chartArea) {
                            const fallback = PHASE_GRADIENTS.default;
                            return fallback[1];
                        }
                        const entry = timeline[dataIndex];
                        const [bottomColor, topColor] = PHASE_GRADIENTS[entry?.phase] || PHASE_GRADIENTS.default;
                        const gradient = chart.ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                        gradient.addColorStop(0, bottomColor);
                        gradient.addColorStop(1, topColor);
                        return gradient;
                    }
                }
            ]
        };
    }, [timeline, viewMode]);

    const chartOptions = useMemo(() => {
        const valueFormatter = (value) => viewMode === 'annual'
            ? formatCurrency(value)
            : formatCurrency(value);

        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#111827',
                    padding: 12,
                    borderRadius: 12,
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    callbacks: {
                        title: (items) => {
                            if (!items.length) return '';
                            const entry = timeline[items[0].dataIndex];
                            return `Year ${entry.year} (Age ${entry.age})`;
                        },
                        label: (item) => {
                            const entry = timeline[item.dataIndex];
                            const label = viewMode === 'annual'
                                ? `Annual income: ${formatCurrency(entry.annual_total)}`
                                : `Monthly income: ${formatCurrency(entry.monthly_benefit)}`;
                            return [
                                label,
                                `Months paid: ${entry.months_paid}`,
                                `Phase: ${entry.phase?.replace('_', ' ') || 'benefit'}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#4b5563',
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 12
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    ticks: {
                        color: '#4b5563',
                        callback: function(value) {
                            if (viewMode === 'annual') {
                                if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
                                if (value >= 1000) return `$${Math.round(value / 1000)}K`;
                            }
                            return formatCurrency(value);
                        }
                    },
                    grid: {
                        color: '#e5e7eb',
                        drawBorder: false
                    },
                    beginAtZero: true
                }
            }
        };
    }, [timeline, viewMode]);

    if (!strategy || !timeline.length || !chartData) {
        return null;
    }

    const defaultDescription = clientType === 'widow'
        ? 'Survivor benefits grow with COLA, then switch to the higher own benefit.'
        : 'Watch income evolve across the strategy timeline with COLA adjustments.';

    const containerClasses = inline 
        ? "w-full h-full shadow-lg rounded-xl border border-slate-200 bg-white overflow-hidden"
        : "fixed bottom-6 right-6 w-full max-w-xl shadow-2xl rounded-xl border border-slate-200 bg-white/95 backdrop-blur-lg z-50 overflow-hidden";

    return (
        <div className={containerClasses}>
            <div className="flex items-start justify-between px-6 py-4 bg-gradient-to-r from-sky-50 to-slate-50 border-b border-slate-200">
                <div>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                        Strategy Insight
                    </p>
                    <h3 className="text-lg font-bold text-slate-900">{strategy.strategy}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                        Lifetime value {formatCurrency(strategy.lifetime_total)}
                    </p>
                </div>
                {!inline && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="ml-4 rounded-full bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors h-8 w-8 flex items-center justify-center border border-slate-200"
                        aria-label="Close strategy details"
                    >
                        ×
                    </button>
                )}
            </div>

            <div className="px-6 pt-5 pb-6">
                <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-700">
                            Toggle between monthly and annual income for each year
                        </span>
                        <div className="flex rounded-full bg-slate-100 p-1">
                            <button
                                type="button"
                                onClick={() => setViewMode('annual')}
                                className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                                    viewMode === 'annual'
                                        ? 'bg-white text-slate-900 shadow'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                                aria-pressed={viewMode === 'annual'}
                            >
                                Annual
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('monthly')}
                                className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                                    viewMode === 'monthly'
                                        ? 'bg-white text-slate-900 shadow'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                                aria-pressed={viewMode === 'monthly'}
                            >
                                Monthly
                            </button>
                        </div>
                    </div>
                </div>

                <div className="text-sm text-slate-600 mb-4">
                    {strategy.description || defaultDescription}
                </div>

                <div className={inline ? "h-64" : "h-60"}>
                    <Bar data={chartData} options={chartOptions} />
                </div>

                {!inline && (
                    <p className="mt-4 text-xs text-slate-500">
                        These growing bars represent each year in the projection. Hover to see detailed tooltips for every bar.
                        Close the window with the × when you are done reviewing this strategy.
                    </p>
                )}
            </div>
        </div>
    );
};

export default StrategyTimelineToaster;
