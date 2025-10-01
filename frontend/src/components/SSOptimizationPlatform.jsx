import React, { useState, useEffect, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Chart } from 'chart.js';
Chart.register(annotationPlugin);

// --- Utility Functions (Based on Core Calculator Logic) ---

const DEFAULT_INFLATION = 0.03;
const FRA_YEAR = 67;
const MAX_AGE = 100;
const START_AGE = 60;

const calculateMonthlyBenefit = (pia, claimingAge, inflationRate, isZeroPIAImpacted) => {
    let basePIA = pia;
    if (isZeroPIAImpacted && claimingAge < FRA_YEAR) {
        basePIA *= 0.875; // Simulate PIA reduction
    }

    let monthlyBenefit = basePIA;
    if (claimingAge < FRA_YEAR) {
        const monthsEarly = (FRA_YEAR - claimingAge) * 12;
        monthlyBenefit *= (1 - (0.05 * (monthsEarly / 12)));
    } else if (claimingAge > FRA_YEAR && claimingAge <= 70) {
        const yearsDelayed = claimingAge - FRA_YEAR;
        monthlyBenefit *= (1 + (yearsDelayed * 0.08));
    } else if (claimingAge > 70) {
        const yearsDelayed = 70 - FRA_YEAR;
        monthlyBenefit *= (1 + (yearsDelayed * 0.08));
    }
    return monthlyBenefit;
};

const generateRaceData = (pia, inflationRate, isZeroPIAImpacted) => {
    const scenarios = [
        { name: 'Claim at 62', age: 62, color: 'rgba(255, 99, 132, 0.7)' },
        { name: 'Claim at 67 (FRA)', age: 67, color: 'rgba(54, 162, 235, 0.7)' },
        { name: 'Claim at 70', age: 70, color: 'rgba(75, 192, 192, 0.7)' },
    ];

    let data = [];
    scenarios.forEach(scenario => {
        let cumulativeIncome = 0;
        let post70Cumulative = 0;
        for (let age = START_AGE; age <= MAX_AGE; age++) {
            let yearlyIncome = 0;
            if (age >= scenario.age) {
                const monthlyBenefit = calculateMonthlyBenefit(pia, scenario.age, inflationRate, isZeroPIAImpacted && scenario.age < FRA_YEAR);
                const inflationFactor = Math.pow(1 + inflationRate, age - scenario.age);
                yearlyIncome = monthlyBenefit * 12 * inflationFactor;
                cumulativeIncome += yearlyIncome;
                if (age >= 70) {
                    post70Cumulative += yearlyIncome;
                }
            }
            data.push({
                age: age,
                scenario: scenario.name,
                value: cumulativeIncome,
                post70Value: post70Cumulative,
                color: scenario.color
            });
        }
    });
    return data;
};

// --- Visualization Components ---

const BarChartRace = ({ data, currentAge }) => {
    const filteredData = useMemo(() => {
        let frameData = data.filter(d => d.age === currentAge);
        return frameData.sort((a, b) => b.value - a.value);
    }, [data, currentAge]);

    const chartData = {
        labels: filteredData.map(d => d.scenario),
        datasets: [
            {
                label: 'Income Since Age 70',
                data: filteredData.map(d => d.post70Value),
                backgroundColor: filteredData.map(d => d.color.replace('0.7', '1.0')),
                borderColor: filteredData.map(d => d.color.replace('0.7', '1')),
                borderWidth: 1,
            },
            {
                label: 'Income Before Age 70',
                data: filteredData.map(d => d.value - d.post70Value),
                backgroundColor: filteredData.map(d => d.color.replace('0.7', '0.3')),
                borderColor: filteredData.map(d => d.color.replace('0.7', '1')),
                borderWidth: 1,
            }
        ],
    };

    const chartOptions = {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                stacked: true,
                beginAtZero: true,
                title: { display: true, text: 'Total Cumulative Income ($)' },
            },
            y: {
                stacked: true,
                ticks: { autoSkip: false },
            }
        },
        plugins: {
            legend: {
                position: 'bottom',
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const originalLabel = context.chart.data.labels[context.dataIndex];
                        const value = context.raw;
                        if (context.dataset.label === 'Income Since Age 70') {
                           return `${originalLabel} (Since 70): ${value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`;
                        }
                         return `${originalLabel} (Before 70): ${value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`;
                    },
                    footer: function(tooltipItems) {
                        const total = tooltipItems.reduce((sum, item) => sum + item.raw, 0);
                        return 'Total Lifetime: ' + total.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
                    }
                }
            }
        }
    };

    return <Bar data={chartData} options={chartOptions} />;
};

