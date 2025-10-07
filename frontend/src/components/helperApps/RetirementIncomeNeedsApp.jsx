import React, { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Legend,
  Tooltip,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Legend,
  Tooltip,
);

const currency = (value) => value.toLocaleString('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const percent = (value) => `${(value * 100).toFixed(2)}%`;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const DEFAULTS = {
  currentAge: 55,
  retirementAge: 67,
  planUntilAge: 95,
  beginningBalance: 150000,
  annualContribution: 10000,
  contributionIncrease: 0.0,
  assumedReturnAccumulation: 0.07,
  assumedReturnRetirement: 0.05,
  annualIncomeGoalToday: 50000,
  incomeInflation: 0.03,
};

const contributionIncreaseOptions = [0, 0.02, 0.03, 0.04, 0.05];

const ageOptions = Array.from({ length: 71 }, (_, idx) => 40 + idx);

const computeNestEggNeeded = ({
  annualIncomeGoalToday,
  retirementAge,
  currentAge,
  planUntilAge,
  incomeInflation,
  assumedReturnRetirement,
}) => {
  const yearsUntilRetirement = Math.max(0, retirementAge - currentAge);
  const yearsInRetirement = Math.max(1, planUntilAge - retirementAge);
  const firstYearIncome = annualIncomeGoalToday * ((1 + incomeInflation) ** yearsUntilRetirement);

  if (Math.abs(assumedReturnRetirement - incomeInflation) < 1e-6) {
    return { nestEgg: firstYearIncome * yearsInRetirement, firstYearIncome };
  }

  const growthRatio = (1 + incomeInflation) / (1 + assumedReturnRetirement);
  const nestEgg = firstYearIncome * (1 - (growthRatio ** yearsInRetirement)) / (assumedReturnRetirement - incomeInflation);
  return { nestEgg, firstYearIncome };
};

const futureValueAtRate = ({
  rate,
  yearsContributing,
  beginningBalance,
  annualContribution,
  contributionIncrease,
}) => {
  let balance = beginningBalance;
  let contribution = annualContribution;
  for (let i = 0; i < yearsContributing; i += 1) {
    balance = balance * (1 + rate) + contribution;
    contribution *= (1 + contributionIncrease);
  }
  return balance;
};

const solveRequiredRate = ({
  targetNestEgg,
  yearsContributing,
  beginningBalance,
  annualContribution,
  contributionIncrease,
}) => {
  if (targetNestEgg <= 0) {
    return 0;
  }

  const fvAtZero = futureValueAtRate({
    rate: 0,
    yearsContributing,
    beginningBalance,
    annualContribution,
    contributionIncrease,
  });
  if (fvAtZero >= targetNestEgg - 1) {
    return 0;
  }

  let low = 0;
  let high = 0.4;

  const fvAtHigh = futureValueAtRate({
    rate: high,
    yearsContributing,
    beginningBalance,
    annualContribution,
    contributionIncrease,
  });
  if (fvAtHigh < targetNestEgg) {
    return null;
  }

  for (let i = 0; i < 60; i += 1) {
    const mid = (low + high) / 2;
    const fvMid = futureValueAtRate({
      rate: mid,
      yearsContributing,
      beginningBalance,
      annualContribution,
      contributionIncrease,
    });
    if (fvMid >= targetNestEgg) {
      high = mid;
    } else {
      low = mid;
    }
    if (Math.abs(high - low) < 1e-6) break;
  }

  return high;
};

