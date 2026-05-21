import { ageInMonths, calculateProjection, combineProjections } from './projections';

describe('show me the money projections', () => {
  test('calculates exact age in months', () => {
    expect(ageInMonths(new Date('1965-02-03'), new Date('2027-02-02'))).toBe(743);
    expect(ageInMonths(new Date('1965-02-03'), new Date('2027-02-03'))).toBe(744);
  });

  test('calculates a filing-at-62 projection without inflation', () => {
    const projection = calculateProjection({
      pia: 3000,
      dob: '1965-02-03',
      filingYear: 62,
      filingMonth: 0,
      inflationRate: 0,
      asOfDate: new Date('2027-02-03')
    });

    expect(projection.birthYear).toBe(1965);
    expect(projection.monthly[2027]).toBeCloseTo(2100, 2);
    expect(projection.cumulative[2027]).toBeCloseTo(23100, 2);
  });

  test('combines spouse projections and preserves survivor-style max after death year', () => {
    const primaryProjection = {
      monthly: { 2030: 2000, 2031: 2100 },
      cumulative: { 2030: 24000, 2031: 49200 }
    };
    const spouseProjection = {
      monthly: { 2030: 1000, 2031: 1100 },
      cumulative: { 2030: 12000, 2031: 25200 }
    };

    const combined = combineProjections({
      primaryProjection,
      spouseProjection,
      isMarried: true,
      prematureDeath: true,
      deathYear: 2031
    });

    expect(combined.monthly[2030]).toBe(3000);
    expect(combined.monthly[2031]).toBe(2100);
    expect(combined.cumulative[2031]).toBe(61200);
  });
});
