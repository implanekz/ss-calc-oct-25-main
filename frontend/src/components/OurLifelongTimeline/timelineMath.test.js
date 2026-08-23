import { ageToCalendarYear, calendarYearToAge, getAxisEndYear, AXIS_END_AGE } from './timelineMath';

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
