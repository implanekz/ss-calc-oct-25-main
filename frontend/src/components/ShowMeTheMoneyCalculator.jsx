import React, { useState, useEffect, useMemo } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Checkbox, Button } from './ui';
import { PillTabs, PillTab } from './ui';

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

const ShowMeTheMoneyCalculator = () => {
    const [isMarried, setIsMarried] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
        <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden">
            {/* Compact Sidebar */}
            <div className={`relative bg-white border-r border-gray-200 transition-all duration-300 ${
                sidebarCollapsed ? 'w-0 lg:w-12' : 'lg:w-80 xl:w-96'
            }`}>
                <div className={`h-full ${sidebarCollapsed ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                {!sidebarCollapsed && (
                    <div>
                        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-blue-50 flex justify-between items-start">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Controls</h2>
                                <p className="text-xs text-gray-600">Adjust your inputs</p>
                            </div>
                            <button
                                onClick={() => setSidebarCollapsed(true)}
                                className="hidden lg:flex p-1.5 bg-primary-600 text-white rounded-lg shadow-md hover:bg-primary-700 transition-all hover:scale-110"
                                title="Collapse controls"
                            >
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                    {/* Primary Filer - Compact */}
                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-semibold text-gray-900">Primary Filer</h3>
                            <Checkbox
                                label=""
                                checked={activeRecordView === 'primary'}
                                onChange={handlePrimaryOnlyToggle}
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <label className="block text-gray-600 mb-1">DOB</label>
                                    <input
                                        type="date"
                                        value={spouse1Dob}
                                        onChange={e => setSpouse1Dob(e.target.value)}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-600 mb-1">Age</label>
                                    <div className="px-2 py-1 bg-white border border-gray-200 rounded text-gray-700">
                                        {formatAge(spouse1Dob)}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">PIA at FRA ($)</label>
                                <input
                                    type="number"
                                    value={spouse1Pia}
                                    onChange={e => setSpouse1Pia(Number(e.target.value))}
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                />
                            </div>
                            <div className="bg-primary-100 rounded p-2">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Filing Age</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <input
                                            type="number"
                                            value={spouse1PreferredYear}
                                            onChange={e => setSpouse1PreferredYear(Number(e.target.value))}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                                            placeholder="Yr"
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="number"
                                            value={spouse1PreferredMonth}
                                            onChange={e => setSpouse1PreferredMonth(Number(e.target.value))}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                                            placeholder="Mo"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Spouse - Compact */}
                    {isMarried && (
                        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-sm font-semibold text-gray-900">Spouse</h3>
                                <Checkbox
                                    label=""
                                    checked={activeRecordView === 'spouse'}
                                    onChange={handleSpouseOnlyToggle}
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <label className="block text-gray-600 mb-1">DOB</label>
                                        <input
                                            type="date"
                                            value={spouse2Dob}
                                            onChange={e => setSpouse2Dob(e.target.value)}
                                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-600 mb-1">Age</label>
                                        <div className="px-2 py-1 bg-white border border-gray-200 rounded text-gray-700">
                                            {formatAge(spouse2Dob)}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">PIA at FRA ($)</label>
                                    <input
                                        type="number"
                                        value={spouse2Pia}
                                        onChange={e => setSpouse2Pia(Number(e.target.value))}
                                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                    />
                                </div>
                                <div className="bg-primary-100 rounded p-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Filing Age</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <input
                                                type="number"
                                                value={spouse2PreferredYear}
                                                onChange={e => setSpouse2PreferredYear(Number(e.target.value))}
                                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                                                placeholder="Yr"
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="number"
                                                value={spouse2PreferredMonth}
                                                onChange={e => setSpouse2PreferredMonth(Number(e.target.value))}
                                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                                                placeholder="Mo"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Options - Compact */}
                    <div className="border border-gray-200 rounded-lg p-3 bg-white">
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">Options</h3>
                        <div className="space-y-2">
                            <Checkbox
                                label={<span className="text-xs">Married/Partner</span>}
                                checked={isMarried}
                                onChange={(e) => setIsMarried(e.target.checked)}
                            />

                            {isMarried && (
                                <div className="ml-6 space-y-2">
                                    <Checkbox
                                        label={<span className="text-xs">Premature Death?</span>}
                                        checked={prematureDeath}
                                        onChange={e => setPrematureDeath(e.target.checked)}
                                    />
                                    {prematureDeath && (
                                        <select
                                            value={deathYear}
                                            onChange={e => setDeathYear(Number(e.target.value))}
                                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                                        >
                                            {Array.from({ length: 2075 - currentCalendarYear }, (_, idx) => currentCalendarYear + 1 + idx).map(year => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            )}

                            <div className="pt-2">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs font-medium text-gray-700">Inflation</label>
                                    <span className="text-xs font-semibold text-primary-600">
                                        {(inflation * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    value={inflation}
                                    onChange={e => setInflation(Number(e.target.value))}
                                    min="0"
                                    max="0.1"
                                    step="0.001"
                                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                                />
                            </div>
                        </div>
                    </div>
                        </div>
                    </div>
                )}
                </div>

                {/* Expand Button - Only shown when collapsed */}
                {sidebarCollapsed && (
                    <button
                        onClick={() => setSidebarCollapsed(false)}
                        className="hidden lg:flex absolute top-4 left-1 p-1.5 bg-primary-600 text-white rounded-lg shadow-lg hover:bg-primary-700 transition-all hover:scale-110 z-10"
                        title="Expand controls"
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Main Chart Area */}
            <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
                <div className="border-b border-gray-200 bg-white px-4 py-3">
                    <div className="flex flex-wrap gap-2 items-center justify-between">
                        <PillTabs className="flex-wrap">
                            {chartTabs.map(tab => (
                                <PillTab
                                    key={tab.key}
                                    active={chartView === tab.key}
                                    onClick={() => setChartView(tab.key)}
                                >
                                    <span className="text-xs">{tab.label}</span>
                                </PillTab>
                            ))}
                        </PillTabs>

                        {/* Chart Controls */}
                        {chartView === 'earlyLate' && (
                            <div className="flex items-center">
                                <Checkbox
                                    label={<span className="text-xs">Monthly</span>}
                                    checked={showMonthlyCashflow}
                                    onChange={e => setShowMonthlyCashflow(e.target.checked)}
                                />
                            </div>
                        )}
                    </div>

                    {chartView === 'sscuts' && (
                        <div className="mt-3 flex flex-wrap gap-3 items-end">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Insolvency Year</label>
                                <select
                                    value={ssCutYear}
                                    onChange={e => setSsCutYear(Number(e.target.value))}
                                    className="px-3 py-2 text-sm font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white hover:border-gray-400 transition-colors"
                                >
                                    {Array.from({ length: 21 }, (_, idx) => 2030 + idx).map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Benefit Cut</label>
                                <select
                                    value={ssCutPercentage}
                                    onChange={e => setSsCutPercentage(Number(e.target.value))}
                                    className="px-3 py-2 text-sm font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white hover:border-gray-400 transition-colors"
                                >
                                    {Array.from({ length: 26 }, (_, idx) => 10 + idx).map(percent => (
                                        <option key={percent} value={percent}>{percent}%</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={ssCutsActive ? handleShowBaseline : handleProjectCuts}
                                className={`px-6 py-2 text-sm font-bold rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105 ${
                                    ssCutsActive
                                        ? 'bg-gray-600 text-white hover:bg-gray-700'
                                        : 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800'
                                }`}
                            >
                                {ssCutsActive ? 'Show Baseline' : 'Project Cuts'}
                            </button>
                            <button
                                onClick={() => setShowSsCutInfo(true)}
                                className="w-8 h-8 flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white rounded-full transition-all shadow-md hover:shadow-lg transform hover:scale-110"
                                title="Learn more about SS cuts"
                            >
                                <span className="text-sm font-bold">i</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Chart Container */}
                <div className="flex-1 p-4 overflow-auto">
                    {/* Post-70 View Selector */}
                    {chartView === 'post70' && (
                        <div className="mb-4 bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">View Type:</label>
                            <div className="flex gap-3">
                                {[
                                    { key: 'monthly', label: 'Monthly Income' },
                                    { key: 'cumulative', label: 'Cumulative Income Since 70' },
                                    { key: 'combined', label: 'Both (Monthly + Cumulative)' }
                                ].map(option => (
                                    <button
                                        key={option.key}
                                        onClick={() => setPost70View(option.key)}
                                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                                            post70View === option.key
                                                ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="h-full bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        {
                            chartView === 'sscuts'
                                ? (ssCutsChartData && ssCutsChartData.labels && ssCutsChartData.labels.length > 0
                                    ? <Bar data={chartData} options={{...chartOptions, maintainAspectRatio: false}} />
                                    : (
                                        <div className="h-full flex items-center justify-center text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                                            <p className="text-center px-8 text-sm">
                                                Adjust the year or percentage and press "Project" to see the impact of a trust-fund cut.<br />
                                                Then toggle to the baseline to compare.
                                            </p>
                                        </div>
                                    ))
                                : chartView === 'monthly' ? <Bar data={chartData} options={{...chartOptions, maintainAspectRatio: false}} /> :
                                  chartView === 'cumulative' ? <Line data={chartData} options={{...chartOptions, maintainAspectRatio: false}} /> :
                                  chartView === 'combined' ? <Bar data={chartData} options={{...chartOptions, maintainAspectRatio: false}} /> :
                                  chartView === 'earlyLate' ? <Line data={chartData} options={{...chartOptions, maintainAspectRatio: false}} /> :
                                  post70View === 'combined' ? <Bar data={chartData} options={{...chartOptions, maintainAspectRatio: false}} /> :
                                  <Line data={chartData} options={{...chartOptions, maintainAspectRatio: false}} />
                        }
                    </div>

                    {/* SS Cuts Summary */}
                    {chartView === 'sscuts' && ssCutsSummary.length > 0 && (
                        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <h4 className="text-sm font-semibold text-gray-900 mb-1">Summary</h4>
                            <p className="text-xs text-gray-600 mb-2">
                                {ssCutsActive ? 'Cuts Applied' : 'Baseline (No Cuts)'}
                            </p>
                            <ul className="space-y-1">
                                {ssCutsSummary.map(item => {
                                    const diff = item.delta;
                                    return (
                                        <li key={item.label} className="text-xs">
                                            <span className="font-medium">{item.label}:</span>{' '}
                                            {currencyFormatter.format(Math.round(item.baseline))} ➝{' '}
                                            {currencyFormatter.format(Math.round(item.projected))}
                                            <span className={`ml-1 font-semibold ${diff < 0 ? 'text-red-600' : 'text-green-600'}`}>
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

            {/* SS Cuts Info Modal */}
            {showSsCutInfo && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl p-6 animate-slide-in">
                        <h3 className="text-2xl font-bold text-primary-700 mb-4">About the SS Cuts Scenario</h3>
                        <div className="space-y-3 text-gray-700 leading-relaxed">
                            <p>
                                <strong>The default values (2034, 21% cut)</strong> represent the most recent consensus projection from the Social Security Board of Trustees regarding when the trust fund reserves may be depleted and the expected benefit reduction if no legislative action is taken.
                            </p>
                            <p>
                                When trust fund reserves are exhausted, incoming payroll taxes would only cover a portion of scheduled benefits, resulting in an automatic across-the-board reduction unless Congress intervenes. This tool lets you model different scenarios by adjusting the year and percentage to stress-test your claiming strategy.
                            </p>
                            <p>
                                Use this projection to explore how delaying benefits, coordinating with a spouse, or using bridge income may help offset a potential future cut. The calculation maintains your inflation assumption and applies the reduction to both monthly payments and lifetime totals from the selected year forward.
                            </p>
                        </div>
                        <div className="flex justify-end mt-6">
                            <Button onClick={() => setShowSsCutInfo(false)} variant="primary">
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShowMeTheMoneyCalculator;
