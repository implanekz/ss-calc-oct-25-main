import React, { useState, useEffect, useMemo } from 'react';
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
    const [chartView, setChartView] = useState('monthly'); // monthly, cumulative, combined, earlyLate, post70, sscuts
    const [chartData, setChartData] = useState({ labels: [], datasets: [] });
    const [chartOptions, setChartOptions] = useState({});
    const [prematureDeath, setPrematureDeath] = useState(false);
    const currentCalendarYear = new Date().getFullYear();
    const [deathYear, setDeathYear] = useState(currentCalendarYear + 1);
    const [activeRecordView, setActiveRecordView] = useState('combined');
    const [showMonthlyCashflow, setShowMonthlyCashflow] = useState(false);
    const [post70View, setPost70View] = useState('monthly');
    const [ssCutYear, setSsCutYear] = useState(2034);
    const [ssCutPercentage, setSsCutPercentage] = useState(21);
    const [ssCutsActive, setSsCutsActive] = useState(false);
    const [ssCutsChartData, setSsCutsChartData] = useState(null);
    const [ssCutsSummary, setSsCutsSummary] = useState([]);
    const [ssCutsPayload, setSsCutsPayload] = useState(null);
    const [showSsCutInfo, setShowSsCutInfo] = useState(false);

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


    const scenarioData = useMemo(() => {
        const primaryAge62 = calculateProjections(spouse1Pia, spouse1Dob, 62, 0, inflation);
        const primaryPreferred = calculateProjections(spouse1Pia, spouse1Dob, spouse1PreferredYear, spouse1PreferredMonth, inflation);
        const primaryAge70 = calculateProjections(spouse1Pia, spouse1Dob, 70, 0, inflation);

        const primaryProjections = {
            age62: primaryAge62,
            preferred: primaryPreferred,
            age70: primaryAge70
        };

        const deathYearNumber = Number(deathYear) || deathYear;

        const combineMonthlyProjection = (primaryScenario, spouseScenario) => {
            if (!isMarried || !spouseScenario) {
                return primaryScenario;
            }

            const allYears = Array.from(new Set([
                ...Object.keys(primaryScenario.monthly || {}),
                ...Object.keys(spouseScenario.monthly || {})
            ])).map(Number).sort((a, b) => a - b);

            const monthly = {};
            const cumulative = {};
            let runningTotal = 0;

            allYears.forEach(year => {
                const primaryMonthly = primaryScenario.monthly?.[year] || 0;
                const spouseMonthly = spouseScenario.monthly?.[year] || 0;
                const combinedMonthly = prematureDeath && year >= deathYearNumber
                    ? Math.max(primaryMonthly, spouseMonthly)
                    : primaryMonthly + spouseMonthly;

                monthly[year] = combinedMonthly;
                runningTotal += combinedMonthly * 12;
                cumulative[year] = runningTotal;
            });

            return { monthly, cumulative };
        };

        let spouseProjections = null;
        let combinedProjections = primaryProjections;

        if (isMarried) {
            const spouseAge62 = calculateProjections(spouse2Pia, spouse2Dob, 62, 0, inflation);
            const spousePreferredScenario = calculateProjections(spouse2Pia, spouse2Dob, spouse2PreferredYear, spouse2PreferredMonth, inflation);
            const spouseAge70 = calculateProjections(spouse2Pia, spouse2Dob, 70, 0, inflation);

            spouseProjections = {
                age62: spouseAge62,
                preferred: spousePreferredScenario,
                age70: spouseAge70
            };

            combinedProjections = {
                age62: combineMonthlyProjection(primaryAge62, spouseAge62),
                preferred: combineMonthlyProjection(primaryPreferred, spousePreferredScenario),
                age70: combineMonthlyProjection(primaryAge70, spouseAge70)
            };
        }

        const primaryIsLowerPia = !isMarried || spouse1Pia <= spouse2Pia;

        let earlyLateProjection = primaryProjections.age62;
        let preferredLateProjection = primaryProjections.preferred;
        let bothLateProjection = primaryProjections.age70;

        if (isMarried && spouseProjections) {
            if (primaryIsLowerPia) {
                earlyLateProjection = combineMonthlyProjection(primaryProjections.age62, spouseProjections.age70);
                preferredLateProjection = combineMonthlyProjection(primaryProjections.preferred, spouseProjections.age70);
                bothLateProjection = combineMonthlyProjection(primaryProjections.age70, spouseProjections.age70);
            } else {
                earlyLateProjection = combineMonthlyProjection(primaryProjections.age70, spouseProjections.age62);
                preferredLateProjection = combineMonthlyProjection(primaryProjections.age70, spouseProjections.preferred);
                bothLateProjection = combineMonthlyProjection(primaryProjections.age70, spouseProjections.age70);
            }
        }

        const birthYearPrimary = new Date(spouse1Dob).getFullYear();
        const birthYearSpouse = isMarried ? new Date(spouse2Dob).getFullYear() : null;
        const displayAges = [62, 67, 70, 75, 80, 85, 90, 95];
        const primaryYears = displayAges.map(age => birthYearPrimary + age);
        const spouseYears = isMarried && birthYearSpouse ? displayAges.map(age => birthYearSpouse + age) : null;

        return {
            primaryProjections,
            spouseProjections,
            combinedProjections,
            earlyLateProjection,
            preferredLateProjection,
            bothLateProjection,
            birthYearPrimary,
            birthYearSpouse,
            primaryYears,
            spouseYears
        };
    }, [isMarried, spouse1Dob, spouse1Pia, spouse1PreferredYear, spouse1PreferredMonth, spouse2Dob, spouse2Pia, spouse2PreferredYear, spouse2PreferredMonth, inflation, prematureDeath, deathYear]);

    useEffect(() => {
        if (!scenarioData) {
            setChartData({ labels: [], datasets: [] });
            setChartOptions({});
            return;
        }

        const {
            primaryProjections,
            spouseProjections,
            combinedProjections,
            earlyLateProjection,
            preferredLateProjection,
            bothLateProjection,
            birthYearPrimary,
            birthYearSpouse,
            primaryYears,
            spouseYears
        } = scenarioData;

        const projections =
            activeRecordView === 'primary'
                ? primaryProjections
                : activeRecordView === 'spouse' && spouseProjections
                    ? spouseProjections
                    : combinedProjections;

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

        if (chartView === 'sscuts') {
            const comparisonLabel = ssCutsActive ? 'Projected Cuts Applied' : 'Baseline (No Cuts)';
            newChartData = ssCutsChartData || { labels: [], datasets: [] };
            newChartOptions = {
                plugins: {
                    title: { display: true, text: `SS Reserve Fund Cuts – ${comparisonLabel}` },
                    tooltip: { callbacks: { label: tooltipLabelFormatter } },
                    legend: { position: 'bottom' }
                },
                animation: { duration: 700, easing: 'easeOutQuart' },
                layout: { padding: CHART_PADDING },
                scales: {
                    x: { title: { text: 'Age' }, ticks: { autoSkip: false } },
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

            setChartData(newChartData);
            setChartOptions(newChartOptions);
            return;
        }

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
        } else if (chartView === 'earlyLate') {
            const cashflowYears = primaryYears;
            const cashflowLabels = cashflowYears.map(year => `Age ${year - birthYearPrimary}`);

            const valueMapper = (projection) => cashflowYears.map(year => {
                const monthlyValue = projection.monthly?.[year] || 0;
                return Math.round(monthlyValue * (showMonthlyCashflow ? 1 : 12));
            });

            const yAxisLabel = showMonthlyCashflow
                ? 'Monthly Household Income ($)'
                : 'Annual Household Income ($)';

            newChartData = {
                labels: cashflowLabels,
                datasets: [
                    {
                        label: 'Lower PIA @62, Higher PIA @70',
                        data: valueMapper(earlyLateProjection),
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.12)',
                        fill: false,
                        tension: 0.35,
                        pointRadius: 3
                    },
                    {
                        label: 'Lower PIA @67, Higher PIA @70',
                        data: valueMapper(preferredLateProjection),
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0.12)',
                        fill: false,
                        tension: 0.35,
                        pointRadius: 3
                    },
                    {
                        label: 'Both @70',
                        data: valueMapper(bothLateProjection),
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.12)',
                        fill: false,
                        tension: 0.35,
                        pointRadius: 3
                    }
                ]
            };
            newChartOptions = {
                plugins: {
                    title: { display: true, text: 'Early vs Late Filing Cash Flow' },
                    tooltip: { callbacks: { label: tooltipLabelFormatter } }
                },
                layout: { padding: CHART_PADDING },
                scales: {
                    x: { title: { text: 'Age' }, ticks: { autoSkip: false } },
                    y: {
                        title: { text: yAxisLabel },
                        ticks: { callback: formatCurrencyTick }
                    }
                }
            };
        } else if (chartView === 'post70') {
            const post70Years = primaryYears.filter(year => (year - birthYearPrimary) >= 70);
            const yearsToUse = post70Years.length > 0 ? post70Years : primaryYears;
            const labelsPost70 = yearsToUse.map(year => `Age ${year - birthYearPrimary}`);

            const baselineYear = yearsToUse[0] - 1;

            const monthlyValues = (projection) => yearsToUse.map(year => projection.monthly?.[year] || 0);

            const cumulativeAfter70 = (projection) => yearsToUse.map(year => {
                const total = projection.cumulative?.[year] || 0;
                const baseline = projection.cumulative?.[baselineYear] || 0;
                return Math.max(0, total - baseline);
            });

            const monthlyDatasets = [
                {
                    label: 'File at 62',
                    data: monthlyValues(combinedProjections.age62),
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.12)',
                    fill: false,
                    tension: 0.25,
                    pointRadius: 3
                },
                {
                    label: 'Preferred Age',
                    data: monthlyValues(combinedProjections.preferred),
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.12)',
                    fill: false,
                    tension: 0.25,
                    pointRadius: 3
                },
                {
                    label: 'File at 70',
                    data: monthlyValues(combinedProjections.age70),
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.12)',
                    fill: false,
                    tension: 0.25,
                    pointRadius: 3
                }
            ];

            const cumulativeDatasets = [
                {
                    label: 'File at 62',
                    data: cumulativeAfter70(combinedProjections.age62),
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.12)',
                    fill: false,
                    tension: 0.25,
                    pointRadius: 3
                },
                {
                    label: 'Preferred Age',
                    data: cumulativeAfter70(combinedProjections.preferred),
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.12)',
                    fill: false,
                    tension: 0.25,
                    pointRadius: 3
                },
                {
                    label: 'File at 70',
                    data: cumulativeAfter70(combinedProjections.age70),
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.12)',
                    fill: false,
                    tension: 0.25,
                    pointRadius: 3
                }
            ];

            if (post70View === 'monthly') {
                newChartData = {
                    labels: labelsPost70,
                    datasets: monthlyDatasets
                };
                newChartOptions = {
                    plugins: {
                        title: { display: true, text: 'Post-70 Monthly Income' },
                        tooltip: { callbacks: { label: tooltipLabelFormatter } }
                    },
                    layout: { padding: CHART_PADDING },
                    scales: {
                        x: { title: { text: 'Age' }, ticks: { autoSkip: false } },
                        y: { title: { text: 'Monthly Income ($)' }, ticks: { callback: formatCurrencyTick } }
                    }
                };
            } else if (post70View === 'cumulative') {
                newChartData = {
                    labels: labelsPost70,
                    datasets: cumulativeDatasets
                };
                newChartOptions = {
                    plugins: {
                        title: { display: true, text: 'Post-70 Cumulative Income' },
                        tooltip: { callbacks: { label: tooltipLabelFormatter } }
                    },
                    layout: { padding: CHART_PADDING },
                    scales: {
                        x: { title: { text: 'Age' }, ticks: { autoSkip: false } },
                        y: { title: { text: 'Cumulative Income Since 70 ($)' }, ticks: { callback: formatCurrencyTick } }
                    }
                };
            } else {
                newChartData = {
                    labels: labelsPost70,
                    datasets: [
                        {
                            type: 'bar',
                            label: 'File at 62',
                            data: monthlyValues(combinedProjections.age62),
                            backgroundColor: 'rgba(255, 99, 132, 0.65)',
                            yAxisID: 'y_monthly',
                            barPercentage: 0.65,
                            categoryPercentage: 0.8
                        },
                        {
                            type: 'bar',
                            label: 'Preferred Age',
                            data: monthlyValues(combinedProjections.preferred),
                            backgroundColor: 'rgba(54, 162, 235, 0.65)',
                            yAxisID: 'y_monthly',
                            barPercentage: 0.65,
                            categoryPercentage: 0.8
                        },
                        {
                            type: 'bar',
                            label: 'File at 70',
                            data: monthlyValues(combinedProjections.age70),
                            backgroundColor: 'rgba(75, 192, 192, 0.65)',
                            yAxisID: 'y_monthly',
                            barPercentage: 0.65,
                            categoryPercentage: 0.8
                        },
                        {
                            type: 'line',
                            label: 'Cumulative File at 62',
                            data: cumulativeAfter70(combinedProjections.age62),
                            borderColor: 'rgba(255, 99, 132, 1)',
                            backgroundColor: 'transparent',
                            yAxisID: 'y_cumulative',
                            tension: 0.25,
                            fill: false,
                            order: 2
                        },
                        {
                            type: 'line',
                            label: 'Cumulative Preferred Age',
                            data: cumulativeAfter70(combinedProjections.preferred),
                            borderColor: 'rgba(54, 162, 235, 1)',
                            backgroundColor: 'transparent',
                            yAxisID: 'y_cumulative',
                            tension: 0.25,
                            fill: false,
                            order: 2
                        },
                        {
                            type: 'line',
                            label: 'Cumulative File at 70',
                            data: cumulativeAfter70(combinedProjections.age70),
                            borderColor: 'rgba(75, 192, 192, 1)',
                            backgroundColor: 'transparent',
                            yAxisID: 'y_cumulative',
                            tension: 0.25,
                            fill: false,
                            order: 2
                        }
                    ]
                };
                newChartOptions = {
                    plugins: {
                        title: { display: true, text: 'Post-70 Combined View' },
                        tooltip: { callbacks: { label: tooltipLabelFormatter } }
                    },
                    layout: { padding: CHART_PADDING },
                    scales: {
                        x: { title: { text: 'Age' }, ticks: { autoSkip: false } },
                        y_monthly: {
                            type: 'linear',
                            position: 'left',
                            title: { text: 'Monthly Income ($)', display: true },
                            ticks: { callback: formatCurrencyTick }
                        },
                        y_cumulative: {
                            type: 'linear',
                            position: 'right',
                            title: { text: 'Cumulative Income Since 70 ($)', display: true },
                            grid: { drawOnChartArea: false },
                            ticks: { callback: formatCurrencyTick }
                        }
                    }
                };
            }
        } else {
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

    }, [scenarioData, chartView, activeRecordView, showMonthlyCashflow, post70View, ssCutsChartData, ssCutsActive, isMarried]);

    useEffect(() => {
        setSsCutsChartData(null);
        setSsCutsSummary([]);
        setSsCutsPayload(null);
        setSsCutsActive(false);
    }, [scenarioData, activeRecordView]);


    const handlePrimaryOnlyToggle = (event) => {
        setActiveRecordView(event.target.checked ? 'primary' : 'combined');
    };

    const handleSpouseOnlyToggle = (event) => {
        setActiveRecordView(event.target.checked ? 'spouse' : 'combined');
    };

    const applySsCutsMode = (projected, payload) => {
        if (!payload || !payload.scenarios.length) {
            setSsCutsChartData(null);
            setSsCutsActive(false);
            setSsCutsSummary([]);
            return;
        }

        const datasets = [];
        payload.scenarios.forEach((scenario) => {
            if (!scenario) {
                return;
            }
            const monthlyValues = projected ? scenario.cutMonthly : scenario.baselineMonthly;
            const cumulativeValues = projected ? scenario.cutCumulative : scenario.baselineCumulative;

            datasets.push({
                type: 'bar',
                label: `${scenario.label} Monthly`,
                data: monthlyValues.map(value => Math.round(value)),
                backgroundColor: scenario.barColor,
                borderColor: scenario.lineColor,
                borderWidth: 1,
                borderRadius: 6,
                yAxisID: 'y_monthly',
                barPercentage: 0.55,
                categoryPercentage: 0.72,
                order: 1
            });

            datasets.push({
                type: 'line',
                label: `${scenario.label} Cumulative`,
                data: cumulativeValues.map(value => Math.round(value)),
                borderColor: scenario.lineColor,
                backgroundColor: scenario.lineColor,
                fill: false,
                tension: 0.28,
                pointRadius: 3,
                yAxisID: 'y_cumulative',
                order: 2
            });
        });

        setSsCutsChartData({
            labels: payload.labels,
            datasets
        });
        setSsCutsSummary(payload.summary);
        setSsCutsActive(projected);
    };

    const handleProjectCuts = () => {
        if (!scenarioData) {
            return;
        }

        const {
            primaryProjections,
            spouseProjections,
            combinedProjections,
            birthYearPrimary,
            birthYearSpouse,
            primaryYears,
            spouseYears
        } = scenarioData;

        const baseProjections =
            activeRecordView === 'primary'
                ? primaryProjections
                : activeRecordView === 'spouse' && spouseProjections
                    ? spouseProjections
                    : combinedProjections;

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

        const scenarioConfigs = [
            { key: 'age62', label: 'File at 62', barColor: 'rgba(239, 68, 68, 0.78)', lineColor: 'rgba(239, 68, 68, 1)' },
            { key: 'preferred', label: 'Preferred Age', barColor: 'rgba(59, 130, 246, 0.78)', lineColor: 'rgba(59, 130, 246, 1)' },
            { key: 'age70', label: 'File at 70', barColor: 'rgba(45, 212, 191, 0.78)', lineColor: 'rgba(20, 184, 166, 1)' },
        ];

        const reductionFactor = Math.min(1, Math.max(0, 1 - (Number(ssCutPercentage) || 0) / 100));
        const cutYearValue = Number(ssCutYear) || ssCutYear;

        const applyCuts = (projection) => {
            const yearKeys = Array.from(new Set([
                ...Object.keys(projection.monthly || {}),
                ...Object.keys(projection.cumulative || {})
            ])).map(Number).sort((a, b) => a - b);

            const monthly = {};
            const cumulative = {};
            let running = 0;

            yearKeys.forEach(year => {
                const baseMonthly = projection.monthly?.[year] || 0;
                const adjustedMonthly = year >= cutYearValue ? baseMonthly * reductionFactor : baseMonthly;
                const roundedMonthly = Number(adjustedMonthly.toFixed(2));
                monthly[year] = roundedMonthly;
                running = Number((running + roundedMonthly * 12).toFixed(2));
                cumulative[year] = running;
            });

            return { monthly, cumulative };
        };

        const scenarios = [];

        scenarioConfigs.forEach((config) => {
            const baseProjection = baseProjections?.[config.key];
            if (!baseProjection) {
                return;
            }

            const cutProjection = applyCuts(baseProjection);

            const baselineMonthly = displayYearsForData.map(year => Number((baseProjection.monthly?.[year] || 0).toFixed(2)));
            const baselineCumulative = displayYearsForData.map(year => Number((baseProjection.cumulative?.[year] || 0).toFixed(2)));
            const cutMonthly = displayYearsForData.map(year => Number((cutProjection.monthly?.[year] || 0).toFixed(2)));
            const cutCumulative = displayYearsForData.map(year => Number((cutProjection.cumulative?.[year] || 0).toFixed(2)));

            const baselineTotal = baselineCumulative[baselineCumulative.length - 1] || 0;
            const cutTotal = cutCumulative[cutCumulative.length - 1] || 0;

            scenarios.push({
                label: config.label,
                barColor: config.barColor,
                lineColor: config.lineColor,
                baselineMonthly,
                baselineCumulative,
                cutMonthly,
                cutCumulative,
                baselineTotal,
                cutTotal
            });
        });

        if (!scenarios.length) {
            setSsCutsPayload(null);
            applySsCutsMode(false, null);
            setChartView('sscuts');
            return;
        }

        const summary = scenarios.map((scenario) => ({
            label: scenario.label,
            baseline: Math.round(scenario.baselineTotal),
            projected: Math.round(scenario.cutTotal),
            delta: Math.round(scenario.cutTotal - scenario.baselineTotal)
        }));

        const payload = {
            labels,
            scenarios,
            summary
        };

        setSsCutsPayload(payload);
        applySsCutsMode(true, payload);
        setChartView('sscuts');
    };

    const handleShowBaseline = () => {
        if (!ssCutsPayload) {
            return;
        }
        applySsCutsMode(false, ssCutsPayload);
        setChartView('sscuts');
    };

    const chartTabs = [
        { key: 'monthly', label: 'Monthly Benefit' },
        { key: 'cumulative', label: 'Cumulative Benefit' },
        { key: 'combined', label: 'Combined' },
        { key: 'earlyLate', label: 'Early/Late' },
        { key: 'post70', label: 'Post-70' },
        { key: 'sscuts', label: 'SS Cuts' },
    ];

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
                    {chartTabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setChartView(tab.key)}
                            style={{
                                padding: '10px 18px',
                                borderRadius: '10px',
                                border: 'none',
                                fontWeight: chartView === tab.key ? 600 : 500,
                                cursor: 'pointer',
                                background: chartView === tab.key ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : '#e5e7eb',
                                color: chartView === tab.key ? '#ffffff' : '#1f2937',
                                boxShadow: chartView === tab.key ? '0 10px 22px rgba(37, 99, 235, 0.20), inset 0 1px 0 rgba(255,255,255,0.3)' : 'inset 0 1px 2px rgba(255,255,255,0.7)',
                                transition: 'all 0.2s ease',
                                opacity: chartView === tab.key ? 0.95 : 1,
                                letterSpacing: '0.02em'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div style={{ marginTop: '20px' }}>
                    {chartView === 'earlyLate' && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px', marginRight: CHART_PADDING.right }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#334155' }}>
                                <input
                                    type="checkbox"
                                    checked={showMonthlyCashflow}
                                    onChange={e => setShowMonthlyCashflow(e.target.checked)}
                                />
                                Show monthly income
                            </label>
                        </div>
                    )}
                    {chartView === 'post70' && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px', marginRight: CHART_PADDING.right, gap: '10px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: '#334155' }}>View:</span>
                            {['monthly', 'cumulative', 'combined'].map(option => (
                                <button
                                    key={option}
                                    onClick={() => setPost70View(option)}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '999px',
                                        border: '1px solid',
                                        borderColor: post70View === option ? '#2563eb' : '#cbd5f5',
                                        background: post70View === option ? '#2563eb' : '#ffffff',
                                        color: post70View === option ? '#ffffff' : '#1f2937',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {option === 'monthly' ? 'Monthly' : option === 'cumulative' ? 'Cumulative' : 'Combined'}
                                </button>
                            ))}
                        </div>
                    )}
                    {chartView === 'sscuts' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '12px 16px', background: '#eef2ff', borderRadius: '12px', border: '1px solid #c7d2fe', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                                <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem', color: '#1f2937', minWidth: '140px' }}>
                                    Insolvency Year
                                    <select
                                        value={ssCutYear}
                                        onChange={e => setSsCutYear(Number(e.target.value))}
                                        style={{ marginTop: '4px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #c7d2fe', background: '#fff' }}
                                    >
                                        {Array.from({ length: 21 }, (_, idx) => 2030 + idx).map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </label>
                                <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem', color: '#1f2937', minWidth: '140px' }}>
                                    Benefit Cut (%)
                                    <select
                                        value={ssCutPercentage}
                                        onChange={e => setSsCutPercentage(Number(e.target.value))}
                                        style={{ marginTop: '4px', padding: '6px 10px', borderRadius: '8px', border: '1px solid #c7d2fe', background: '#fff' }}
                                    >
                                        {Array.from({ length: 26 }, (_, idx) => 10 + idx).map(percent => (
                                            <option key={percent} value={percent}>{percent}%</option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <button
                                    onClick={handleProjectCuts}
                                    style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff', fontWeight: 600, cursor: 'pointer', boxShadow: '0 12px 20px rgba(37, 99, 235, 0.18)'}}
                                >
                                    Project Cuts
                                </button>
                                <button
                                    onClick={handleShowBaseline}
                                    disabled={!ssCutsPayload || !ssCutsActive}
                                    style={{
                                        padding: '9px 18px',
                                        borderRadius: '10px',
                                        border: '1px solid #3b82f6',
                                        background: (!ssCutsPayload || !ssCutsActive) ? '#f1f5f9' : '#ffffff',
                                        color: (!ssCutsPayload || !ssCutsActive) ? '#94a3b8' : '#1d4ed8',
                                        fontWeight: 500,
                                        cursor: (!ssCutsPayload || !ssCutsActive) ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    Show Baseline
                                </button>
                                <button
                                    onClick={() => setShowSsCutInfo(true)}
                                    style={{ padding: '9px 16px', borderRadius: '10px', border: '1px solid #3b82f6', background: '#ffffff', color: '#1d4ed8', fontWeight: 500, cursor: 'pointer' }}
                                >
                                    What is this?
                                </button>
                            </div>
                        </div>
                    )}
                    <div style={{ height: '500px' }}>
                        {
                            chartView === 'sscuts'
                                ? (ssCutsChartData && ssCutsChartData.labels && ssCutsChartData.labels.length > 0
                                    ? <Bar data={chartData} options={chartOptions} />
                                    : (
                                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: '0.95rem', fontWeight: 500, border: '2px dashed #cbd5f5', borderRadius: '16px', textAlign: 'center', padding: '0 24px' }}>
                                            Adjust the year or percentage and press “Project” to animate the impact of a trust-fund cut. Then toggle back to the baseline to feel the difference.
                                        </div>
                                    ))
                                : chartView === 'monthly' ? <Bar data={chartData} options={chartOptions} /> :
                                  chartView === 'cumulative' ? <Line data={chartData} options={chartOptions} /> :
                                  chartView === 'combined' ? <Bar data={chartData} options={chartOptions} /> :
                                  chartView === 'earlyLate' ? <Line data={chartData} options={chartOptions} /> :
                                  post70View === 'combined' ? <Bar data={chartData} options={chartOptions} /> :
                                  <Line data={chartData} options={chartOptions} />
                        }
                    </div>
                    {chartView === 'sscuts' && ssCutsSummary.length > 0 && (
                        <div style={{ marginTop: '16px', padding: '14px 18px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', color: '#1f2937' }}>
                            <strong style={{ display: 'block', marginBottom: '4px' }}>Cut Scenario Snapshot</strong>
                            <div style={{ marginBottom: '6px', fontSize: '0.9rem', color: '#334155' }}>
                                Viewing: {ssCutsActive ? 'Projected benefit cuts applied' : 'Baseline benefits (no cuts)'}
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '18px' }}>
                                {ssCutsSummary.map(item => {
                                    const diff = item.delta;
                                    return (
                                        <li key={item.label} style={{ marginBottom: '4px' }}>
                                            {item.label}: {currencyFormatter.format(Math.round(item.baseline))} ➝ {currencyFormatter.format(Math.round(item.projected))}
                                            <span style={{ color: diff < 0 ? '#b91c1c' : '#16a34a', marginLeft: '6px', fontWeight: 600 }}>
                                                ({currencyFormatter.format(Math.round(diff))})
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
            {showSsCutInfo && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                    <div style={{ background: '#ffffff', maxWidth: '480px', width: '90%', padding: '24px 28px', borderRadius: '16px', boxShadow: '0 25px 45px rgba(15, 23, 42, 0.35)', color: '#1f2937', lineHeight: 1.55 }}>
                        <h3 style={{ marginTop: 0, fontSize: '1.4rem', color: '#1d4ed8' }}>About the SS Cuts Scenario</h3>
                        <p style={{ marginTop: '8px' }}>
                            The Social Security trustees project that the trust fund reserves may be exhausted in the early 2030s.
                            When that happens, incoming payroll taxes would only fund a percentage of scheduled benefits, resulting in an automatic across-the-board reduction
                            unless Congress acts. This tool applies that reduction from the selected year forward so you can stress-test your claiming strategy.
                        </p>
                        <p style={{ marginTop: '8px' }}>
                            Use this projection to see how delaying benefits, coordinating with a spouse, or using bridge income may offset a future cut.
                            The calculation keeps your inflation assumption and applies the cut to both monthly payments and the lifetime totals after the chosen year.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
                            <button
                                onClick={() => setShowSsCutInfo(false)}
                                style={{ padding: '9px 18px', borderRadius: '10px', border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShowMeTheMoneyCalculator;
