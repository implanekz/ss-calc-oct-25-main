import {
  getFra,
  monthsFromFra,
  earlyReductionFactor,
  delayedRetirementCreditFactor,
  monthlyBenefitAtClaim,
  benefitAfterClaim
} from './benefitFormulas';

describe('benefitFormulas', () => {
  test('returns correct full retirement age by birth year', () => {
    expect(getFra(1937)).toEqual({ years: 65, months: 0 });
    expect(getFra(1955)).toEqual({ years: 66, months: 2 });
    expect(getFra(1959)).toEqual({ years: 66, months: 10 });
    expect(getFra(1960)).toEqual({ years: 67, months: 0 });
    expect(getFra(1970)).toEqual({ years: 67, months: 0 });
  });

  test('calculates months from full retirement age', () => {
    expect(monthsFromFra(62, 67)).toBe(-60);
    expect(monthsFromFra(67, 67)).toBe(0);
    expect(monthsFromFra(70, 67)).toBe(36);
  });

  test('applies standard early filing reduction', () => {
    expect(earlyReductionFactor(-36)).toBeCloseTo(0.8, 6);
    expect(earlyReductionFactor(-60)).toBeCloseTo(0.7, 6);
    expect(earlyReductionFactor(0)).toBeCloseTo(1, 6);
  });

  test('applies delayed retirement credits', () => {
    expect(delayedRetirementCreditFactor(0)).toBeCloseTo(1, 6);
    expect(delayedRetirementCreditFactor(36)).toBeCloseTo(1.24, 6);
  });

  test('calculates monthly benefit at claim using reduction and credits', () => {
    const early = monthlyBenefitAtClaim({
      piaFRA: 3000,
      claimAgeYears: 62,
      currentAgeYears: 62,
      rate: 0,
      fraYears: 67
    });

    const delayed = monthlyBenefitAtClaim({
      piaFRA: 3000,
      claimAgeYears: 70,
      currentAgeYears: 70,
      rate: 0,
      fraYears: 67
    });

    expect(early).toBeCloseTo(2100, 2);
    expect(delayed).toBeCloseTo(3720, 2);
  });

  test('applies post-claim COLA', () => {
    expect(benefitAfterClaim(3000, 0, 0.025)).toBeCloseTo(3000, 2);
    expect(benefitAfterClaim(3000, 2, 0.025)).toBeCloseTo(3151.875, 3);
  });
});
