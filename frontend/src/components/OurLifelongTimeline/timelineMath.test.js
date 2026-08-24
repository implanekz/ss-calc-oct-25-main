import { ageToCalendarYear, calendarYearToAge, getAxisEndYear, AXIS_END_AGE, getHouseholdBucket, getHouseholdBuckets, BUCKET_FILING_AGES, formatCurrency, formatBucketValue, getAnnualIncome, getMilestonesForPerson, isTimelineReachable, buildNarrative } from './timelineMath';
import { calculateProjection, combineProjections } from '../../calculators/showMeTheMoney/projections';

describe('age/calendar-year conversion', () => {
  test('converts age to the calendar year it falls in', () => {
    expect(ageToCalendarYear(1965, 62)).toBe(2027);
    expect(ageToCalendarYear(1970, 62)).toBe(2032);
  });

  test('converts a calendar year back to age', () => {
    expect(calendarYearToAge(1965, 2027)).toBe(62);
    expect(calendarYearToAge(1970, 2032)).toBe(62);
  });

  test('axis end year is 95 for the later-born spouse, regardless of argument order', () => {
    expect(AXIS_END_AGE).toBe(95);
    expect(getAxisEndYear(1965, 1970)).toBe(2065);
    expect(getAxisEndYear(1970, 1965)).toBe(2065);
  });

  test('axis end year works when both spouses share a birth year', () => {
    expect(getAxisEndYear(1965, 1965)).toBe(2060);
  });

  test('axis end year never exceeds the last year calculateProjection() actually has data for', () => {
    // Regression test for a real bug: AXIS_END_AGE used to be 100, but calculateProjection()'s
    // .monthly/.cumulative dictionaries only have keys through birthYear + 95 (see projections.js).
    // If the axis ever extends past that, the timeline silently renders the missing years as $0
    // instead of showing that there's no data there.
    const birthYearPrimary = 1965;
    const birthYearSpouse = 1970;

    const projection = calculateProjection({
      pia: 2000,
      dob: '1970-06-15',
      filingYear: 62,
      filingMonth: 0,
      inflationRate: 0
    });
    const lastYearWithData = Math.max(...Object.keys(projection.monthly).map(Number));

    expect(getAxisEndYear(birthYearPrimary, birthYearSpouse)).toBe(lastYearWithData);
    expect(getAxisEndYear(birthYearPrimary, birthYearSpouse)).toBeLessThanOrEqual(
      Math.max(birthYearPrimary, birthYearSpouse) + 95
    );
  });
});

describe('household cumulative buckets', () => {
  // Ted: born 1965-06-15, PIA $2500. Wendy: born 1970-06-15, PIA $2000 (5-year gap).
  // Using mid-year dates (June 15) to avoid timezone-dependent year shifts on date-only ISO strings.
  // inflation 0 keeps the math hand-verifiable: FRA=67 for both (born 1960+), so
  // filing at 62 = 70% of PIA, at 67 = 100% of PIA, at 70 = 124% of PIA.
  const household = {
    spouse1Pia: 2500,
    spouse1Dob: '1965-06-15',
    spouse2Pia: 2000,
    spouse2Dob: '1970-06-15',
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
    // With mid-year DOBs (June 15), birthYear calculations are TZ-safe across all timezones.
    expect(bucket62.startYear).toBe(2032); // Later spouse (birthYear 1970) + filingAge 62
    expect(bucket67.startYear).toBe(2037); // Later spouse (birthYear 1970) + filingAge 67
    expect(bucket70.startYear).toBe(2040); // Later spouse (birthYear 1970) + filingAge 70
  });

  test('bucket is exactly zero before the later spouse reaches that age, even though the earlier spouse already filed', () => {
    const bucket62 = getHouseholdBucket({ filingAge: 62, ...household });

    // Ted alone turned 62 in year (birthYear 1965 + 62) = 2027 and would otherwise contribute benefits,
    // but the later spouse (birthYear 1970) hasn't turned 62 yet (not until 2032) -- aggregate must read zero.
    expect(bucket62.monthly[2027]).toBe(0);
    expect(bucket62.monthly[2031]).toBe(0);
    expect(bucket62.cumulative[2031]).toBe(0);
  });

  test('bucket becomes the full combined amount starting the year both have reached that age', () => {
    const bucket62 = getHouseholdBucket({ filingAge: 62, ...household });

    // Both spouses file at 62: Ted $2500*0.70=$1750 + Wendy $2000*0.70=$1400 = $3150/mo from 2032 on.
    // (with birthYear 1970 for the later spouse, age 62 falls in year 2032)
    expect(bucket62.monthly[2032]).toBe(3150);
    expect(bucket62.cumulative[2032]).toBe(3150 * 12);
    expect(bucket62.cumulative[2033]).toBe(3150 * 12 * 2);
  });

  test('the 67 and 70 buckets use the correct FRA and delayed-credit multipliers', () => {
    const bucket67 = getHouseholdBucket({ filingAge: 67, ...household });
    const bucket70 = getHouseholdBucket({ filingAge: 70, ...household });

    // At FRA (67): full PIA. Ted $2500 + Wendy $2000 = $4500/mo.
    // Later spouse (birthYear 1970) reaches 67 in year 2037, so startYear = 2037.
    expect(bucket67.monthly[2036]).toBe(0);
    expect(bucket67.monthly[2037]).toBe(4500);
    expect(bucket67.cumulative[2037]).toBe(4500 * 12);

    // Delayed to 70: 124% of PIA. Ted $3100 + Wendy $2480 = $5580/mo.
    // Later spouse reaches 70 in year 2040, so startYear = 2040.
    expect(bucket70.monthly[2039]).toBe(0);
    expect(bucket70.monthly[2040]).toBe(5580);
    expect(bucket70.cumulative[2040]).toBe(5580 * 12);
  });

  test('getHouseholdBuckets returns all three ages in order', () => {
    const buckets = getHouseholdBuckets(household);
    expect(buckets.map(b => b.filingAge)).toEqual([62, 67, 70]);
    expect(buckets[2].startYear).toBe(2040);  // Later spouse (birthYear 1970) + filingAge 70 = 2040
  });

  test('startYear boundary aligns with combineProjections keys when inflation is nonzero', () => {
    // This test ensures startYear is derived from the same birthYear values that
    // calculateProjection() uses for its dictionary keys, not a second independent parse.
    // With nonzero inflation, any misalignment between startYear and dictionary keys would
    // cause the mask to apply to the wrong calendar years, producing wrong benefit amounts.
    const householdWithInflation = {
      spouse1Pia: 2500,
      spouse1Dob: '1965-06-15',
      spouse2Pia: 2000,
      spouse2Dob: '1970-06-15',
      inflation: 0.02  // 2% annual inflation
    };
    const bucket62 = getHouseholdBucket({ filingAge: 62, ...householdWithInflation });

    // Later spouse (birthYear 1970, parsed by calculateProjection) reaches 62 in 2032.
    // The bucket should show 0 for years before 2032 and nonzero from 2032 onward.
    // With mid-year DOBs, calculations are TZ-safe.
    expect(bucket62.startYear).toBe(2032);
    expect(bucket62.monthly[2031]).toBe(0);
    expect(bucket62.monthly[2032]).toBeGreaterThan(0);
    expect(bucket62.cumulative[2031]).toBe(0);
    expect(bucket62.cumulative[2032]).toBeGreaterThan(0);

    // The startYear values derived from primaryProjection.birthYear and
    // spouseProjection.birthYear will always match the keys in combined.monthly
    // because calculateProjection() calculated those keys from the same birthYear.
    // This guarantees correct alignment even in timezones where ISO date parsing
    // might shift the birth year by 1 relative to the input DOB string.
  });
});

