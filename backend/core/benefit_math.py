# backend/core/benefit_math.py
from math import floor

# Default FRA used if you don’t already compute FRA per birth year in callers.
# If your calculator passes a precise FRA, this constant won’t be used.
DEFAULT_FRA_YEARS = 67

def months_from_fra(claim_age_years: float, fra_years: int = DEFAULT_FRA_YEARS) -> int:
    """Months from FRA to the claim age (positive if delayed, negative if early)."""
    return round((claim_age_years - fra_years) * 12)

def drc_factor(months_after_fra: int) -> float:
    """
    Delayed Retirement Credits (SSA): 2/3 of 1% per month (simple, non-compounding).
    e.g., 36 months late -> 1 + (2/3% * 36) = 1.24
    """
    m = max(0, months_after_fra)
    return 1.0 + (2.0/3.0)/100.0 * m

def early_reduction_factor(months_before_fra: int) -> float:
    """
    SSA early filing reduction:
      - First 36 months: 5/9 of 1% per month
      - Additional months: 5/12 of 1% per month
    months_before_fra is negative (e.g., -60 if 5 years early).
    Returns the multiplier (<= 1.0).
    """
    m = abs(min(0, months_before_fra))
    first_36 = min(36, m)
    extra = max(0, m - 36)
    reduction = first_36 * (5/9)/100.0 + extra * (5/12)/100.0
    return max(0.0, 1.0 - reduction)

def preclaim_cola_factor(claim_age_years: float, current_age_years: float, r: float) -> float:
    """
    Pre-claim COLA accumulation (SSA-ish):
      - < 60: apply r each year
      - 60–61: freeze (0%)
      - >= 62: apply r each full year from 62 up to claim age
    This yields the inflation factor to apply to the PIA before claim.
    """
    pre60_years = max(0.0, min(60.0, claim_age_years) - current_age_years)
    cola_years_from_62 = max(0, floor(claim_age_years) - 62)
    return (1.0 + r) ** pre60_years * (1.0 + r) ** cola_years_from_62

def pia_at_claim_base(pia_fra: float, claim_age_years: float, current_age_years: float, r: float) -> float:
    """
    Inflate the FRA PIA by pre-claim COLAs to get the PIA at the claim age (before early/late adj).
    """
    return pia_fra * preclaim_cola_factor(claim_age_years, current_age_years, r)

def monthly_benefit_at_claim(
    pia_fra: float,
    claim_age_years: float,
    current_age_years: float,
    r: float,
    fra_years: int = DEFAULT_FRA_YEARS,
) -> float:
    """
    Full claim calculation at the claim age:
      1) Inflate PIA to claim age via pre-claim COLAs (SSA-ish freeze at 60–61).
      2) Apply early reduction (if before FRA) or DRCs (if after FRA).
    """
    base = pia_at_claim_base(pia_fra, claim_age_years, current_age_years, r)
    m_from_fra = months_from_fra(claim_age_years, fra_years)
    if m_from_fra >= 0:
        return base * drc_factor(m_from_fra)
    return base * early_reduction_factor(m_from_fra)

def benefit_after_claim(base_monthly_at_claim: float, years_after_claim: int, r: float) -> float:
    """
    Post-claim COLAs: apply r once per year after claiming (simple annual model).
    """
    return base_monthly_at_claim * ((1.0 + r) ** max(0, years_after_claim))