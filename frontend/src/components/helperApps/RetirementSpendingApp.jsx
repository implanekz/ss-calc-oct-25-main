import React, { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Legend,
  Tooltip,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Legend,
  Tooltip
);

const currency = (value, { zeroAsEmDash = false } = {}) => {
  if (zeroAsEmDash && Math.abs(value) < 0.5) return '—';
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
};

const round2 = (value) => Math.round(value * 100) / 100;

const DEFAULTS = {
  currentAge: 60,
  withdrawalStartAge: 62,
  endingAge: 100,
  beginningValue: 200000,
  returnRate: 0.06,
  colaRate: 0.03,
  taxRate: 0.25,
  withdrawalMode: 'amount',
  withdrawalAmount: 0,
  withdrawalPercent: 0.04,
};

const RETURN_OPTIONS = [
  0.00, 0.02, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.10, 0.11, 0.12,
];
const COLA_OPTIONS = [0.0, 0.02, 0.03, 0.035, 0.04];
const TAX_RATE_OPTIONS = [0.0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50];

const computeScenario = (inputs) => {
  const {
    currentAge,
    withdrawalStartAge,
    endingAge,
    beginningValue,
    returnRate,
    colaRate,
    taxRate,
    withdrawalMode,
    withdrawalAmount,
    withdrawalPercent,
  } = inputs;

  const rows = [];
  let balance = beginningValue;
  let amountForYear = withdrawalAmount;

  let factor = 1;
  let constant = 0;
  let maxAdditionalNeeded = 0;
  let firstRunOutAge = null;

  for (let age = currentAge; age <= endingAge; age += 1) {
    const yearIndex = age - currentAge + 1;
    const withdrawalsHaveBegun = age >= withdrawalStartAge;
    let withdrawal = 0;

    if (withdrawalsHaveBegun) {
      if (withdrawalMode === 'amount') {
        // Gross up: the user enters their spending need (net).
        // Actual withdrawal covers both spending + taxes.
        withdrawal = taxRate < 1 ? amountForYear / (1 - taxRate) : amountForYear;
      } else {
        // Percentage mode: gross up so the user's chosen % is their net rate
        withdrawal = taxRate < 1 ? (balance * withdrawalPercent) / (1 - taxRate) : balance * withdrawalPercent;
      }
    }

    const netWithdrawal = withdrawal * (1 - taxRate);
    const growth = (balance - withdrawal) * returnRate;
    const endBalance = balance - withdrawal + growth;

    let alpha;
    let beta;

    if (withdrawalsHaveBegun && withdrawalMode === 'percent') {
      const effectivePercent = taxRate < 1 ? withdrawalPercent / (1 - taxRate) : withdrawalPercent;
      alpha = (1 - effectivePercent) * (1 + returnRate);
      beta = 0;
    } else {
      alpha = 1 + returnRate;
      beta = withdrawalsHaveBegun && withdrawalMode === 'amount'
        ? -withdrawal * (1 + returnRate)
        : 0;
    }

    factor *= alpha;
    constant = constant * alpha + beta;

    if (endBalance < 0 && firstRunOutAge === null) {
      firstRunOutAge = age;
    }

    if (endBalance < 0 && factor > 0) {
      const needed = -endBalance / factor;
      if (needed > maxAdditionalNeeded) {
        maxAdditionalNeeded = needed;
      }
    }

    rows.push({
      age,
      yearIndex,
      beginningValue: balance,
      withdrawal,
      netWithdrawal,
      growth,
      endBalance,
    });

    balance = endBalance;
    if (withdrawalsHaveBegun && withdrawalMode === 'amount') {
      amountForYear *= (1 + colaRate);
    }
  }

  const additionalNeeded = Math.max(0, Math.ceil(maxAdditionalNeeded));

  return {
    rows,
    additionalNeeded,
    runOutAge: firstRunOutAge,
    endingBalance: balance,
    summary: {
      minBalance: rows.reduce((min, row) => Math.min(min, row.endBalance), Number.POSITIVE_INFINITY),
      finalBalance: balance,
    },
  };
};