const RetirementIncomeNeedsApp = () => {
  const [inputs, setInputs] = useState({ ...DEFAULTS });

  const yearsContributing = Math.max(0, inputs.retirementAge - inputs.currentAge);

  const nestEggInfo = useMemo(() => computeNestEggNeeded({
    annualIncomeGoalToday: inputs.annualIncomeGoalToday,
    retirementAge: inputs.retirementAge,
    currentAge: inputs.currentAge,
    planUntilAge: inputs.planUntilAge,
    incomeInflation: inputs.incomeInflation,
    assumedReturnRetirement: inputs.assumedReturnRetirement,
  }), [inputs]);

  const requiredRate = useMemo(() => solveRequiredRate({
    targetNestEgg: nestEggInfo.nestEgg,
    yearsContributing,
    beginningBalance: inputs.beginningBalance,
    annualContribution: inputs.annualContribution,
    contributionIncrease: inputs.contributionIncrease,
  }), [inputs, nestEggInfo, yearsContributing]);

  const accumulationAtAssumed = useMemo(() => futureValueAtRate({
    rate: inputs.assumedReturnAccumulation,
    yearsContributing,
    beginningBalance: inputs.beginningBalance,
    annualContribution: inputs.annualContribution,
    contributionIncrease: inputs.contributionIncrease,
  }), [inputs, yearsContributing]);

  const shortfall = nestEggInfo.nestEgg - accumulationAtAssumed;

  const accumulationSeries = useMemo(() => {
    const series = [];
    let balance = inputs.beginningBalance;
    let contribution = inputs.annualContribution;
    for (let age = inputs.currentAge; age <= inputs.retirementAge; age += 1) {
      if (age > inputs.currentAge) {
        balance = balance * (1 + inputs.assumedReturnAccumulation) + contribution;
        contribution *= (1 + inputs.contributionIncrease);
      }
      series.push({ age, balance });
    }
    return series;
  }, [inputs]);

  const chartData = useMemo(() => ({
    labels: accumulationSeries.map((row) => row.age),
    datasets: [
      {
        type: 'line',
        label: 'Projected Nest Egg (assumed return)',
        data: accumulationSeries.map((row) => Math.round(row.balance)),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.15)',
        fill: true,
        tension: 0.2,
        pointRadius: 2,
      },
      {
        type: 'line',
        label: 'Nest Egg Needed',
        data: accumulationSeries.map(() => Math.round(nestEggInfo.nestEgg)),
        borderColor: '#f97316',
        borderDash: [6, 6],
        pointRadius: 0,
      },
    ],
  }), [accumulationSeries, nestEggInfo]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${currency(context.raw)}`,
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: (value) => currency(value),
        },
        title: { display: true, text: 'Balance ($)' },
      },
      x: {
        title: { display: true, text: 'Age' },
      },
    },
  };

  const handleAgeChange = (field) => (event) => {
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) return;
    setInputs((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'currentAge') {
        next.retirementAge = Math.max(next.retirementAge, value + 1);
      }
      if (field === 'retirementAge') {
        next.planUntilAge = Math.max(next.planUntilAge, value + 1);
      }
      return next;
    });
  };

  const handleCurrencyChange = (field) => (event) => {
    const raw = event.target.value.replace(/[^0-9.]/g, '');
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const handlePercentChange = (field) => (event) => {
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) return;
    setInputs((prev) => ({ ...prev, [field]: clamp(value / 100, 0, 0.99) }));
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <header style={{ marginBottom: '20px' }}>
        <h1 style={{ marginBottom: '6px', color: '#0f172a' }}>Helper App: Retirement Income Target</h1>
        <p style={{ margin: 0, color: '#475569' }}>
          Figure out the nest egg required to hit a future income goal and the compound return needed during
          the accumulation years to reach it with your current savings plan.
        </p>
      </header>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '18px', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)' }}>
          <h2 style={{ fontSize: '1.15rem', marginBottom: '12px', color: '#1f2937' }}>Inputs</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#1f2937' }}>
              Current Age
              <select value={inputs.currentAge} onChange={handleAgeChange('currentAge')} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5f5' }}>
                {ageOptions.map((age) => (
                  <option key={age} value={age}>{age}</option>
                ))}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#1f2937' }}>
              Age to start retirement income
              <select value={inputs.retirementAge} onChange={handleAgeChange('retirementAge')} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5f5' }}>
                {ageOptions.filter((age) => age > inputs.currentAge).map((age) => (
                  <option key={age} value={age}>{age}</option>
                ))}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#1f2937' }}>
              Plan income until age
              <select value={inputs.planUntilAge} onChange={handleAgeChange('planUntilAge')} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5f5' }}>
                {ageOptions.filter((age) => age > inputs.retirementAge).map((age) => (
                  <option key={age} value={age}>{age}</option>
                ))}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#1f2937' }}>
              Beginning balance
              <input
                type="text"
                inputMode="numeric"
                value={currency(inputs.beginningBalance)}
                onChange={handleCurrencyChange('beginningBalance')}
                style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5f5' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#1f2937' }}>
              Annual contribution
              <input
                type="text"
                inputMode="numeric"
                value={currency(inputs.annualContribution)}
                onChange={handleCurrencyChange('annualContribution')}
                style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5f5' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#1f2937' }}>
              Annual increase in contribution
              <select value={(inputs.contributionIncrease * 100).toFixed(0)} onChange={(event) => setInputs((prev) => ({
                ...prev,
                contributionIncrease: Number(event.target.value) / 100,
              }))}
              style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5f5' }}
              >
                {contributionIncreaseOptions.map((option) => (
                  <option key={option} value={(option * 100).toFixed(0)}>
                    {(option * 100).toFixed(0)}%
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#1f2937' }}>
              Assumed return during accumulation
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={(inputs.assumedReturnAccumulation * 100).toFixed(1)}
                  onChange={handlePercentChange('assumedReturnAccumulation')}
                  style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5f5' }}
                />
                <span style={{ color: '#1f2937', fontWeight: 600 }}>%</span>
              </div>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#1f2937' }}>
              Annual income goal (today&apos;s dollars)
              <input
                type="text"
                inputMode="numeric"
                value={currency(inputs.annualIncomeGoalToday)}
                onChange={handleCurrencyChange('annualIncomeGoalToday')}
                style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5f5' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#1f2937' }}>
              Income inflation assumption
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={(inputs.incomeInflation * 100).toFixed(1)}
                  onChange={handlePercentChange('incomeInflation')}
                  style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5f5' }}
                />
                <span style={{ color: '#1f2937', fontWeight: 600 }}>%</span>
              </div>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#1f2937' }}>
              Assumed return during retirement
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={(inputs.assumedReturnRetirement * 100).toFixed(1)}
                  onChange={handlePercentChange('assumedReturnRetirement')}
                  style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5f5' }}
                />
                <span style={{ color: '#1f2937', fontWeight: 600 }}>%</span>
              </div>
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '18px', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '10px', color: '#1f2937' }}>Retirement goal summary</h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '8px' }}>
              <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#1f2937' }}>
                <span>First-year income (inflated to age {inputs.retirementAge}):</span>
                <strong>{currency(nestEggInfo.firstYearIncome)}</strong>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#1f2937' }}>
                <span>Years of income needed:</span>
                <strong>{Math.max(1, inputs.planUntilAge - inputs.retirementAge)} years</strong>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#1f2937' }}>
                <span>Nest egg needed at retirement:</span>
                <strong>{currency(nestEggInfo.nestEgg)}</strong>
              </li>
            </ul>
          </div>

          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '18px', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '10px', color: '#1f2937' }}>Accumulation outlook</h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '8px' }}>
              <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#1f2937' }}>
                <span>Projected nest egg at {inputs.assumedReturnAccumulation * 100}%:</span>
                <strong>{currency(accumulationAtAssumed)}</strong>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#1f2937' }}>
                <span>Shortfall / surplus:</span>
                <strong style={{ color: shortfall > 0 ? '#dc2626' : '#16a34a' }}>
                  {currency(shortfall)}
                </strong>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#1f2937' }}>
                <span>Required return to hit goal:</span>
                <strong>
                  {requiredRate === null ? 'Need more savings' : percent(requiredRate)}
                </strong>
              </li>
            </ul>
          </div>

          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '12px 16px', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)' }}>
            <Chart type="line" data={chartData} options={chartOptions} height={320} />
          </div>
        </div>
      </section>
    </div>
  );
};

export default RetirementIncomeNeedsApp;
