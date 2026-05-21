import { applyBenefitCut, calculateAxisRanges } from './ssCuts';

describe('ssCuts', () => {
  test('applies cut starting in configured year', () => {
    const projection = {
      monthly: { 2033: 1000, 2034: 1000, 2035: 1000 },
      cumulative: { 2033: 12000, 2034: 24000, 2035: 36000 }
    };

    const result = applyBenefitCut({
      projection,
      cutYear: 2034,
      cutPercentage: 21
    });

    expect(result.monthly[2033]).toBe(1000);
    expect(result.monthly[2034]).toBe(790);
    expect(result.monthly[2035]).toBe(790);
    expect(result.cumulative[2035]).toBe(30960);
  });

  test('calculates stable chart axis ranges from baseline and cut values', () => {
    const ranges = calculateAxisRanges([
      {
        baselineMonthly: [0, 1000, 2000],
        cutMonthly: [0, 790, 1580],
        baselineCumulative: [0, 12000, 36000],
        cutCumulative: [0, 9480, 28440]
      }
    ]);

    expect(ranges.monthly).toEqual({ min: 0, max: 2200 });
    expect(ranges.cumulative).toEqual({ min: 0, max: 39600 });
  });
});