const RetirementSpendingApp = () => {
  const [inputs, setInputs] = useState({
    currentAge: DEFAULTS.currentAge,
    withdrawalStartAge: DEFAULTS.withdrawalStartAge,
    endingAge: DEFAULTS.endingAge,
    beginningValue: DEFAULTS.beginningValue,
    returnRate: DEFAULTS.returnRate,
    colaRate: DEFAULTS.colaRate,
    taxRate: DEFAULTS.taxRate,
    withdrawalMode: DEFAULTS.withdrawalMode,
    withdrawalAmount: DEFAULTS.withdrawalAmount,
    withdrawalPercent: DEFAULTS.withdrawalPercent,
  });
  const [showTable, setShowTable] = useState(false);
  // Store the original spending need so Reset can restore it
  const [originalSpendingNeed, setOriginalSpendingNeed] = useState(DEFAULTS.withdrawalAmount);

  const scenario = useMemo(() => computeScenario(inputs), [inputs]);

  const handleNumberChange = (field) => (event) => {
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) return;

    setInputs((prev) => {
      const next = { ...prev, [field]: value };

      if (field === 'currentAge' && value > next.withdrawalStartAge) {
        next.withdrawalStartAge = value;
      }

      if (field === 'withdrawalStartAge') {
        if (value < next.currentAge) {
          next.currentAge = value;
        }
        if (next.endingAge <= value) {
          next.endingAge = value + 1;
        }
      }

      if (field === 'endingAge' && value <= next.withdrawalStartAge) {
        next.endingAge = next.withdrawalStartAge + 1;
      }

      return next;
    });
  };

  const handleModeChange = (event) => {
    const { value } = event.target;
    setInputs((prev) => ({
      ...prev,
      withdrawalMode: value,
    }));
  };

  // Reset to the user's original spending need
  const handleReset = () => {
    setInputs((prev) => ({ ...prev, withdrawalAmount: originalSpendingNeed }));
  };

  const ageOptions = Array.from({ length: 51 }).map((_, idx) => 50 + idx);

  const labels = scenario.rows.map((row) => row.age);
  const balances = scenario.rows.map((row) => round2(row.endBalance));

  // Computed values for display
  const grossedUpAmount = inputs.taxRate < 1
    ? inputs.withdrawalAmount / (1 - inputs.taxRate)
    : inputs.withdrawalAmount;
  const grossedUpPercent = inputs.taxRate < 1
    ? inputs.withdrawalPercent / (1 - inputs.taxRate)
    : inputs.withdrawalPercent;

  const chartData = {
    labels,
    datasets: [
      {
        type: 'line',
        label: 'Year-end Value',
        data: balances,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.15)',
        fill: true,
        pointRadius: (ctx) => {
          const value = ctx.parsed?.y;
          return value != null && value < 0 ? 0 : 2;
        },
        segment: {
          borderColor: (ctx) => (ctx.p1.parsed.y < 0 ? '#dc2626' : '#2563eb'),
          backgroundColor: (ctx) => (ctx.p1.parsed.y < 0 ? 'rgba(220, 38, 38, 0.18)' : 'rgba(37, 99, 235, 0.15)'),
        },
      },
      {
        type: 'bar',
        label: 'Annual Withdrawal',
        data: scenario.rows.map((row) => Math.max(row.withdrawal, 0)),
        backgroundColor: 'rgba(234, 179, 8, 0.45)',
        yAxisID: 'withdrawal-axis',
        barPercentage: 0.6,
        categoryPercentage: 0.8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    stacked: false,
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: { display: true, text: 'Year-end Balance ($)' },
        ticks: {
          callback: (value) => currency(value),
        },
      },
      'withdrawal-axis': {
        type: 'linear',
        display: true,
        position: 'right',
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'Annual Withdrawal ($)' },
        ticks: {
          callback: (value) => currency(value),
        },
      },
    },
    plugins: {
      legend: { position: 'bottom' },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw;
            if (context.dataset.type === 'line') {
              return `Balance: ${currency(value)}`;
            }
            return `Withdrawal: ${currency(value)}`;
          },
        },
      },
    },
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <header style={{ marginBottom: '20px' }}>
        <h1 style={{ marginBottom: '6px', color: '#0f172a' }}>Helper App: How Long Will My Money Last?</h1>
        <p style={{ margin: 0, color: '#475569' }}>
          Model a spending plan to age 100, see when balances run out, and identify how much additional savings
          would close the gap before retirement begins.
        </p>
      </header>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '18px', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)' }}>
          <h2 style={{ fontSize: '1.15rem', marginBottom: '12px', color: '#1f2937' }}>Inputs</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#1f2937' }}>
              Current Age
              <select value={inputs.currentAge} onChange={handleNumberChange('currentAge')} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5f5' }}>
                {ageOptions.map((age) => (
                  <option key={age} value={age}>{age}</option>
                ))}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#1f2937' }}>
              Age Withdrawals Begin
              <select value={inputs.withdrawalStartAge} onChange={handleNumberChange('withdrawalStartAge')} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5f5' }}>
                {ageOptions.filter((age) => age >= inputs.currentAge).map((age) => (
                  <option key={age} value={age}>{age}</option>
                ))}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#1f2937' }}>
              Beginning Balance
              <input
                type="text"
                inputMode="numeric"
                value={currency(inputs.beginningValue)}
                onChange={(event) => {
                  const raw = event.target.value.replace(/[^0-9.]/g, '');
                  const value = Number(raw);
                  if (!Number.isFinite(value)) return;
                  setInputs((prev) => ({ ...prev, beginningValue: value }));
                }}
                style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5f5' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#1f2937' }}>
              Assumed Return
              <select value={inputs.returnRate} onChange={handleNumberChange('returnRate')} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5f5' }}>
                {RETURN_OPTIONS.map((option) => (
                  <option key={option} value={option}>{(option * 100).toFixed(0)}%</option>
                ))}
              </select>
            </label>

            {/* --- Annual Withdrawal & Tax bounding box --- */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              border: '2px solid #cbd5f5',
              borderRadius: '10px',
              padding: '14px',
              background: '#fafbff',
            }}>
              <span style={{ fontWeight: 600, color: '#1f2937', fontSize: '1.02rem' }}>Annual Withdrawal &amp; Tax</span>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1f2937' }}>
                  <input
                    type="radio"
                    name="withdrawalMode"
                    value="amount"
                    checked={inputs.withdrawalMode === 'amount'}
                    onChange={handleModeChange}
                  />
                  Fixed amount
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1f2937' }}>
                  <input
                    type="radio"
                    name="withdrawalMode"
                    value="percent"
                    checked={inputs.withdrawalMode === 'percent'}
                    onChange={handleModeChange}
                  />
                  Percentage
                </label>
              </div>

              {inputs.withdrawalMode === 'amount' ? (
                <>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#1f2937' }}>
                    Spending Need First Year
                    <input
                      type="text"
                      inputMode="numeric"
                      value={currency(inputs.withdrawalAmount)}
                      onChange={(event) => {
                        const raw = event.target.value.replace(/[^0-9.]/g, '');
                        const value = Number(raw);
                        if (!Number.isFinite(value)) return;
                        setInputs((prev) => ({ ...prev, withdrawalAmount: value }));
                      }}
                      style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5f5', background: '#ffffff' }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#1f2937' }}>
                    Net withdrawal amount needed after taxes
                    <input
                      type="text"
                      readOnly
                      value={currency(grossedUpAmount)}
                      style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5f5', background: '#fef2f2', color: '#dc2626', fontWeight: 600 }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={inputs.withdrawalAmount === originalSpendingNeed}
                    style={{
                      alignSelf: 'flex-start',
                      marginTop: '2px',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: '1px solid #94a3b8',
                      background: inputs.withdrawalAmount !== originalSpendingNeed ? '#f1f5f9' : '#e2e8f0',
                      color: inputs.withdrawalAmount !== originalSpendingNeed ? '#475569' : '#94a3b8',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: inputs.withdrawalAmount !== originalSpendingNeed ? 'pointer' : 'not-allowed',
                      transition: 'background 0.2s',
                    }}
                  >
                    Reset
                  </button>
                </>
              ) : (
                <>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#1f2937' }}>
                    Spending Need (% of account)
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={(inputs.withdrawalPercent * 100).toFixed(1)}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          if (!Number.isFinite(value)) return;
                          setInputs((prev) => ({
                            ...prev,
                            withdrawalPercent: value / 100,
                          }));
                        }}
                        style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5f5', background: '#ffffff' }}
                      />
                      <span style={{ color: '#1f2937', fontWeight: 600 }}>%</span>
                    </div>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#1f2937' }}>
                    Net withdrawal rate needed after taxes
                    <input
                      type="text"
                      readOnly
                      value={`${(grossedUpPercent * 100).toFixed(1)}%`}
                      style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5f5', background: '#fef2f2', color: '#dc2626', fontWeight: 600 }}
                    />
                  </label>
                </>
              )}

              {/* Tax Rate dropdown — inside the bounding box */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#1f2937', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                Tax Rate on Withdrawal
                <select value={inputs.taxRate} onChange={handleNumberChange('taxRate')} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5f5', background: '#ffffff' }}>
                  {TAX_RATE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{(option * 100).toFixed(0)}%</option>
                  ))}
                </select>
              </label>
            </div>
            {/* --- End bounding box --- */}

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#1f2937' }}>
              Annual COLA on Withdrawal
              <select value={inputs.colaRate} onChange={handleNumberChange('colaRate')} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5f5' }}>
                {COLA_OPTIONS.map((option) => (
                  <option key={option} value={option}>{(option * 100).toFixed(1)}%</option>
                ))}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#1f2937' }}>
              Model Through Age
              <select value={inputs.endingAge} onChange={handleNumberChange('endingAge')} style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5f5' }}>
                {ageOptions.filter((age) => age > inputs.withdrawalStartAge && age <= 110).map((age) => (
                  <option key={age} value={age}>{age}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '18px', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '10px', color: '#1f2937' }}>Projection Overview</h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '8px' }}>
              <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#1f2937' }}>
                <span>Additional savings needed before withdrawals:</span>
                <strong style={{ color: scenario.additionalNeeded > 0 ? '#dc2626' : '#16a34a' }}>
                  {currency(scenario.additionalNeeded)}
                </strong>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#1f2937' }}>
                <span>Projected depletion age:</span>
                <strong>{scenario.runOutAge ? `${scenario.runOutAge}` : 'Funds remain'}</strong>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#1f2937' }}>
                <span>Ending balance at age {inputs.endingAge}:</span>
                <strong>{currency(scenario.summary.finalBalance)}</strong>
              </li>
            </ul>
          </div>

          <div style={{ background: '#ffffff', borderRadius: '12px', padding: '12px 16px', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)' }}>
            <Chart type="line" data={chartData} options={chartOptions} height={320} />
          </div>

          <button
            type="button"
            onClick={() => setShowTable((prev) => !prev)}
            style={{
              alignSelf: 'flex-start',
              padding: '8px 14px',
              borderRadius: '999px',
              border: '1px solid #1d4ed8',
              background: showTable ? '#1d4ed8' : '#ffffff',
              color: showTable ? '#ffffff' : '#1d4ed8',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 3px 12px rgba(29, 78, 216, 0.18)',
            }}
          >
            {showTable ? 'Hide Detailed Table' : 'Show Detailed Table'}
          </button>

          {showTable && (
            <div style={{ maxHeight: '420px', overflow: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead style={{ background: '#f1f5f9', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Age</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Beginning Balance</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Gross Withdrawal</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Net Withdrawal</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Growth</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Year-end Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {scenario.rows.map((row) => (
                    <tr key={row.age} style={{ background: row.endBalance < 0 ? 'rgba(248, 113, 113, 0.12)' : 'transparent' }}>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9' }}>{row.age}</td>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>{currency(row.beginningValue)}</td>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>{currency(row.withdrawal, { zeroAsEmDash: true })}</td>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>{currency(row.netWithdrawal, { zeroAsEmDash: true })}</td>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>{currency(row.growth)}</td>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: row.endBalance < 0 ? 600 : 400 }}>{currency(row.endBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default RetirementSpendingApp;