describe('premature-death threading into household buckets', () => {
  // Same Ted/Wendy fixture as above: Ted born 1965-06-15 PIA $2500, Wendy born 1970-06-15 PIA $2000.
  const household = {
    spouse1Pia: 2500,
    spouse1Dob: '1965-06-15',
    spouse2Pia: 2000,
    spouse2Dob: '1970-06-15',
    inflation: 0
  };

  test('getHouseholdBucket applies combineProjections\' survivor-max behavior after deathYear, not a plain sum', () => {
    const filingAge = 67;
    // Between bucket67's startYear (2037) and bucket70's startYear (2040).
    const deathYear = 2038;

    const primaryProjection = calculateProjection({
      pia: household.spouse1Pia,
      dob: household.spouse1Dob,
      filingYear: filingAge,
      filingMonth: 0,
      inflationRate: household.inflation
    });
    const spouseProjection = calculateProjection({
      pia: household.spouse2Pia,
      dob: household.spouse2Dob,
      filingYear: filingAge,
      filingMonth: 0,
      inflationRate: household.inflation
    });
    const expectedCombined = combineProjections({
      primaryProjection,
      spouseProjection,
      isMarried: true,
      prematureDeath: true,
      deathYear
    });

    const bucket = getHouseholdBucket({ filingAge, ...household, prematureDeath: true, deathYear });

    // Before the death year: still the full combined (sum) amount -- Ted $2500 + Wendy $2000 = $4500/mo.
    expect(bucket.monthly[2037]).toBe(expectedCombined.monthly[2037]);
    expect(bucket.monthly[2037]).toBe(4500);

    // From the death year on: survivor-max, not sum -- max(Ted $2500, Wendy $2000) = $2500/mo.
    // Before this fix, getHouseholdBucket ignored prematureDeath/deathYear entirely and this
    // would have stayed $4500, contradicting the survivor-adjusted "Monthly Income" line above it.
    expect(bucket.monthly[2038]).toBe(expectedCombined.monthly[2038]);
    expect(bucket.monthly[2038]).toBe(2500);
  });

  test('getHouseholdBuckets threads prematureDeath/deathYear through to every bucket', () => {
    const deathYear = 2038;
    const buckets = getHouseholdBuckets({ ...household, prematureDeath: true, deathYear });
    const bucket67 = buckets.find((b) => b.filingAge === 67);

    expect(bucket67.monthly[2038]).toBe(2500);
  });

  test('getHouseholdBucket defaults to no premature-death adjustment when omitted', () => {
    const bucket67 = getHouseholdBucket({ filingAge: 67, ...household });
    expect(bucket67.monthly[2038]).toBe(4500);
  });
});

describe('display formatting', () => {
  test('formatCurrency renders whole-dollar USD', () => {
    expect(formatCurrency(66960)).toBe('$66,960');
    expect(formatCurrency(0)).toBe('$0');
  });

  test('getAnnualIncome is monthly times 12', () => {
    expect(getAnnualIncome(3087)).toBe(37044);
  });

  test('formatBucketValue shows a muted "starts <year>" before the bucket starts', () => {
    const bucket = { startYear: 2040, cumulative: { 2039: 0, 2040: 66960 } };
    expect(formatBucketValue(bucket, 2035)).toEqual({ display: 'starts 2040', muted: true });
    expect(formatBucketValue(bucket, 2039)).toEqual({ display: 'starts 2040', muted: true });
  });

  test('formatBucketValue shows the formatted cumulative amount once the bucket has started', () => {
    const bucket = { startYear: 2040, cumulative: { 2040: 66960, 2041: 133920 } };
    expect(formatBucketValue(bucket, 2040)).toEqual({ display: '$66,960', muted: false });
    expect(formatBucketValue(bucket, 2041)).toEqual({ display: '$133,920', muted: false });
  });
});

