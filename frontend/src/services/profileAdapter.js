export function normalizeProfile(profile = {}) {
  return {
    ...profile,
    firstName: profile.firstName ?? profile.first_name,
    lastName: profile.lastName ?? profile.last_name,
    dateOfBirth: profile.dateOfBirth ?? profile.date_of_birth,
    relationshipStatus: profile.relationshipStatus ?? profile.relationship_status,
    piaAtFra: profile.piaAtFra ?? profile.pia_at_fra,
    preferredClaimingAgeYears: profile.preferredClaimingAgeYears ?? profile.preferred_claiming_age_years,
    preferredClaimingAgeMonths: profile.preferredClaimingAgeMonths ?? profile.preferred_claiming_age_months
  };
}

export function normalizePartner(partner = {}) {
  return {
    ...partner,
    firstName: partner.firstName ?? partner.first_name,
    lastName: partner.lastName ?? partner.last_name,
    dateOfBirth: partner.dateOfBirth ?? partner.date_of_birth,
    piaAtFra: partner.piaAtFra ?? partner.pia_at_fra ?? partner.pia
  };
}
