from backend.core.benefit_math import (
    monthly_benefit_at_claim,
    benefit_after_claim,
)


def test_age70_example(default_inputs):
    """
    PIA at FRA = 4000, claim at 70, COLA=3%, FRA=67.
    Should land ~6.2–6.4k (depends on timing conventions).
    """
    v = monthly_benefit_at_claim(
        pia_fra=default_inputs["pia_fra"],
        claim_age_years=70.0,
        current_age_years=default_inputs["current_age"],
        r=default_inputs["cola_rate"],
        fra_years=default_inputs["fra_years"],
    )
    assert 6200 <= v <= 6400


def test_post_claim_cola_compounds(default_inputs):
    """
    Check that benefits compound correctly after claiming.
    """
    base = 3000.0
    r = default_inputs["cola_rate"]

    # Year 0: same benefit
    assert round(benefit_after_claim(base, 0, r), 2) == 3000.00
    # Year 1: one COLA
    assert round(benefit_after_claim(base, 1, r), 2) == round(3000 * 1.03, 2)
    # Year 2: two COLAs
    assert round(benefit_after_claim(base, 2, r), 2) == round(3000 * (1.03**2), 2)
