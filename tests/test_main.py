from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    # Check for either the JSON message or content that would suggest the app is running
    # Since static files might not be present in the test environment, we check for the fallback message or the title if it was an HTML page
    # The user requested: "It should check if 'DeutschesEcho' is in the response text"
    assert "DeutschesEcho" in response.text

def test_read_chapters():
    response = client.get("/api/chapters")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
