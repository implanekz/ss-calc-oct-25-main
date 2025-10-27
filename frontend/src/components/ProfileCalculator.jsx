import React, { useState, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import { getTaxableMaximum } from '../utils/taxableMaximum';
import { API_BASE_URL } from '../config/api';

// Pre-loaded profiles from our documentation
const PROFILES = {
  average: {
    name: "Average Earner",
    birthYear: 1960,
    targetPIA: 1800,
    pattern: "Steady with 3 zero years",
    description: "Typical American worker with standard career progression and 3 gap years",
    useCase: "Baseline comparison, general planning",
    earnings: [
      {year: 1982, amount: 25000}, {year: 1983, amount: 0}, {year: 1984, amount: 28000},
      {year: 1985, amount: 30000}, {year: 1986, amount: 32000}, {year: 1987, amount: 34000},
      {year: 1988, amount: 36000}, {year: 1989, amount: 38000}, {year: 1990, amount: 40000},
      {year: 1991, amount: 42000}, {year: 1992, amount: 44000}, {year: 1993, amount: 46000},
      {year: 1994, amount: 48000}, {year: 1995, amount: 50000}, {year: 1996, amount: 0},
      {year: 1997, amount: 52000}, {year: 1998, amount: 54000}, {year: 1999, amount: 56000},
      {year: 2000, amount: 58000}, {year: 2001, amount: 60000}, {year: 2002, amount: 62000},
      {year: 2003, amount: 64000}, {year: 2004, amount: 66000}, {year: 2005, amount: 68000},
      {year: 2006, amount: 70000}, {year: 2007, amount: 72000}, {year: 2008, amount: 74000},
      {year: 2009, amount: 76000}, {year: 2010, amount: 78000}, {year: 2011, amount: 80000},
      {year: 2012, amount: 82000}, {year: 2013, amount: 0}, {year: 2014, amount: 84000},
      {year: 2015, amount: 86000}, {year: 2016, amount: 88000}, {year: 2017, amount: 90000},
      {year: 2018, amount: 92000}, {year: 2019, amount: 94000}
    ]
  },
  teacher: {
    name: "Teacher (Career Gap)",
    birthYear: 1963,
    targetPIA: 1650,
    pattern: "Steady progression, 3-year gap for children",
    description: "Public school teacher, took 3 years off for children, returned part-time then full-time",
    useCase: "Career gaps for child-rearing, modest steady income",
    earnings: [
      {year: 1986, amount: 22000}, {year: 1987, amount: 24000}, {year: 1988, amount: 26000},
      {year: 1989, amount: 28000}, {year: 1990, amount: 30000}, {year: 1991, amount: 32000},
      {year: 1992, amount: 0}, {year: 1993, amount: 0}, {year: 1994, amount: 0},
      {year: 1995, amount: 18000}, {year: 1996, amount: 20000}, {year: 1997, amount: 35000},
      {year: 1998, amount: 37000}, {year: 1999, amount: 39000}, {year: 2000, amount: 41000},
      {year: 2001, amount: 43000}, {year: 2002, amount: 45000}, {year: 2003, amount: 47000},
      {year: 2004, amount: 49000}, {year: 2005, amount: 51000}, {year: 2006, amount: 53000},
      {year: 2007, amount: 55000}, {year: 2008, amount: 57000}, {year: 2009, amount: 59000},
      {year: 2010, amount: 61000}, {year: 2011, amount: 63000}, {year: 2012, amount: 65000},
      {year: 2013, amount: 67000}, {year: 2014, amount: 69000}, {year: 2015, amount: 71000},
      {year: 2016, amount: 73000}, {year: 2017, amount: 75000}, {year: 2018, amount: 75000},
      {year: 2019, amount: 75000}, {year: 2020, amount: 75000}, {year: 2021, amount: 75000},
      {year: 2022, amount: 75000}, {year: 2023, amount: 75000}
    ]
  },
  consultant: {
    name: "Self-Employed Consultant",
    birthYear: 1962,
    targetPIA: 2200,
    pattern: "Variable income with feast/famine cycles",
    description: "Marketing consultant with lumpy income - banner years and lean years",
    useCase: "Self-employment income volatility",
    earnings: [
      {year: 1984, amount: 28000}, {year: 1985, amount: 32000}, {year: 1986, amount: 36000},
      {year: 1987, amount: 40000}, {year: 1988, amount: 45000}, {year: 1989, amount: 50000},
      {year: 1990, amount: 55000}, {year: 1991, amount: 60000}, {year: 1992, amount: 65000},
      {year: 1993, amount: 70000}, {year: 1994, amount: 75000}, {year: 1995, amount: 80000},
      {year: 1996, amount: 85000}, {year: 1997, amount: 12000}, {year: 1998, amount: 95000},
      {year: 1999, amount: 45000}, {year: 2000, amount: 110000}, {year: 2001, amount: 35000},
      {year: 2002, amount: 125000}, {year: 2003, amount: 140000}, {year: 2004, amount: 85000},
      {year: 2005, amount: 150000}, {year: 2006, amount: 160000}, {year: 2007, amount: 155000},
      {year: 2008, amount: 25000}, {year: 2009, amount: 40000}, {year: 2010, amount: 130000},
      {year: 2011, amount: 145000}, {year: 2012, amount: 155000}, {year: 2013, amount: 160000},
      {year: 2014, amount: 165000}, {year: 2015, amount: 170000}, {year: 2016, amount: 175000},
      {year: 2017, amount: 180000}, {year: 2018, amount: 185000}, {year: 2019, amount: 190000},
      {year: 2020, amount: 100000}, {year: 2021, amount: 175000}, {year: 2022, amount: 185000}
    ]
  },
  stayHome: {
    name: "Stay-at-Home Parent",
    birthYear: 1966,
    targetPIA: 1400,
    pattern: "Early career → 15-year gap → Late restart",
    description: "CPA for 8 years, stayed home 15 years with kids, returned to work at 45",
    useCase: "Long career gap, demonstrates the stay-at-home penalty",
    earnings: [
      {year: 1988, amount: 28000}, {year: 1989, amount: 32000}, {year: 1990, amount: 36000},
      {year: 1991, amount: 40000}, {year: 1992, amount: 44000}, {year: 1993, amount: 48000},
      {year: 1994, amount: 52000}, {year: 1995, amount: 56000}, {year: 1996, amount: 0},
      {year: 1997, amount: 0}, {year: 1998, amount: 0}, {year: 1999, amount: 0},
      {year: 2000, amount: 0}, {year: 2001, amount: 0}, {year: 2002, amount: 0},
      {year: 2003, amount: 0}, {year: 2004, amount: 0}, {year: 2005, amount: 0},
      {year: 2006, amount: 0}, {year: 2007, amount: 0}, {year: 2008, amount: 0},
      {year: 2009, amount: 0}, {year: 2010, amount: 0}, {year: 2011, amount: 35000},
      {year: 2012, amount: 38000}, {year: 2013, amount: 42000}, {year: 2014, amount: 45000},
      {year: 2015, amount: 48000}, {year: 2016, amount: 52000}, {year: 2017, amount: 56000},
      {year: 2018, amount: 60000}, {year: 2019, amount: 64000}, {year: 2020, amount: 68000},
      {year: 2021, amount: 72000}, {year: 2022, amount: 76000}, {year: 2023, amount: 80000}
    ]
  },
  entrepreneur: {
    name: "Entrepreneur (Failed→Success)",
    birthYear: 1965,
    targetPIA: 2800,
    pattern: "Corporate → Failed startup → Success",
    description: "Tech worker who left for startup, failed, tried again and succeeded",
    useCase: "Entrepreneurial risks and startup zeros",
    earnings: [
      {year: 1987, amount: 35000}, {year: 1988, amount: 45000}, {year: 1989, amount: 55000},
      {year: 1990, amount: 65000}, {year: 1991, amount: 75000}, {year: 1992, amount: 85000},
      {year: 1993, amount: 95000}, {year: 1994, amount: 105000}, {year: 1995, amount: 115000},
      {year: 1996, amount: 125000}, {year: 1997, amount: 15000}, {year: 1998, amount: 18000},
      {year: 1999, amount: 20000}, {year: 2000, amount: 0}, {year: 2001, amount: 0},
      {year: 2002, amount: 85000}, {year: 2003, amount: 95000}, {year: 2004, amount: 105000},
      {year: 2005, amount: 115000}, {year: 2006, amount: 125000}, {year: 2007, amount: 25000},
      {year: 2008, amount: 30000}, {year: 2009, amount: 35000}, {year: 2010, amount: 50000},
      {year: 2011, amount: 75000}, {year: 2012, amount: 100000}, {year: 2013, amount: 150000},
      {year: 2014, amount: 200000}, {year: 2015, amount: 250000}, {year: 2016, amount: 300000},
      {year: 2017, amount: 180000}, {year: 2018, amount: 190000}, {year: 2019, amount: 200000},
      {year: 2020, amount: 150000}, {year: 2021, amount: 200000}, {year: 2022, amount: 210000}
    ]
  },
  lawyer: {
    name: "Lawyer → Nonprofit",
    birthYear: 1964,
    targetPIA: 2600,
    pattern: "BigLaw partner → Mission work pay cut",
    description: "Corporate lawyer making $300K+, switched to nonprofit at $95K",
    useCase: "Late-career mission work tradeoff",
    earnings: [
      {year: 1986, amount: 45000}, {year: 1987, amount: 50000}, {year: 1988, amount: 55000},
      {year: 1989, amount: 60000}, {year: 1990, amount: 65000}, {year: 1991, amount: 70000},
      {year: 1992, amount: 85000}, {year: 1993, amount: 100000}, {year: 1994, amount: 120000},
      {year: 1995, amount: 140000}, {year: 1996, amount: 160000}, {year: 1997, amount: 180000},
      {year: 1998, amount: 200000}, {year: 1999, amount: 220000}, {year: 2000, amount: 240000},
      {year: 2001, amount: 260000}, {year: 2002, amount: 280000}, {year: 2003, amount: 300000},
      {year: 2004, amount: 320000}, {year: 2005, amount: 340000}, {year: 2006, amount: 360000},
      {year: 2007, amount: 380000}, {year: 2008, amount: 400000}, {year: 2009, amount: 420000},
      {year: 2010, amount: 440000}, {year: 2011, amount: 460000}, {year: 2012, amount: 95000},
      {year: 2013, amount: 98000}, {year: 2014, amount: 100000}, {year: 2015, amount: 102000},
      {year: 2016, amount: 105000}, {year: 2017, amount: 108000}, {year: 2018, amount: 110000},
      {year: 2019, amount: 113000}, {year: 2020, amount: 115000}, {year: 2021, amount: 118000},
      {year: 2022, amount: 120000}
    ]
  }
};

const ProfileCalculator = () => {
    const [selectedProfile, setSelectedProfile] = useState('average');
    const [calculatedResult, setCalculatedResult] = useState(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [error, setError] = useState(null);

    const profile = PROFILES[selectedProfile];

    const normalizedEarnings = useMemo(() => {
        if (!profile) return [];
        return profile.earnings.map(entry => {
            const max = getTaxableMaximum(entry.year);
            const cappedAmount = Math.min(entry.amount, max);
            return {
                year: entry.year,
                amount: cappedAmount,
                wasCapped: entry.amount > max
            };
        });
    }, [normalizedEarnings, profile]);

    // Calculate PIA for selected profile
    const calculatePIA = async () => {
        setIsCalculating(true);
        setError(null);

        try {
            const earningsHistory = normalizedEarnings.map(e => ({
                year: e.year,
                earnings: e.amount,
                is_projected: false
            }));

            const response = await fetch(`${API_BASE_URL}/calculate-pia-from-earnings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    birth_year: profile.birthYear,
                    earnings_history: earningsHistory
                })
            });

            if (!response.ok) {
                throw new Error('Calculation failed');
            }

            const result = await response.json();
            setCalculatedResult(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsCalculating(false);
        }
    };

    // Format currency
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(value);
    };

    // Earnings chart data
    const chartData = useMemo(() => {
        if (!profile) return null;

        const years = normalizedEarnings.map(e => e.year);
        const amounts = normalizedEarnings.map(e => e.amount);
        const colors = normalizedEarnings.map(e => e.amount === 0 ? 'rgba(239, 68, 68, 0.6)' : 'rgba(59, 130, 246, 0.6)');

        return {
            labels: years,
            datasets: [{
                label: 'Annual Earnings',
                data: amounts,
                backgroundColor: colors,
                borderColor: colors.map(c => c.replace('0.6', '1')),
                borderWidth: 1
            }]
        };
    }, [profile]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const value = context.parsed.y;
                        return value === 0 ? 'Zero earnings year' : formatCurrency(value);
                    }
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    maxRotation: 45,
                    minRotation: 45,
                    autoSkip: true,
                    maxTicksLimit: 20
                }
            },
            y: {
                ticks: {
                    callback: (value) => {
                        if (value >= 1000) return `$${Math.round(value / 1000)}K`;
                        return `$${value}`;
                    }
                },
                beginAtZero: true
            }
        }
    };

    // Stats
    const zeroYears = normalizedEarnings.filter(e => e.amount === 0).length;
    const maxEarnings = normalizedEarnings.length > 0
        ? Math.max(...normalizedEarnings.map(e => e.amount))
        : 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        📊 Pro Forma Earnings Profile Calculator
                    </h1>
                    <p className="text-gray-600">
                        Explore real-world earnings patterns and their impact on Social Security benefits.
                        Select a profile to see the complete earnings history and calculated PIA.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Profile Selection */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Select Profile</h2>

                            <div className="space-y-3">
                                {Object.entries(PROFILES).map(([key, prof]) => (
                                    <button
                                        key={key}
                                        onClick={() => {
                                            setSelectedProfile(key);
                                            setCalculatedResult(null);
                                        }}
                                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                            selectedProfile === key
                                                ? 'border-blue-500 bg-blue-50 shadow-md'
                                                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className="font-semibold text-gray-900 mb-1">
                                            {prof.name}
                                        </div>
                                        <div className="text-xs text-gray-600 mb-2">
                                            {prof.pattern}
                                        </div>
                                        <div className="text-xs font-medium text-blue-600">
                                            Target: {formatCurrency(prof.targetPIA)}/mo
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={calculatePIA}
                                disabled={isCalculating}
                                className="w-full mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors shadow-md"
                            >
                                {isCalculating ? 'Calculating...' : 'Calculate PIA'}
                            </button>
                        </div>
                    </div>

                    {/* Profile Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Profile Info */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                {profile.name}
                            </h2>
                            <p className="text-gray-700 mb-4">
                                {profile.description}
                            </p>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="p-3 bg-blue-50 rounded-lg">
                                    <div className="text-xs text-gray-600 uppercase mb-1">Birth Year</div>
                                    <div className="text-lg font-bold text-blue-700">{profile.birthYear}</div>
                                </div>
                                <div className="p-3 bg-emerald-50 rounded-lg">
                                    <div className="text-xs text-gray-600 uppercase mb-1">Career Years</div>
                                    <div className="text-lg font-bold text-emerald-700">
                                        {profile.earnings.length}
                                    </div>
                                </div>
                                <div className="p-3 bg-red-50 rounded-lg">
                                    <div className="text-xs text-gray-600 uppercase mb-1">Zero Years</div>
                                    <div className="text-lg font-bold text-red-700">{zeroYears}</div>
                                </div>
                                <div className="p-3 bg-purple-50 rounded-lg">
                                    <div className="text-xs text-gray-600 uppercase mb-1">Max Earnings</div>
                                    <div className="text-lg font-bold text-purple-700">
                                        {formatCurrency(maxEarnings)}
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="font-semibold text-amber-900 mb-1">Use Case:</div>
                                <div className="text-sm text-amber-800">{profile.useCase}</div>
                            </div>
                        </div>

                        {/* Earnings Chart */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">
                                Earnings History
                            </h3>
                            <div className="h-80">
                                <Bar data={chartData} options={chartOptions} />
                            </div>
                            <div className="mt-4 flex items-center gap-6 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-blue-500 rounded"></div>
                                    <span className="text-gray-600">Working years</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                                    <span className="text-gray-600">Zero earnings</span>
                                </div>
                            </div>
                            <p className="mt-3 text-xs text-gray-500">
                                Earnings above SSA's taxable maximum are capped before calculations.
                            </p>
                        </div>

                        {/* Calculation Results */}
                        {calculatedResult && (
                            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-lg shadow-lg p-6">
                                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    ✓ Calculated Results
                                </h3>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    <div className="p-4 bg-white rounded-lg">
                                        <div className="text-xs text-gray-600 uppercase mb-1">AIME</div>
                                        <div className="text-xl font-bold text-emerald-700">
                                            {formatCurrency(calculatedResult.aime)}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">per month</div>
                                    </div>
                                    <div className="p-4 bg-white rounded-lg">
                                        <div className="text-xs text-gray-600 uppercase mb-1">PIA</div>
                                        <div className="text-xl font-bold text-emerald-700">
                                            {formatCurrency(calculatedResult.pia)}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">per month</div>
                                    </div>
                                    <div className="p-4 bg-white rounded-lg">
                                        <div className="text-xs text-gray-600 uppercase mb-1">Annual @ FRA</div>
                                        <div className="text-xl font-bold text-blue-700">
                                            {formatCurrency(calculatedResult.pia * 12)}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-white rounded-lg">
                                        <div className="text-xs text-gray-600 uppercase mb-1">Zero Years</div>
                                        <div className="text-xl font-bold text-red-700">
                                            {calculatedResult.years_of_zero_in_top_35}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">in top 35</div>
                                    </div>
                                </div>

                                {/* Bend Point Breakdown */}
                                <div className="p-4 bg-white rounded-lg">
                                    <div className="font-semibold text-gray-900 mb-3">Bend Point Calculation:</div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">First bracket (90%):</span>
                                            <span className="font-semibold">
                                                {formatCurrency(calculatedResult.calculation_details.first_bracket)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Second bracket (32%):</span>
                                            <span className="font-semibold">
                                                {formatCurrency(calculatedResult.calculation_details.second_bracket)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Third bracket (15%):</span>
                                            <span className="font-semibold">
                                                {formatCurrency(calculatedResult.calculation_details.third_bracket)}
                                            </span>
                                        </div>
                                        <div className="pt-2 border-t border-gray-200 flex justify-between">
                                            <span className="font-bold text-gray-900">Total PIA:</span>
                                            <span className="font-bold text-emerald-700">
                                                {formatCurrency(calculatedResult.pia)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Comparison */}
                                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-blue-900">vs Target PIA:</span>
                                        <span className={`font-bold ${
                                            Math.abs(calculatedResult.pia - profile.targetPIA) <= 50
                                                ? 'text-green-600'
                                                : 'text-amber-600'
                                        }`}>
                                            {calculatedResult.pia > profile.targetPIA ? '+' : ''}
                                            {formatCurrency(calculatedResult.pia - profile.targetPIA)}
                                        </span>
                                    </div>
                                    <div className="text-xs text-blue-700 mt-1">
                                        Target was {formatCurrency(profile.targetPIA)}/month
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error Display */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="text-red-800 font-semibold">Error calculating PIA:</div>
                                <div className="text-red-600 text-sm mt-1">{error}</div>
                            </div>
                        )}

                        {/* Educational Note */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                            <h4 className="font-semibold text-blue-900 mb-2">📚 How to Use This Tool</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                                <li>Select a profile that matches your client's situation</li>
                                <li>Click "Calculate PIA" to see their actual Social Security benefit</li>
                                <li>Compare the result to what they might expect</li>
                                <li>Use the chart to explain how zero years and income patterns affect benefits</li>
                                <li>Show clients how working longer can replace zero years</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileCalculator;
