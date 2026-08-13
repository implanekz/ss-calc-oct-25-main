import os

os.environ.setdefault("SUPABASE_URL", "http://localhost:54321")
os.environ.setdefault("SUPABASE_KEY", "dummy-test-key")

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_put_earnings_rejects_unknown_person():
    response = client.put(
        "/api/earnings/cousin",
        json={"birth_year": 1965, "rows": []},
    )
    assert response.status_code == 422


def test_put_earnings_rejects_birth_year_out_of_range():
    response = client.put(
        "/api/earnings/self",
        json={"birth_year": 1800, "rows": []},
    )
    assert response.status_code == 422


def test_put_earnings_rejects_negative_earnings():
    response = client.put(
        "/api/earnings/self",
        json={"birth_year": 1965, "rows": [{"year": 2020, "earnings": -5}]},
    )
    assert response.status_code == 422


def test_put_earnings_requires_authentication():
    response = client.put(
        "/api/earnings/self",
        json={"birth_year": 1965, "rows": [{"year": 2020, "earnings": 50000}]},
    )
    assert response.status_code == 401


def test_get_earnings_requires_authentication():
    assert client.get("/api/earnings").status_code == 401


def test_delete_earnings_requires_authentication():
    assert client.delete("/api/earnings/self").status_code == 401
