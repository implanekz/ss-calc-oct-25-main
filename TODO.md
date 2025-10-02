# TODO.md

## Immediate (calculation wiring)
- [ ] In `backend/core/ss_core_calculator.py`, replace any inline “PIA at claim” math with a call to:
      ```python
      monthly_benefit_at_claim(
        pia_fra=PIA_FRA,                 # or your variable name
        claim_age_years=claim_age_years, # e.g., 70.0
        current_age_years=current_age,   # e.g., 65.0 (or whatever you compute)
        r=assumed_cola_rate,             # slider value (e.g., 0.03)
        fra_years=fra_years_float,       # from SocialSecurityConstants.get_fra
      )
      ```
- [ ] In the annual projection after claim, apply post-claim COLAs via:
      ```python
      benefit_after_claim(base_monthly_at_claim, years_after_claim, assumed_cola_rate)
      ```

## Verification
- [ ] Run the backend and UI; with PIA=4000, COLA=3%, claim=70, expect monthly ≈ \$6.2–\$6.4k (depends on timing conventions).
- [ ] Confirm ages 60–61 freeze (0%) is respected.

## Tests
- [ ] Add `tests/test_benefit_math.py` with the age-70 check and post-claim COLA checks (provided in chat).
- [ ] Run `pytest -q` and ensure tests pass locally.

## UX copy (quick)
- [ ] Tooltip near slider: “We apply 0% at ages 60–61; your rate applies from age 62, and continues annually after you claim.”

## Nice-to-have (later)
- [ ] Month-accurate COLA timings (January COLAs, birthday-based claim months).
- [ ] XML earnings upload pathway (recompute PIA).