describe('life-stage milestones', () => {
  test('derives 62/FRA/70 milestones plus a distinct chosen-filing-age milestone', () => {
    const milestones = getMilestonesForPerson({ label: 'Ted', dob: '1965-06-15', preferredYear: 64 });

    expect(milestones).toEqual([
      { year: 2027, label: 'Ted turns 62', kind: 'age62' },
      { year: 2029, label: "Ted's chosen filing age", kind: 'chosenFilingAge' },
      { year: 2032, label: 'Ted reaches full retirement age', kind: 'fra' },
      { year: 2035, label: 'Ted turns 70', kind: 'age70' }
    ]);
  });

  test('does not duplicate a milestone when the chosen filing age matches an existing one', () => {
    const milestones = getMilestonesForPerson({ label: 'Ted', dob: '1965-06-15', preferredYear: 67 });

    // 67 is Ted's FRA (born 1965) -- chosenFilingAge must not appear as a second 2032 entry.
    expect(milestones).toHaveLength(3);
    expect(milestones.map(m => m.kind)).toEqual(['age62', 'fra', 'age70']);
  });

  test('skips the chosen-filing-age milestone when preferredYear is a cleared input ("")', () => {
    // Number('') === 0, so without a guard this would place a stray milestone at Ted's birth year.
    const milestones = getMilestonesForPerson({ label: 'Ted', dob: '1965-06-15', preferredYear: '' });

    expect(milestones).toHaveLength(3);
    expect(milestones.map(m => m.kind)).toEqual(['age62', 'fra', 'age70']);
  });

  test('skips the chosen-filing-age milestone when preferredYear is below the minimum filing age', () => {
    const milestones = getMilestonesForPerson({ label: 'Ted', dob: '1965-06-15', preferredYear: 40 });

    expect(milestones).toHaveLength(3);
    expect(milestones.map(m => m.kind)).toEqual(['age62', 'fra', 'age70']);
  });

  test('skips the chosen-filing-age milestone when preferredYear is non-numeric', () => {
    const milestones = getMilestonesForPerson({ label: 'Ted', dob: '1965-06-15', preferredYear: 'abc' });

    expect(milestones).toHaveLength(3);
    expect(milestones.map(m => m.kind)).toEqual(['age62', 'fra', 'age70']);
  });
});

describe('couples-only reachability', () => {
  test('reachable only when married with both DOBs present', () => {
    expect(isTimelineReachable({ isMarried: true, spouse1Dob: '1965-01-01', spouse2Dob: '1970-01-01' })).toBe(true);
    expect(isTimelineReachable({ isMarried: false, spouse1Dob: '1965-01-01', spouse2Dob: '1970-01-01' })).toBe(false);
    expect(isTimelineReachable({ isMarried: true, spouse1Dob: '1965-01-01', spouse2Dob: null })).toBe(false);
    expect(isTimelineReachable({ isMarried: true, spouse1Dob: '', spouse2Dob: '1970-01-01' })).toBe(false);
  });
});

