import os

os.environ.setdefault("SUPABASE_URL", "http://localhost:54321")
os.environ.setdefault("SUPABASE_KEY", "dummy-test-key")

from fastapi.testclient import TestClient
from backend.core.integrated_ss_api import app

client = TestClient(app)

BIRTH_YEAR = 1965
# 40 years of steady earnings at the taxable maximum era levels.
EARNINGS = [
    {"year": year, "earnings": 90000, "is_projected": year > 2026}
    for year in range(1990, 2036)
]


def _ladder(stop_ages):
    return client.post(
        "/api/work-stop-ladder",
        json={
            "birth_year": BIRTH_YEAR,
            "earnings_history": EARNINGS,
            "stop_ages": stop_ages,
        },
    )


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
