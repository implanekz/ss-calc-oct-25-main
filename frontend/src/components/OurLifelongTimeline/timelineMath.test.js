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

    expect(bucket62.startYear).toBe(2032); // Wendy (1970) turns 62 in 2032, after Ted (2027)
    expect(bucket67.startYear).toBe(2037); // Wendy turns 67 in 2037, after Ted (2032)
    expect(bucket70.startYear).toBe(2040); // Wendy turns 70 in 2040, after Ted (2035)
  });

  test('bucket is exactly zero before the later spouse reaches that age, even though the earlier spouse already filed', () => {
    const bucket62 = getHouseholdBucket({ filingAge: 62, ...household });

    // Ted alone turned 62 in 2027 and would otherwise contribute $1,750/mo,
    // but Wendy hasn't turned 62 yet (not until 2032) -- aggregate must read zero.
    expect(bucket62.monthly[2027]).toBe(0);
    expect(bucket62.monthly[2031]).toBe(0);
    expect(bucket62.cumulative[2031]).toBe(0);
  });

  test('bucket becomes the full combined amount starting the year both have reached that age', () => {
    const bucket62 = getHouseholdBucket({ filingAge: 62, ...household });

    // Ted $2500*0.70=$1750 + Wendy $2000*0.70=$1400 = $3150/mo from 2032 on.
    expect(bucket62.monthly[2032]).toBe(3150);
    expect(bucket62.cumulative[2032]).toBe(3150 * 12);
    expect(bucket62.cumulative[2033]).toBe(3150 * 12 * 2);
  });

  test('the 67 and 70 buckets use the correct FRA and delayed-credit multipliers', () => {
    const bucket67 = getHouseholdBucket({ filingAge: 67, ...household });
    const bucket70 = getHouseholdBucket({ filingAge: 70, ...household });

    // At FRA (67): full PIA. Ted $2500 + Wendy $2000 = $4500/mo from 2037 on.
    expect(bucket67.monthly[2036]).toBe(0);
    expect(bucket67.monthly[2037]).toBe(4500);
    expect(bucket67.cumulative[2037]).toBe(4500 * 12);

    // Delayed to 70: 124% of PIA. Ted $3100 + Wendy $2480 = $5580/mo from 2040 on.
    expect(bucket70.monthly[2039]).toBe(0);
    expect(bucket70.monthly[2040]).toBe(5580);
    expect(bucket70.cumulative[2040]).toBe(5580 * 12);
  });

  test('getHouseholdBuckets returns all three ages in order', () => {
    const buckets = getHouseholdBuckets(household);
    expect(buckets.map(b => b.filingAge)).toEqual([62, 67, 70]);
    expect(buckets[2].startYear).toBe(2040);
  });
});
