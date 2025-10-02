from backend.core.benefit_math import (
    monthly_benefit_at_claim,
    benefit_after_claim,
)

def test_age70_example():
    """
    PIA at FRA = 4000, claim at 70, COLA=3%, FRA=67.
    Simple annual model (pre-claim COLAs + 36 months DRCs) should land ~6.2–6.4k.
    """
    v = monthly_benefit_at_claim(4000.0, 70.0, 65.0, 0.03, fra_years=67.0)
    assert 6200 <= v <= 6400

def test_post_claim_cola_compounds():
    base = 3000.0
    r = 0.03
    assert round(benefit_after_claim(base, 0, r), 2) == 3000.00
    assert round(benefit_after_claim(base, 1, r), 2) == round(3000 * 1.03, 2)
    assert round(benefit_after_claim(base, 2, r), 2) == round(3000 * 1.03**2, 2)
