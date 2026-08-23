// How far past the later-born spouse's birth year the shared calendar axis extends.
export const AXIS_END_AGE = 100;

export const ageToCalendarYear = (birthYear, age) => birthYear + age;

export const calendarYearToAge = (birthYear, year) => year - birthYear;

export const getAxisEndYear = (birthYearPrimary, birthYearSpouse) =>
  Math.max(birthYearPrimary, birthYearSpouse) + AXIS_END_AGE;
