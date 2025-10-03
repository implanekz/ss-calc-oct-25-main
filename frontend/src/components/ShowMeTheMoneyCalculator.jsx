import React, { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

const FRA_LOOKUP = {
    1937: { years: 65, months: 0 },
    1938: { years: 65, months: 2 },
    1939: { years: 65, months: 4 },
    1940: { years: 65, months: 6 },
    1941: { years: 65, months: 8 },
    1942: { years: 65, months: 10 },
    1943: { years: 66, months: 0 },
    1944: { years: 66, months: 0 },
    1945: { years: 66, months: 0 },
    1946: { years: 66, months: 0 },
    1947: { years: 66, months: 0 },
    1948: { years: 66, months: 0 },
    1949: { years: 66, months: 0 },
    1950: { years: 66, months: 0 },
    1951: { years: 66, months: 0 },
    1952: { years: 66, months: 0 },
    1953: { years: 66, months: 0 },
    1954: { years: 66, months: 0 },
    1955: { years: 66, months: 2 },
    1956: { years: 66, months: 4 },
    1957: { years: 66, months: 6 },
    1958: { years: 66, months: 8 },
    1959: { years: 66, months: 10 },
    1960: { years: 67, months: 0 }
};

const getFra = (birthYear) => {
    if (birthYear <= 1937) {
        return { years: 65, months: 0 };
    }
    if (birthYear >= 1960) {
        return { years: 67, months: 0 };
    }
    return FRA_LOOKUP[birthYear] || { years: 67, months: 0 };
};

const ageInMonths = (birthDate, targetDate) => {
    let years = targetDate.getFullYear() - birthDate.getFullYear();
    let months = targetDate.getMonth() - birthDate.getMonth();
    let totalMonths = years * 12 + months;

    if (targetDate.getDate() < birthDate.getDate()) {
        totalMonths -= 1;
    }

    return totalMonths;
};

const preclaimColaFactor = (claimAgeYears, currentAgeYears, rate) => {
    if (claimAgeYears <= currentAgeYears) {
        return 1;
    }

    const pre60Years = Math.max(0, Math.min(60, claimAgeYears) - currentAgeYears);
    const colaYearsFrom62 = Math.max(0, Math.floor(claimAgeYears) - 62);

    return Math.pow(1 + rate, pre60Years + colaYearsFrom62);
};

const monthsFromFra = (claimAgeYears, fraYears) => Math.round((claimAgeYears - fraYears) * 12);

const delayedRetirementCreditFactor = (monthsAfterFra) => {
    const months = Math.max(0, monthsAfterFra);
    return 1 + ((2 / 3) / 100) * months;
};

const earlyReductionFactor = (monthsBeforeFra) => {
    const months = Math.abs(Math.min(0, monthsBeforeFra));
    const first36 = Math.min(36, months);
    const extra = Math.max(0, months - 36);
    const reduction = first36 * (5 / 9) / 100 + extra * (5 / 12) / 100;
    return Math.max(0, 1 - reduction);
};

const monthlyBenefitAtClaim = ({ piaFRA, claimAgeYears, currentAgeYears, rate, fraYears }) => {
    const base = piaFRA * preclaimColaFactor(claimAgeYears, currentAgeYears, rate);
    const monthsOffset = monthsFromFra(claimAgeYears, fraYears);
    if (monthsOffset >= 0) {
        return base * delayedRetirementCreditFactor(monthsOffset);
    }
    return base * earlyReductionFactor(monthsOffset);
};

const benefitAfterClaim = (baseMonthlyAtClaim, yearsAfterClaim, rate) => {
    const years = Math.max(0, yearsAfterClaim);
    return baseMonthlyAtClaim * Math.pow(1 + rate, years);
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
});

const tooltipLabelFormatter = (context) => {
    const datasetLabel = context.dataset?.label ? `${context.dataset.label}: ` : '';
    const value = context.parsed?.y ?? context.raw ?? 0;
    return `${datasetLabel}${currencyFormatter.format(Math.round(value))}`;
};

