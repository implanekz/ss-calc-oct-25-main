import React, { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

const ShowMeTheMoneyCalculator = () => {
    const [isMarried, setIsMarried] = useState(false);
    const [spouse1Dob, setSpouse1Dob] = useState('1965-02-03');
    const [spouse1Pia, setSpouse1Pia] = useState(4000);
    const [spouse1PreferredYear, setSpouse1PreferredYear] = useState(67);
    const [spouse1PreferredMonth, setSpouse1PreferredMonth] = useState(0);
    const [spouse2Dob, setSpouse2Dob] = useState('1965-06-18');
    const [spouse2Pia, setSpouse2Pia] = useState(1500);
    const [spouse2PreferredYear, setSpouse2PreferredYear] = useState(65);
    const [spouse2PreferredMonth, setSpouse2PreferredMonth] = useState(0);
    const [inflation, setInflation] = useState(0.03);
    const [chartView, setChartView] = useState('monthly'); // monthly, cumulative, combined
    const [chartData, setChartData] = useState({ labels: [], datasets: [] });
    const [chartOptions, setChartOptions] = useState({});
    const [prematureDeath, setPrematureDeath] = useState(false);
    const [deathYear, setDeathYear] = useState(new Date().getFullYear() + 1);

    const FRA = 67;

    const calculateProjections = (pia, dob, filingYear, filingMonth, inflationRate) => {
        const birthYear = new Date(dob).getFullYear();
        const filingAgeTotalMonths = filingYear * 12 + filingMonth;
        const fraTotalMonths = FRA * 12;
        const yearAge62 = birthYear + 62;

        const monthlyProjection = {};
        const cumulativeProjection = {};
        let cumulative = 0;

        for (let year = yearAge62; year <= birthYear + 95; year++) {
            const age = year - birthYear;
            const claimingYear = birthYear + filingYear;
            let monthlyBenefit = 0;

            if (age >= filingYear) {
                const inflationYears = Math.max(0, year - claimingYear);
                const inflatedPia = pia * Math.pow(1 + inflationRate, inflationYears);
                let baseBenefit = inflatedPia;

                if (filingAgeTotalMonths < fraTotalMonths) {
                    const monthsEarly = fraTotalMonths - filingAgeTotalMonths;
                    baseBenefit *= 1 - (Math.min(monthsEarly, 36) * 5/9/100 + Math.max(0, monthsEarly - 36) * 5/12/100);
                } else if (filingAgeTotalMonths > fraTotalMonths) {
                    const monthsLate = filingAgeTotalMonths - fraTotalMonths;
                    baseBenefit *= 1 + (monthsLate * 2/3/100);
                }
                monthlyBenefit = baseBenefit * Math.pow(1 + inflationRate, year - claimingYear);
            }
            
            monthlyProjection[year] = monthlyBenefit;
            cumulative += monthlyBenefit * 12;
            cumulativeProjection[year] = cumulative;
        }

        return { monthly: monthlyProjection, cumulative: cumulativeProjection };
    };


    useEffect(() => {
        const s1_age62_proj = calculateProjections(spouse1Pia, spouse1Dob, 62, 0, inflation);
        const s1_preferred_proj = calculateProjections(spouse1Pia, spouse1Dob, spouse1PreferredYear, spouse1PreferredMonth, inflation);
        const s1_age70_proj = calculateProjections(spouse1Pia, spouse1Dob, 70, 0, inflation);

        let totalProjections = { age62: s1_age62_proj, preferred: s1_preferred_proj, age70: s1_age70_proj };

        if (isMarried) {
            const s2_age62_proj = calculateProjections(spouse2Pia, spouse2Dob, 62, 0, inflation);
            const s2_preferred_proj = calculateProjections(spouse2Pia, spouse2Dob, spouse2PreferredYear, spouse2PreferredMonth, inflation);
            const s2_age70_proj = calculateProjections(spouse2Pia, spouse2Dob, 70, 0, inflation);

            const allYears = Array.from(new Set([...Object.keys(s1_age62_proj.monthly), ...Object.keys(s2_age62_proj.monthly)])).sort();

            const combined = (s1_proj, s2_proj) => {
                const combinedMonthly = {};
                allYears.forEach(year => {
                    const yearNum = parseInt(year, 10);
                    const s1_benefit = s1_proj.monthly[yearNum] || 0;
                    const s2_benefit = s2_proj.monthly[yearNum] || 0;
                    if (prematureDeath && yearNum >= deathYear) {
                        combinedMonthly[yearNum] = Math.max(s1_benefit, s2_benefit);
                    } else {
                        combinedMonthly[yearNum] = s1_benefit + s2_benefit;
                    }
                });

                let cumulative = 0;
                const cumulativeProj = {};
                allYears.forEach(year => {
                    const yearNum = parseInt(year, 10);
                    cumulative += (combinedMonthly[yearNum] || 0) * 12;
                    cumulativeProj[yearNum] = cumulative;
                });

                return { monthly: combinedMonthly, cumulative: cumulativeProj };
            };

            totalProjections.age62 = combined(s1_age62_proj, s2_age62_proj);
            totalProjections.preferred = combined(s1_preferred_proj, s2_preferred_proj);
            totalProjections.age70 = combined(s1_age70_proj, s2_age70_proj);
        }

        const getSpouse1Age = (year) => year - new Date(spouse1Dob).getFullYear();

        const displayAges = [62, 67, 70, 75, 80, 85, 90, 95];
        const fullAgeRange = Array.from({ length: 95 - 62 + 1}, (_, i) => new Date(spouse1Dob).getFullYear() + 62 + i);
        
        const labels = fullAgeRange.map(year => {
            const age1 = getSpouse1Age(year);
            const age2 = isMarried ? year - new Date(spouse2Dob).getFullYear() : '';
            return `Ages ${age1}${isMarried ? `/${age2}` : ''}`;
        });

        let newChartData;
        let newChartOptions;

        if (chartView === 'monthly') {
            const filteredMonthlyYears = fullAgeRange.filter(year => displayAges.includes(getSpouse1Age(year)));
            const filteredMonthlyLabels = filteredMonthlyYears.map(year => {
                const age1 = getSpouse1Age(year);
                const age2 = isMarried ? year - new Date(spouse2Dob).getFullYear() : '';
                return `Ages ${age1}${isMarried ? `/${age2}` : ''}`;
            });

            newChartData = {
                labels: filteredMonthlyLabels,
                datasets: [
                    { label: 'File at 62', data: filteredMonthlyYears.map(year => totalProjections.age62.monthly[year]), backgroundColor: 'red' },
                    { label: 'Preferred Age', data: filteredMonthlyYears.map(year => totalProjections.preferred.monthly[year]), backgroundColor: 'blue' },
                    { label: 'File at 70', data: filteredMonthlyYears.map(year => totalProjections.age70.monthly[year]), backgroundColor: 'green' },
                ]
            };
            newChartOptions = { plugins: { title: { display: true, text: 'Monthly View' } }, scales: { x: { title: { text: 'Year' } }, y: { title: { text: 'Monthly Benefit' } } } };
        } else if (chartView === 'cumulative') {
            newChartData = {
                labels,
                datasets: [
                    { label: 'File at 62', data: fullAgeRange.map(year => totalProjections.age62.cumulative[year]), borderColor: 'red', fill: false },
                    { label: 'Preferred Age', data: fullAgeRange.map(year => totalProjections.preferred.cumulative[year]), borderColor: 'blue', fill: false },
                    { label: 'File at 70', data: fullAgeRange.map(year => totalProjections.age70.cumulative[year]), borderColor: 'green', fill: false },
                ]
            };
            newChartOptions = { plugins: { title: { display: true, text: 'Cumulative View' } }, scales: { x: { title: { text: 'Year' } }, y: { title: { text: 'Cumulative Benefits' } } } };
        } else { // combined
            newChartData = {
                labels,
                datasets: [
                    { type: 'bar', label: 'Monthly File at 62', data: fullAgeRange.map(year => displayAges.includes(getSpouse1Age(year)) ? totalProjections.age62.monthly[year] : 0), backgroundColor: 'red', yAxisID: 'y_monthly', barPercentage: 0.8, categoryPercentage: 0.9 },
                    { type: 'bar', label: 'Monthly Preferred Age', data: fullAgeRange.map(year => displayAges.includes(getSpouse1Age(year)) ? totalProjections.preferred.monthly[year] : 0), backgroundColor: 'blue', yAxisID: 'y_monthly', barPercentage: 0.8, categoryPercentage: 0.9 },
                    { type: 'bar', label: 'Monthly File at 70', data: fullAgeRange.map(year => displayAges.includes(getSpouse1Age(year)) ? totalProjections.age70.monthly[year] : 0), backgroundColor: 'green', yAxisID: 'y_monthly', barPercentage: 0.8, categoryPercentage: 0.9 },
                    { type: 'line', label: 'Cumulative File at 62', data: fullAgeRange.map(year => totalProjections.age62.cumulative[year]), borderColor: 'red', yAxisID: 'y_cumulative', fill: false },
                    { type: 'line', label: 'Cumulative Preferred Age', data: fullAgeRange.map(year => totalProjections.preferred.cumulative[year]), borderColor: 'blue', yAxisID: 'y_cumulative', fill: false },
                    { type: 'line', label: 'Cumulative File at 70', data: fullAgeRange.map(year => totalProjections.age70.cumulative[year]), borderColor: 'green', yAxisID: 'y_cumulative', fill: false },
                ]
            };
            newChartOptions = { 
                plugins: { title: { display: true, text: 'Combined View' } },
                scales: { 
                    x: { title: { text: 'Year' } }, 
                    y_monthly: { type: 'linear', display: true, position: 'left', title: { text: 'Monthly Benefit', display: true } },
                    y_cumulative: { type: 'linear', display: true, position: 'right', title: { text: 'Cumulative Benefits', display: true }, grid: { drawOnChartArea: false } }
                }
            };
        }

        setChartData(newChartData);
        setChartOptions(newChartOptions);

    }, [isMarried, spouse1Dob, spouse1Pia, spouse1PreferredYear, spouse1PreferredMonth, spouse2Dob, spouse2Pia, spouse2PreferredYear, spouse2PreferredMonth, inflation, chartView, prematureDeath, deathYear]);

    return (
        <div style={{ fontFamily: 'sans-serif', padding: '20px', maxWidth: '1200px', margin: 'auto' }}>
            <header style={{ backgroundColor: '#003366', color: 'white', padding: '10px', textAlign: 'center' }}>
                <h2>Social Security "Show Me the Money" Calculator</h2>
            </header>
            <div style={{ padding: '20px', backgroundColor: '#f0f4f8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px' }}>
                    <div>
                        <h3>Spouse 1</h3>
                        <label>Date of Birth: <input type="date" value={spouse1Dob} onChange={e => setSpouse1Dob(e.target.value)} /></label><br />
                        <label>Benefit (PIA) at FRA: <input type="number" value={spouse1Pia} onChange={e => setSpouse1Pia(Number(e.target.value))} /></label><br />
                        <div style={{ border: '1px solid blue', padding: '10px', marginTop: '10px' }}>
                            <label>Spouse 1 Preferred Filing Age</label><br />
                            Preferred: <input type="number" value={spouse1PreferredYear} onChange={e => setSpouse1PreferredYear(Number(e.target.value))} /> Year <input type="number" value={spouse1PreferredMonth} onChange={e => setSpouse1PreferredMonth(Number(e.target.value))} /> Month
                        </div>
                    </div>
                    {isMarried && <div>
                        <h3>Spouse 2</h3>
                        <label>Date of Birth: <input type="date" value={spouse2Dob} onChange={e => setSpouse2Dob(e.target.value)} /></label><br />
                        <label>Benefit (PIA) at FRA: <input type="number" value={spouse2Pia} onChange={e => setSpouse2Pia(Number(e.target.value))} /></label><br />
                        <div style={{ border: '1px solid blue', padding: '10px', marginTop: '10px' }}>
                            <label>Spouse 2 Preferred Filing Age</label><br />
                            Preferred: <input type="number" value={spouse2PreferredYear} onChange={e => setSpouse2PreferredYear(Number(e.target.value))} /> Year <input type="number" value={spouse2PreferredMonth} onChange={e => setSpouse2PreferredMonth(Number(e.target.value))} /> Month
                        </div>
                    </div>}
                </div>
                <label><input type="checkbox" checked={isMarried} onChange={(e) => setIsMarried(e.target.checked)} /> Married/Domestic Partner</label><br/>
                {isMarried && <label><input type="checkbox" checked={prematureDeath} onChange={e => setPrematureDeath(e.target.checked)} /> Potential Premature Death of Either Spouse?</label>}
                
                <div style={{marginTop: '20px'}}>
                    <label>Expected Inflation: <input type="range" min="0" max="0.1" step="0.001" value={inflation} onChange={e => setInflation(Number(e.target.value))} /></label>
                    <p>Current Annual Inflation: {(inflation * 100).toFixed(1)}%</p>
                </div>

                <div style={{ marginTop: '40px', textAlign: 'center' }}>
                    <button onClick={() => setChartView('monthly')}>Monthly Benefit</button>
                    <button onClick={() => setChartView('cumulative')}>Cumulative Benefit</button>
                    <button onClick={() => setChartView('combined')}>Combined</button>
                </div>

                <div style={{ height: '500px', marginTop: '20px' }}>
                    {chartView === 'monthly' ? <Bar data={chartData} options={chartOptions} /> :
                     chartView === 'cumulative' ? <Line data={chartData} options={chartOptions} /> :
                     <Bar data={chartData} options={chartOptions} />}
                </div>
            </div>
        </div>
    );
};

export default ShowMeTheMoneyCalculator;
