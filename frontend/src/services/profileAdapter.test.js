import { normalizePartner, normalizeProfile } from './profileAdapter';

describe('profileAdapter', () => {
  test('normalizes profile names and claiming fields', () => {
    expect(normalizeProfile({
      first_name: 'Ada',
      last_name: 'Lovelace',
      date_of_birth: '1960-01-01',
      relationship_status: 'married',
      pia_at_fra: 3000,
      preferred_claiming_age_years: 67,
      preferred_claiming_age_months: 6
    })).toMatchObject({
      firstName: 'Ada',
      lastName: 'Lovelace',
      dateOfBirth: '1960-01-01',
      relationshipStatus: 'married',
      piaAtFra: 3000,
      preferredClaimingAgeYears: 67,
      preferredClaimingAgeMonths: 6
    });
  });

  test('normalizes partner PIA fallback', () => {
    expect(normalizePartner({ first_name: 'Grace', pia: 1800 })).toMatchObject({
      firstName: 'Grace',
      piaAtFra: 1800
    });
  });
});
