from fastapi.testclient import TestClient
from backend.main import app


def test_read_root():
    with TestClient(app) as client:
        response = client.get("/")
        assert response.status_code == 200
        assert "DeutschesEcho" in response.text

def test_read_chapters():
    with TestClient(app) as client:
        response = client.get("/api/chapters")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
