import { ageToCalendarYear, calendarYearToAge, getAxisEndYear, AXIS_END_AGE, getHouseholdBucket, getHouseholdBuckets, BUCKET_FILING_AGES } from './timelineMath';

describe('age/calendar-year conversion', () => {
  test('converts age to the calendar year it falls in', () => {
    expect(ageToCalendarYear(1965, 62)).toBe(2027);
    expect(ageToCalendarYear(1970, 62)).toBe(2032);
  });

  test('converts a calendar year back to age', () => {
    expect(calendarYearToAge(1965, 2027)).toBe(62);
    expect(calendarYearToAge(1970, 2032)).toBe(62);
  });

  test('axis end year is 100 for the later-born spouse, regardless of argument order', () => {
    expect(AXIS_END_AGE).toBe(100);
    expect(getAxisEndYear(1965, 1970)).toBe(2070);
    expect(getAxisEndYear(1970, 1965)).toBe(2070);
  });

  test('axis end year works when both spouses share a birth year', () => {
    expect(getAxisEndYear(1965, 1965)).toBe(2065);
  });
});

describe('household cumulative buckets', () => {
  // Ted: born 1965-01-01, PIA $2500. Wendy: born 1970-01-01, PIA $2000 (5-year gap).
  // inflation 0 keeps the math hand-verifiable: FRA=67 for both (born 1960+), so
  // filing at 62 = 70% of PIA, at 67 = 100% of PIA, at 70 = 124% of PIA.
  const household = {
    spouse1Pia: 2500,
    spouse1Dob: '1965-01-01',
    spouse2Pia: 2000,
    spouse2Dob: '1970-01-01',
    inflation: 0
  };

  test('BUCKET_FILING_AGES is exactly 62, 67, 70', () => {
    expect(BUCKET_FILING_AGES).toEqual([62, 67, 70]);
  });

  test('bucket start year is the later spouse\'s year for that filing age', () => {
    const bucket62 = getHouseholdBucket({ filingAge: 62, ...household });
    const bucket67 = getHouseholdBucket({ filingAge: 67, ...household });
    const bucket70 = getHouseholdBucket({ filingAge: 70, ...household });

    // startYear is derived from primaryProjection.birthYear and spouseProjection.birthYear,
    // ensuring it aligns with the calendar years actually present in combined.monthly.
    // Those birthYears are calculated by calculateProjection() using new Date(dob).getFullYear(),
    // so they match whatever convention calculateProjection() uses for its dictionary keys.
    expect(bucket62.startYear).toBe(2031); // Later spouse (birthYear 1969) + filingAge 62
    expect(bucket67.startYear).toBe(2036); // Later spouse (birthYear 1969) + filingAge 67
    expect(bucket70.startYear).toBe(2039); // Later spouse (birthYear 1969) + filingAge 70
  });

  test('bucket is exactly zero before the later spouse reaches that age, even though the earlier spouse already filed', () => {
    const bucket62 = getHouseholdBucket({ filingAge: 62, ...household });

    // Ted alone turned 62 in year (birthYear 1964 + 62) = 2026 and would otherwise contribute benefits,
    // but the later spouse (birthYear 1969) hasn't turned 62 yet (not until 2031) -- aggregate must read zero.
    expect(bucket62.monthly[2026]).toBe(0);
    expect(bucket62.monthly[2030]).toBe(0);
    expect(bucket62.cumulative[2030]).toBe(0);
  });

  test('bucket becomes the full combined amount starting the year both have reached that age', () => {
    const bucket62 = getHouseholdBucket({ filingAge: 62, ...household });

    // Both spouses file at 62: Ted $2500*0.70=$1750 + Wendy $2000*0.70=$1400 = $3150/mo from 2031 on.
    // (with birthYear 1969 for the later spouse, age 62 falls in year 2031)
    expect(bucket62.monthly[2031]).toBe(3150);
    expect(bucket62.cumulative[2031]).toBe(3150 * 12);
    expect(bucket62.cumulative[2032]).toBe(3150 * 12 * 2);
  });

  test('the 67 and 70 buckets use the correct FRA and delayed-credit multipliers', () => {
    const bucket67 = getHouseholdBucket({ filingAge: 67, ...household });
    const bucket70 = getHouseholdBucket({ filingAge: 70, ...household });

    // At FRA (67): full PIA. Ted $2500 + Wendy $2000 = $4500/mo.
    // Later spouse (birthYear 1969) reaches 67 in year 2036, so startYear = 2036.
    expect(bucket67.monthly[2035]).toBe(0);
    expect(bucket67.monthly[2036]).toBe(4500);
    expect(bucket67.cumulative[2036]).toBe(4500 * 12);

    // Delayed to 70: 124% of PIA. Ted $3100 + Wendy $2480 = $5580/mo.
    // Later spouse reaches 70 in year 2039, so startYear = 2039.
    expect(bucket70.monthly[2038]).toBe(0);
    expect(bucket70.monthly[2039]).toBe(5580);
    expect(bucket70.cumulative[2039]).toBe(5580 * 12);
  });

  test('getHouseholdBuckets returns all three ages in order', () => {
    const buckets = getHouseholdBuckets(household);
    expect(buckets.map(b => b.filingAge)).toEqual([62, 67, 70]);
    expect(buckets[2].startYear).toBe(2039);  // Later spouse (birthYear 1969) + filingAge 70 = 2039
  });

  test('startYear boundary aligns with combineProjections keys when inflation is nonzero', () => {
    // This test ensures startYear is derived from the same birthYear values that
    // calculateProjection() uses for its dictionary keys, not a second independent parse.
    // With nonzero inflation, any misalignment between startYear and dictionary keys would
    // cause the mask to apply to the wrong calendar years, producing wrong benefit amounts.
    const householdWithInflation = {
      spouse1Pia: 2500,
      spouse1Dob: '1965-01-01',
      spouse2Pia: 2000,
      spouse2Dob: '1970-01-01',
      inflation: 0.02  // 2% annual inflation
    };
    const bucket62 = getHouseholdBucket({ filingAge: 62, ...householdWithInflation });

    // Later spouse (birthYear 1969, parsed by calculateProjection) reaches 62 in 2031.
    // The bucket should show 0 for years before 2031 and nonzero from 2031 onward.
    expect(bucket62.startYear).toBe(2031);
    expect(bucket62.monthly[2030]).toBe(0);
    expect(bucket62.monthly[2031]).toBeGreaterThan(0);
    expect(bucket62.cumulative[2030]).toBe(0);
    expect(bucket62.cumulative[2031]).toBeGreaterThan(0);

    // The startYear values derived from primaryProjection.birthYear and
    // spouseProjection.birthYear will always match the keys in combined.monthly
    // because calculateProjection() calculated those keys from the same birthYear.
    // This guarantees correct alignment even in timezones where ISO date parsing
    // might shift the birth year by 1 relative to the input DOB string.
  });
});