describe('buildNarrative', () => {
  // Demo: milestones land at 2027 (age62), 2031 (chosenFilingAge), 2032 (fra), 2035 (age70).
  // Spouse: milestones land at 2028 (age62), 2032 (fra -- same year as Demo's FRA, to test the
  // both-people-same-year case), 2036 (age70).
  const primaryMilestones = [
    { year: 2027, label: 'Demo turns 62', kind: 'age62' },
    { year: 2031, label: "Demo's chosen filing age", kind: 'chosenFilingAge' },
    { year: 2032, label: 'Demo reaches full retirement age', kind: 'fra' },
    { year: 2035, label: 'Demo turns 70', kind: 'age70' }
  ];
  const spouseMilestones = [
    { year: 2028, label: 'Spouse turns 62', kind: 'age62' },
    { year: 2032, label: 'Spouse reaches full retirement age', kind: 'fra' },
    { year: 2036, label: 'Spouse turns 70', kind: 'age70' }
  ];

  const baseArgs = {
    primaryLabel: 'Demo',
    spouseLabel: 'Spouse',
    primaryMilestones,
    spouseMilestones,
    monthlyIncome: 3140,
    prematureDeath: false,
    deathYear: undefined
  };

  test('feel line always states both ages for the cursor year', () => {
    const narrative = buildNarrative({ ...baseArgs, year: 2030, primaryAge: 65, spouseAge: 60 });
    expect(narrative.feel).toBe('2030: Demo is 65, Spouse is 60.');
  });

  test('think line formats the dramatic income reveal', () => {
    const narrative = buildNarrative({ ...baseArgs, year: 2030, primaryAge: 65, spouseAge: 60 });
    expect(narrative.think).toBe('$3,140/month · $37,680/year');
  });

  test('no milestone on the cursor year -> empty milestoneNotes and no doLine', () => {
    const narrative = buildNarrative({ ...baseArgs, year: 2030, primaryAge: 65, spouseAge: 60 });
    expect(narrative.milestoneNotes).toEqual([]);
    expect(narrative.doLine).toBeUndefined();
  });

  test('age62 milestone -> milestoneNotes and the age62 doLine', () => {
    const narrative = buildNarrative({ ...baseArgs, year: 2027, primaryAge: 62, spouseAge: 57 });
    expect(narrative.milestoneNotes).toEqual(['Demo turns 62']);
    expect(narrative.doLine).toBe('This is the earliest possible filing age — the smallest benefit this household could lock in.');
  });

  test('chosenFilingAge milestone -> the chosenFilingAge doLine', () => {
    const narrative = buildNarrative({ ...baseArgs, year: 2031, primaryAge: 66, spouseAge: 61 });
    expect(narrative.milestoneNotes).toEqual(["Demo's chosen filing age"]);
    expect(narrative.doLine).toBe("This is the age you've chosen to file.");
  });

  test('age70 milestone -> the age70 doLine', () => {
    const narrative = buildNarrative({ ...baseArgs, year: 2035, primaryAge: 70, spouseAge: 65 });
    expect(narrative.milestoneNotes).toEqual(['Demo turns 70']);
    expect(narrative.doLine).toBe("This is the last year waiting still grows the benefit — filing later than this doesn't add more.");
  });

  test('both people reaching FRA the same year -> both notes, doLine from the first (primary) entry', () => {
    const narrative = buildNarrative({ ...baseArgs, year: 2032, primaryAge: 67, spouseAge: 62 });
    expect(narrative.milestoneNotes).toEqual([
      'Demo reaches full retirement age',
      'Spouse reaches full retirement age'
    ]);
    expect(narrative.doLine).toBe('Filing here locks in your full, unreduced benefit — no early-claim penalty, no delayed-credit bonus.');
  });

  test('premature death on, cursor year before deathYear -> no survivorNote', () => {
    const narrative = buildNarrative({
      ...baseArgs,
      year: 2039,
      primaryAge: 74,
      spouseAge: 69,
      prematureDeath: true,
      deathYear: 2040
    });
    expect(narrative.survivorNote).toBeUndefined();
  });

  test('premature death on, cursor year at deathYear -> survivorNote present', () => {
    const narrative = buildNarrative({
      ...baseArgs,
      year: 2040,
      primaryAge: 75,
      spouseAge: 70,
      prematureDeath: true,
      deathYear: 2040
    });
    expect(narrative.survivorNote).toBe('This reflects survivor benefits — the household now receives the larger of the two benefits.');
  });

  test('premature death on, cursor year after deathYear -> survivorNote present', () => {
    const narrative = buildNarrative({
      ...baseArgs,
      year: 2045,
      primaryAge: 80,
      spouseAge: 75,
      prematureDeath: true,
      deathYear: 2040
    });
    expect(narrative.survivorNote).toBe('This reflects survivor benefits — the household now receives the larger of the two benefits.');
  });

  test('premature death off -> survivorNote always absent regardless of year', () => {
    const narrative = buildNarrative({
      ...baseArgs,
      year: 2050,
      primaryAge: 85,
      spouseAge: 80,
      prematureDeath: false,
      deathYear: 2040
    });
    expect(narrative.survivorNote).toBeUndefined();
  });
});
