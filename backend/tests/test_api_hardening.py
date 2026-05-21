import os

import anyio
import httpx

os.environ.setdefault("SUPABASE_URL", "http://localhost:54321")
os.environ.setdefault("SUPABASE_KEY", "dummy-test-key")

from backend.core.integrated_ss_api import app


async def _request(method, path, **kwargs):
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        return await client.request(method, path, **kwargs)


def request(method, path, **kwargs):
    async def run_request():
        return await _request(method, path, **kwargs)

    return anyio.run(run_request)


def test_healthz_reports_status():
    response = request("GET", "/healthz")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_xml_upload_rejects_non_xml_file():
    response = request(
        "POST",
        "/upload-ssa-xml",
        files={"file": ("statement.txt", b"not xml", "text/plain")},
        data={"birth_date": "1965-01-01"},
    )

    assert response.status_code == 415
    assert response.json()["detail"] == "SSA upload must be an XML file"


def test_xml_upload_rejects_large_file():
    response = request(
        "POST",
        "/upload-ssa-xml",
        files={
            "file": (
                "statement.xml",
                b"x" * (2 * 1024 * 1024 + 1),
                "application/xml",
            )
        },
        data={"birth_date": "1965-01-01"},
    )

    assert response.status_code == 413
    assert response.json()["detail"] == "SSA XML upload exceeds 2 MB limit"
