export const applyBenefitCut = ({ projection, cutYear, cutPercentage }) => {
  const reductionFactor = Math.min(1, Math.max(0, 1 - (Number(cutPercentage) || 0) / 100));
  const cutYearValue = Number(cutYear) || cutYear;
  const yearKeys = Array.from(new Set([
    ...Object.keys(projection.monthly || {}),
    ...Object.keys(projection.cumulative || {})
  ])).map(Number).sort((a, b) => a - b);

  const monthly = {};
  const cumulative = {};
  let running = 0;

  yearKeys.forEach((year) => {
    const baseMonthly = projection.monthly?.[year] || 0;
    const adjustedMonthly = year >= cutYearValue ? baseMonthly * reductionFactor : baseMonthly;
    const roundedMonthly = Number(adjustedMonthly.toFixed(2));
    monthly[year] = roundedMonthly;
    running = Number((running + roundedMonthly * 12).toFixed(2));
    cumulative[year] = running;
  });

  return { monthly, cumulative };
};

export const calculateAxisRanges = (scenarios) => {
  let minMonthly = Infinity;
  let maxMonthly = -Infinity;
  let minCumulative = Infinity;
  let maxCumulative = -Infinity;

  scenarios.forEach((scenario) => {
    [...scenario.baselineMonthly, ...scenario.cutMonthly].forEach((value) => {
      minMonthly = Math.min(minMonthly, value);
      maxMonthly = Math.max(maxMonthly, value);
    });

    [...scenario.baselineCumulative, ...scenario.cutCumulative].forEach((value) => {
      minCumulative = Math.min(minCumulative, value);
      maxCumulative = Math.max(maxCumulative, value);
    });
  });

  const monthlyPadding = (maxMonthly - minMonthly) * 0.1;
  const cumulativePadding = (maxCumulative - minCumulative) * 0.1;

  return {
    monthly: {
      min: 0,
      max: Math.ceil(maxMonthly + monthlyPadding)
    },
    cumulative: {
      min: 0,
      max: Math.ceil(maxCumulative + cumulativePadding)
    }
  };
};