const formatCurrencyTick = (value) => `$${Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

const CHART_PADDING = { left: 60, right: 30, top: 10, bottom: 10 };

const LifeStageSlider = () => null;

const ShowMeTheMoneyCalculator = () => {
    const [isMarried, setIsMarried] = useState(false);
    const [primaryName] = useState('John Smith');
    const [spouseName] = useState('Mary Smith');
    const [spouse1Dob, setSpouse1Dob] = useState('1965-02-03');
    const [spouse1Pia, setSpouse1Pia] = useState(4000);
    const [spouse1PreferredYear, setSpouse1PreferredYear] = useState(67);
    const [spouse1PreferredMonth, setSpouse1PreferredMonth] = useState(0);
    const [spouse2Dob, setSpouse2Dob] = useState('1965-06-18');
    const [spouse2Pia, setSpouse2Pia] = useState(1500);
    const [spouse2PreferredYear, setSpouse2PreferredYear] = useState(65);
    const [spouse2PreferredMonth, setSpouse2PreferredMonth] = useState(0);
    const [inflation, setInflation] = useState(0.025);
    const [chartView, setChartView] = useState('monthly'); // monthly, cumulative, combined
    const [chartData, setChartData] = useState({ labels: [], datasets: [] });
    const [chartOptions, setChartOptions] = useState({});
    const [prematureDeath, setPrematureDeath] = useState(false);
    const currentCalendarYear = new Date().getFullYear();
    const [deathYear, setDeathYear] = useState(currentCalendarYear + 1);
    const [activeRecordView, setActiveRecordView] = useState('combined');

    useEffect(() => {
        if (!isMarried && activeRecordView === 'spouse') {
            setActiveRecordView('combined');
        }
    }, [isMarried, activeRecordView]);

    const formatAge = (dob) => {
        const birthDate = new Date(dob);
        if (Number.isNaN(birthDate.getTime())) {
            return '';
        }

        const now = new Date();
        let years = now.getFullYear() - birthDate.getFullYear();
        let months = now.getMonth() - birthDate.getMonth();

        if (now.getDate() < birthDate.getDate()) {
            months -= 1;
        }

        if (months < 0) {
            years -= 1;
            months += 12;
        }

        return `${years}y ${months}m`;
    };

    const calculateProjections = (pia, dob, filingYear, filingMonth, inflationRate) => {
        const birthDate = new Date(dob);
        const birthYear = birthDate.getFullYear();
        const claimAgeYears = filingYear + (filingMonth || 0) / 12;
        const currentAgeMonths = ageInMonths(birthDate, new Date());
        const currentAgeYears = currentAgeMonths / 12;
        const fra = getFra(birthYear);
        const fraYears = fra.years + (fra.months || 0) / 12;

        const baseMonthlyAtClaim = monthlyBenefitAtClaim({
            piaFRA: pia,
            claimAgeYears,
            currentAgeYears,
            rate: inflationRate,
            fraYears
        });

        const monthlyProjection = {};
        const cumulativeProjection = {};
        let cumulative = 0;

        const startYear = birthYear + 62;
        const endYear = birthYear + 95;
        const claimingCalendarYear = birthYear + filingYear;

        for (let year = startYear; year <= endYear; year++) {
            let monthlyBenefit = 0;

            if (year >= claimingCalendarYear) {
                const yearsAfterClaim = year - claimingCalendarYear;
                monthlyBenefit = benefitAfterClaim(baseMonthlyAtClaim, yearsAfterClaim, inflationRate);
            }

            const roundedMonthly = Number(monthlyBenefit.toFixed(2));
            monthlyProjection[year] = roundedMonthly;
            cumulative = Number((cumulative + roundedMonthly * 12).toFixed(2));
            cumulativeProjection[year] = cumulative;
        }

        return { monthly: monthlyProjection, cumulative: cumulativeProjection };
    };


    useEffect(() => {
        const primaryAge62 = calculateProjections(spouse1Pia, spouse1Dob, 62, 0, inflation);
        const primaryPreferred = calculateProjections(spouse1Pia, spouse1Dob, spouse1PreferredYear, spouse1PreferredMonth, inflation);
        const primaryAge70 = calculateProjections(spouse1Pia, spouse1Dob, 70, 0, inflation);

        const primaryProjections = {
            age62: primaryAge62,
            preferred: primaryPreferred,
            age70: primaryAge70
        };

        let spouseProjections = null;
        let combinedProjections = primaryProjections;

        const deathYearNumber = Number(deathYear) || deathYear;

        if (isMarried) {
            const spouseAge62 = calculateProjections(spouse2Pia, spouse2Dob, 62, 0, inflation);
            const spousePreferred = calculateProjections(spouse2Pia, spouse2Dob, spouse2PreferredYear, spouse2PreferredMonth, inflation);
            const spouseAge70 = calculateProjections(spouse2Pia, spouse2Dob, 70, 0, inflation);

            spouseProjections = {
                age62: spouseAge62,
                preferred: spousePreferred,
                age70: spouseAge70
            };

            const allYears = Array.from(new Set([
                ...Object.keys(primaryAge62.monthly),
                ...Object.keys(spouseAge62.monthly)
            ])).sort();

            const makeCombined = (projPrimary, projSpouse) => {
                const monthly = {};
                allYears.forEach((year) => {
                    const yearNum = Number(year);
                    const primaryValue = projPrimary.monthly[yearNum] || 0;
                    const spouseValue = projSpouse.monthly[yearNum] || 0;
                    monthly[yearNum] = prematureDeath && yearNum >= deathYearNumber
                        ? Math.max(primaryValue, spouseValue)
                        : primaryValue + spouseValue;
                });

                const cumulative = {};
                let runningTotal = 0;
                allYears.forEach((year) => {
                    const yearNum = Number(year);
                    runningTotal += (monthly[yearNum] || 0) * 12;
                    cumulative[yearNum] = runningTotal;
                });

                return { monthly, cumulative };
            };

            combinedProjections = {
                age62: makeCombined(primaryAge62, spouseAge62),
                preferred: makeCombined(primaryPreferred, spousePreferred),
                age70: makeCombined(primaryAge70, spouseAge70)
            };
        }

        const projections = activeRecordView === 'primary'
            ? primaryProjections
            : activeRecordView === 'spouse' && spouseProjections
                ? spouseProjections
                : combinedProjections;

        const birthYearPrimary = new Date(spouse1Dob).getFullYear();
        const birthYearSpouse = isMarried ? new Date(spouse2Dob).getFullYear() : null;

        const displayAges = [62, 67, 70, 75, 80, 85, 90, 95];
        const primaryYears = displayAges.map(age => birthYearPrimary + age);
        const spouseYears = isMarried ? displayAges.map(age => birthYearSpouse + age) : null;

        let displayYearsForData = primaryYears;
        let labels = primaryYears.map(year => `Age ${year - birthYearPrimary}`);

        if (activeRecordView === 'spouse' && spouseYears) {
            displayYearsForData = spouseYears;
            labels = spouseYears.map(year => `Age ${year - birthYearSpouse}`);
        } else if (activeRecordView === 'combined' && isMarried && birthYearSpouse !== null) {
            displayYearsForData = primaryYears;
            labels = primaryYears.map(year => {
                const age1 = year - birthYearPrimary;
                const age2 = year - birthYearSpouse;
                return `Ages ${age1}/${age2}`;
            });
        }

        let newChartData;
        let newChartOptions;

        if (chartView === 'monthly') {
            const monthlyBarStyle = { barPercentage: 0.6, categoryPercentage: 0.72, borderRadius: 4, maxBarThickness: 55 };
            newChartData = {
                labels,
                datasets: [
                    { label: 'File at 62', data: displayYearsForData.map(year => Math.round(projections.age62.monthly[year] || 0)), backgroundColor: 'rgba(255, 99, 132, 0.9)', ...monthlyBarStyle },
                    { label: 'Preferred Age', data: displayYearsForData.map(year => Math.round(projections.preferred.monthly[year] || 0)), backgroundColor: 'rgba(54, 162, 235, 0.9)', ...monthlyBarStyle },
                    { label: 'File at 70', data: displayYearsForData.map(year => Math.round(projections.age70.monthly[year] || 0)), backgroundColor: 'rgba(75, 192, 192, 0.9)', ...monthlyBarStyle },
                ]
            };
            newChartOptions = {
                plugins: {
                    title: { display: true, text: 'Monthly View' },
                    tooltip: { callbacks: { label: tooltipLabelFormatter } }
                },
                layout: { padding: CHART_PADDING },
                scales: {
                    x: { title: { text: 'Year' }, ticks: { autoSkip: false } },
                    y: {
                        title: { text: 'Monthly Benefit ($)' },
                        ticks: { callback: formatCurrencyTick }
                    }
                }
            };
        } else if (chartView === 'cumulative') {
            newChartData = {
                labels,
                datasets: [
                    { label: 'File at 62', data: displayYearsForData.map(year => Math.round(projections.age62.cumulative[year] || 0)), borderColor: 'red', fill: false },
                    { label: 'Preferred Age', data: displayYearsForData.map(year => Math.round(projections.preferred.cumulative[year] || 0)), borderColor: 'blue', fill: false },
                    { label: 'File at 70', data: displayYearsForData.map(year => Math.round(projections.age70.cumulative[year] || 0)), borderColor: 'green', fill: false },
                ]
            };
            newChartOptions = {
                plugins: {
                    title: { display: true, text: 'Cumulative View' },
                    tooltip: { callbacks: { label: tooltipLabelFormatter } }
                },
                layout: { padding: CHART_PADDING },
                scales: {
                    x: { title: { text: 'Year' }, ticks: { autoSkip: false } },
                    y: {
                        title: { text: 'Cumulative Benefits ($)' },
                        ticks: { callback: formatCurrencyTick }
                    }
                }
            };
        } else { // combined
            newChartData = {
                labels,
                datasets: [
                    { type: 'bar', label: 'Monthly File at 62', data: displayYearsForData.map(year => Math.round(projections.age62.monthly[year] || 0)), backgroundColor: 'rgba(255, 99, 132, 0.9)', yAxisID: 'y_monthly', barPercentage: 0.65, categoryPercentage: 0.8, maxBarThickness: 70, borderRadius: 4 },
                    { type: 'bar', label: 'Monthly Preferred Age', data: displayYearsForData.map(year => Math.round(projections.preferred.monthly[year] || 0)), backgroundColor: 'rgba(54, 162, 235, 0.9)', yAxisID: 'y_monthly', barPercentage: 0.65, categoryPercentage: 0.8, maxBarThickness: 70, borderRadius: 4 },
                    { type: 'bar', label: 'Monthly File at 70', data: displayYearsForData.map(year => Math.round(projections.age70.monthly[year] || 0)), backgroundColor: 'rgba(75, 192, 192, 0.9)', yAxisID: 'y_monthly', barPercentage: 0.65, categoryPercentage: 0.8, maxBarThickness: 70, borderRadius: 4 },
                    { type: 'line', label: 'Cumulative File at 62', data: displayYearsForData.map(year => Math.round(projections.age62.cumulative[year] || 0)), borderColor: 'red', yAxisID: 'y_cumulative', fill: false, order: 2, borderWidth: 2 },
                    { type: 'line', label: 'Cumulative Preferred Age', data: displayYearsForData.map(year => Math.round(projections.preferred.cumulative[year] || 0)), borderColor: 'blue', yAxisID: 'y_cumulative', fill: false, order: 2, borderWidth: 2 },
                    { type: 'line', label: 'Cumulative File at 70', data: displayYearsForData.map(year => Math.round(projections.age70.cumulative[year] || 0)), borderColor: 'green', yAxisID: 'y_cumulative', fill: false, order: 2, borderWidth: 2 },
                ]
            };
            newChartOptions = { 
                plugins: {
                    title: { display: true, text: 'Combined View' },
                    tooltip: { callbacks: { label: tooltipLabelFormatter } }
                },
                layout: { padding: CHART_PADDING },
                scales: { 
                    x: { title: { text: 'Year' }, ticks: { autoSkip: false } }, 
                    y_monthly: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { text: 'Monthly Benefit ($)', display: true },
                        ticks: { callback: formatCurrencyTick }
                    },
                    y_cumulative: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { text: 'Cumulative Benefits ($)', display: true },
                        grid: { drawOnChartArea: false },
                        ticks: { callback: formatCurrencyTick }
                    }
                }
            };
        }

        setChartData(newChartData);
        setChartOptions(newChartOptions);

    }, [isMarried, spouse1Dob, spouse1Pia, spouse1PreferredYear, spouse1PreferredMonth, spouse2Dob, spouse2Pia, spouse2PreferredYear, spouse2PreferredMonth, inflation, chartView, prematureDeath, deathYear, activeRecordView]);

    const handlePrimaryOnlyToggle = (event) => {
        setActiveRecordView(event.target.checked ? 'primary' : 'combined');
    };

    const handleSpouseOnlyToggle = (event) => {
        setActiveRecordView(event.target.checked ? 'spouse' : 'combined');
    };

    return (
        <div style={{ fontFamily: 'sans-serif', padding: '20px', maxWidth: '1200px', margin: 'auto' }}>
            <header style={{ backgroundColor: '#003366', color: 'white', padding: '10px', textAlign: 'center' }}>
                <h2>Social Security "Show Me the Money" Calculator</h2>
            </header>
            <div style={{ padding: '20px', backgroundColor: '#f0f4f8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px', gap: '24px' }}>
                    <div style={{ minWidth: '280px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                            <h3 style={{ margin: 0 }}>Primary Filer</h3>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#4b5563' }}>
                                <input
                                    type="checkbox"
                                    checked={activeRecordView === 'primary'}
                                    onChange={handlePrimaryOnlyToggle}
                                />
                                <span>Show this record only</span>
                            </label>
                        </div>
                        <div style={{ marginTop: '8px' }}>
                            <label>Name:&nbsp;
                                <input type="text" value={primaryName} readOnly style={{ width: '170px', backgroundColor: '#f5f5f5' }} />
                            </label>
                        </div>
                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <label>Date of Birth:&nbsp;
                                <input type="date" value={spouse1Dob} onChange={e => setSpouse1Dob(e.target.value)} />
                            </label>
                            <span style={{ fontSize: '0.9rem', color: '#333', fontWeight: 500 }}>Current Age: {formatAge(spouse1Dob)}</span>
                        </div>
                        <div style={{ marginTop: '8px' }}>
                            <label>Benefit (PIA) at FRA:&nbsp;
                                <input type="number" value={spouse1Pia} onChange={e => setSpouse1Pia(Number(e.target.value))} />
                            </label>
                        </div>
                        <div style={{ border: '1px solid #3b82f6', padding: '10px', marginTop: '10px', borderRadius: '4px' }}>
                            <label style={{ fontWeight: 600 }}>Primary Filer Preferred Filing Age</label><br />
                            Preferred: <input type="number" value={spouse1PreferredYear} onChange={e => setSpouse1PreferredYear(Number(e.target.value))} style={{ width: '60px' }} />
                            &nbsp;Year&nbsp;
                            <input type="number" value={spouse1PreferredMonth} onChange={e => setSpouse1PreferredMonth(Number(e.target.value))} style={{ width: '60px' }} />
                            &nbsp;Month
                        </div>
                    </div>
                    {isMarried && (
                        <div style={{ minWidth: '280px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                                <h3 style={{ margin: 0 }}>Spouse</h3>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#4b5563' }}>
                                    <input
                                        type="checkbox"
                                        checked={activeRecordView === 'spouse'}
                                        onChange={handleSpouseOnlyToggle}
                                    />
                                    <span>Show this record only</span>
                                </label>
                            </div>
                            <div style={{ marginTop: '8px' }}>
                                <label>Name:&nbsp;
                                    <input type="text" value={spouseName} readOnly style={{ width: '170px', backgroundColor: '#f5f5f5' }} />
                                </label>
                            </div>
                            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <label>Date of Birth:&nbsp;
                                    <input type="date" value={spouse2Dob} onChange={e => setSpouse2Dob(e.target.value)} />
                                </label>
                                <span style={{ fontSize: '0.9rem', color: '#333', fontWeight: 500 }}>Current Age: {formatAge(spouse2Dob)}</span>
                            </div>
                            <div style={{ marginTop: '8px' }}>
                                <label>Benefit (PIA) at FRA:&nbsp;
                                    <input type="number" value={spouse2Pia} onChange={e => setSpouse2Pia(Number(e.target.value))} />
                                </label>
                            </div>
                            <div style={{ border: '1px solid #3b82f6', padding: '10px', marginTop: '10px', borderRadius: '4px' }}>
                                <label style={{ fontWeight: 600 }}>Spouse Preferred Filing Age</label><br />
                                Preferred: <input type="number" value={spouse2PreferredYear} onChange={e => setSpouse2PreferredYear(Number(e.target.value))} style={{ width: '60px' }} />
                                &nbsp;Year&nbsp;
                                <input type="number" value={spouse2PreferredMonth} onChange={e => setSpouse2PreferredMonth(Number(e.target.value))} style={{ width: '60px' }} />
                                &nbsp;Month
                            </div>
                        </div>
                    )}
                </div>
                <label><input type="checkbox" checked={isMarried} onChange={(e) => setIsMarried(e.target.checked)} /> Married/Domestic Partner</label><br/>
                {isMarried && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                                type="checkbox"
                                checked={prematureDeath}
                                onChange={e => setPrematureDeath(e.target.checked)}
                            />
                            Potential Premature Death of Either Spouse?
                        </label>
                        {prematureDeath && (
                            <select
                                value={deathYear}
                                onChange={e => setDeathYear(Number(e.target.value))}
                                style={{ padding: '4px' }}
                            >
                                {Array.from({ length: 2075 - currentCalendarYear }, (_, idx) => currentCalendarYear + 1 + idx).map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        )}
                    </div>
                )}

                <div style={{marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px'}}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontWeight: 500 }}>
                        Expected Inflation
                        <input
                            type="range"
                            min="0"
                            max="0.1"
                            step="0.001"
                            value={inflation}
                            onChange={e => setInflation(Number(e.target.value))}
                            style={{ accentColor: (inflation >= 0.02 && inflation <= 0.03) ? '#1d4ed8' : '#ff8c00' }}
                        />
                    </label>
                    <span style={{ fontWeight: 600 }}>{(inflation * 100).toFixed(1)}%</span>
                </div>

                <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
                    {['monthly', 'cumulative', 'combined'].map(view => (
                        <button
                            key={view}
                            onClick={() => setChartView(view)}
                            style={{
                                padding: '10px 18px',
                                borderRadius: '10px',
                                border: 'none',
                                fontWeight: chartView === view ? 600 : 500,
                                cursor: 'pointer',
                                background: chartView === view ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : '#e5e7eb',
                                color: chartView === view ? '#ffffff' : '#1f2937',
                                boxShadow: chartView === view ? '0 10px 22px rgba(37, 99, 235, 0.20), inset 0 1px 0 rgba(255,255,255,0.3)' : 'inset 0 1px 2px rgba(255,255,255,0.7)',
                                transition: 'all 0.2s ease',
                                opacity: chartView === view ? 0.95 : 1,
                                letterSpacing: '0.02em'
                            }}
                        >
                            {view === 'monthly' ? 'Monthly Benefit' : view === 'cumulative' ? 'Cumulative Benefit' : 'Combined'}
                        </button>
                    ))}
                </div>

                <div style={{ marginTop: '20px' }}>
                    <div style={{ height: '500px' }}>
                        {chartView === 'monthly' ? <Bar data={chartData} options={chartOptions} /> :
                         chartView === 'cumulative' ? <Line data={chartData} options={chartOptions} /> :
                         <Bar data={chartData} options={chartOptions} />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShowMeTheMoneyCalculator;
