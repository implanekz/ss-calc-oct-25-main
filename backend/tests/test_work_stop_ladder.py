import os
from datetime import datetime

os.environ.setdefault("SUPABASE_URL", "http://localhost:54321")
os.environ.setdefault("SUPABASE_KEY", "dummy-test-key")

from fastapi.testclient import TestClient
from backend.core.integrated_ss_api import app
from backend.core.ssa_xml_processor import SSAXMLProcessor, EarningsRecord

client = TestClient(app)

CURRENT_YEAR = datetime.now().year

BIRTH_YEAR = 1965
# 40 years of steady earnings at the taxable maximum era levels.
# NOTE: this fixture runs non-zero earnings out to 2035 — a shape no persisted
# record can actually have, since an uploaded record ends a few years after
# today. It is kept because it pins the endpoint's contract, but the realistic
# fixture below is the one that reflects a real upload.
EARNINGS = [
    {"year": year, "earnings": 90000, "is_projected": year > 2026}
    for year in range(1990, 2036)
]


def _ladder(stop_ages, birth_year=BIRTH_YEAR, earnings=None):
    return client.post(
        "/api/work-stop-ladder",
        json={
            "birth_year": birth_year,
            "earnings_history": EARNINGS if earnings is None else earnings,
            "stop_ages": stop_ages,
        },
    )


def _uploaded_record_rows(birth_year, first_work_year, start_salary=55000, growth=1.03):
    """
    The exact row shape a real XML upload persists: a career of rising earnings
    ending at the current year, run through create_editable_spreadsheet() (what
    the XML endpoints return and what PIACalculator saves verbatim).
    """
    processor = SSAXMLProcessor(birth_year=birth_year)
    processor.earnings_history = [
        EarningsRecord(
            year=year,
            earnings=round(start_salary * (growth ** (year - first_work_year)), 2),
            is_zero=False,
            is_projected=False,
        )
        for year in range(first_work_year, CURRENT_YEAR + 1)
    ]
    return [
        {
            "year": row["year"],
            "earnings": row["earnings"],
            "is_projected": row["is_future_projection"],
        }
        for row in processor.create_editable_spreadsheet()
    ]


def test_returns_one_rung_per_stop_age():
    response = _ladder([62, 65, 67, 70])
    assert response.status_code == 200
    rungs = response.json()["rungs"]
    assert [r["stop_age"] for r in rungs] == [62, 65, 67, 70]


def test_stop_year_is_birth_year_plus_stop_age():
    rungs = _ladder([62, 67]).json()["rungs"]
    assert rungs[0]["stop_year"] == BIRTH_YEAR + 62
    assert rungs[1]["stop_year"] == BIRTH_YEAR + 67


def test_working_longer_never_lowers_pia():
    rungs = _ladder([62, 65, 67, 70]).json()["rungs"]
    pias = [r["pia"] for r in rungs]
    assert pias == sorted(pias), f"PIA should be non-decreasing in stop age, got {pias}"


def test_rejects_stop_age_outside_62_to_70():
    assert _ladder([55]).status_code == 422
    assert _ladder([75]).status_code == 422


def test_rejects_empty_stop_ages():
    assert _ladder([]).status_code == 422


def test_rejects_duplicate_stop_ages():
    assert _ladder([62, 62, 67]).status_code == 422


def test_rejects_more_stop_ages_than_the_62_to_70_domain():
    assert _ladder([62, 63, 64, 65, 66, 67, 68, 69, 70]).status_code == 200
    assert _ladder([62, 63, 64, 65, 66, 67, 68, 69, 70, 62]).status_code == 422


# --- Realistic record: earnings end at the current year, as a real upload does ---


def test_editable_spreadsheet_carries_last_known_earnings_forward():
    """
    Future padding rows used to be $0, which made every work-stop age produce the
    same PIA (zeroing a $0 year is a no-op). They now carry the most recent known
    earnings forward, the way SSA's own statement projection does.
    """
    rows = _uploaded_record_rows(CURRENT_YEAR - 45, CURRENT_YEAR - 20)
    by_year = {row["year"]: row for row in rows}
    last_actual = by_year[CURRENT_YEAR]["earnings"]

    future_rows = [row for row in rows if row["year"] > CURRENT_YEAR]
    assert future_rows, "spreadsheet should pad future planning years"
    for row in future_rows:
        assert row["earnings"] == last_actual
        assert row["is_projected"] is True


def test_realistic_record_produces_differing_pias_across_stop_ages():
    """
    The damaging case from review: a 45-year-old with only ~20 earnings years, so
    plenty of zeros in the top 35. Working longer is their single largest lever
    and the ladder must show it.
    """
    birth_year = CURRENT_YEAR - 45
    rows = _uploaded_record_rows(birth_year, CURRENT_YEAR - 20)

    rungs = _ladder([62, 65, 67, 70], birth_year=birth_year, earnings=rows).json()["rungs"]
    pias = [r["pia"] for r in rungs]

    assert len(set(pias)) == 4, f"every stop age should give a distinct PIA, got {pias}"
    assert pias == sorted(pias)
    assert pias[-1] > pias[0]


def test_realistic_record_near_62_also_differs():
    """A 60-year-old: the stop years land inside the record's padded tail."""
    birth_year = CURRENT_YEAR - 60
    rows = _uploaded_record_rows(birth_year, CURRENT_YEAR - 38)

    pias = [r["pia"] for r in _ladder([62, 65, 67, 70], birth_year=birth_year, earnings=rows).json()["rungs"]]
    assert len(set(pias)) == 4, f"every stop age should give a distinct PIA, got {pias}"
    assert pias == sorted(pias)
