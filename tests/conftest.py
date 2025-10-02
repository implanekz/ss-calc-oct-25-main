# tests/conftest.py
import pytest

@pytest.fixture
def default_inputs():
    """
    Shared baseline inputs for Social Security benefit math.
    You can override in individual tests if needed.
    """
    return {
        "pia_fra": 4000.0,
        "fra_years": 67.0,
        "cola_rate": 0.03,
        "current_age": 65.0,
    }