const SSOptimizationPlatform = () => {
    const [inputs, setInputs] = useState({
        pia: 3000,
        inflation: DEFAULT_INFLATION,
        isZeroPIAImpacted: true,
    });
    const [currentAge, setCurrentAge] = useState(START_AGE);
    const [isPlaying, setIsPlaying] = useState(false);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setInputs(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : parseFloat(value) || 0,
        }));
    };

    const raceData = useMemo(() => generateRaceData(inputs.pia, inputs.inflation, inputs.isZeroPIAImpacted), [inputs]);

    useEffect(() => {
        if (isPlaying) {
            const timer = setInterval(() => {
                setCurrentAge(prevAge => {
                    if (prevAge < MAX_AGE) {
                        return prevAge + 1;
                    } else {
                        setIsPlaying(false);
                        return prevAge;
                    }
                });
            }, 200); // Animation speed
            return () => clearInterval(timer);
        }
    }, [isPlaying]);

    return (
        <div className="p-6 bg-gray-100 min-h-screen font-sans">
            <header className="text-center mb-6">
                <h1 className="text-4xl font-extrabold text-gray-800">Social Security Lifetime Benefit Race</h1>
                <p className="text-md text-gray-600 mt-2">An Interactive Visualization of Your Claiming Strategy</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 bg-white p-5 border rounded-lg shadow-md">
                    <h3 className="font-semibold text-xl mb-4 text-gray-700">Simulation Controls</h3>
                    <label className="block mb-4 text-sm font-medium text-gray-600">
                        <span>Primary Insurance Amount (PIA)</span>
                        <input type="number" name="pia" value={inputs.pia} onChange={handleInputChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" />
                    </label>
                    <div className="flex items-center justify-between mb-4">
                        <label htmlFor="isZeroPIAImpacted" className="text-sm font-medium text-gray-600">Simulate Early Retirement Cut</label>
                        <input type="checkbox" id="isZeroPIAImpacted" name="isZeroPIAImpacted" checked={inputs.isZeroPIAImpacted} onChange={handleInputChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                    </div>
                    
                    <div className="flex items-center space-x-2 mb-4">
                        <button onClick={() => setIsPlaying(!isPlaying)} className={`w-full py-2 px-4 text-white font-bold rounded-md transition-transform transform hover:scale-105 ${isPlaying ? 'bg-red-600' : 'bg-green-600'}`}>
                            {isPlaying ? 'Pause' : 'Play'}
                        </button>
                        <button onClick={() => { setCurrentAge(START_AGE); setIsPlaying(false); }} className="w-full py-2 px-4 bg-gray-500 text-white rounded-md hover:bg-gray-600">
                            Reset
                        </button>
                    </div>

                    <label className="block text-sm font-medium text-gray-600">
                        <span>Current Age: {currentAge}</span>
                        <input type="range" min={START_AGE} max={MAX_AGE} value={currentAge} onChange={(e) => setCurrentAge(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-2" />
                    </label>
                </div>

                <div className="lg:col-span-3 bg-white p-4 border rounded-lg shadow-xl" style={{ height: '600px' }}>
                     <BarChartRace data={raceData} currentAge={currentAge} />
                </div>
            </div>

            <div className="mt-8 p-5 bg-white border-t-4 border-indigo-500 rounded-b-lg shadow-md">
                <h3 className="text-xl font-bold text-gray-800">How to Interpret This Chart</h3>
                <p className="mt-2 text-gray-600">
                    This chart races different Social Security claiming strategies against each other over a lifetime. The total length of each bar shows the cumulative, inflation-adjusted income you would have received by that age.
                </p>
                <p className="mt-2 text-gray-600">
                    The bar is split into two parts: income earned <span class="font-bold text-gray-500">before age 70</span> (lighter shade) and income earned <span class="font-bold text-indigo-700">after age 70</span> (darker shade). This highlights how delaying your claim leads to a much larger, more secure income stream in your later years, which is critical for long-term financial well-being.
                </p>
            </div>
        </div>
    );
};

export default SSOptimizationPlatform;
