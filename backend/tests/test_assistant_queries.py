import pytest

@pytest.fixture(scope="module")
def auth_headers(client):
    client.post("/auth/register", json={
        "name": "Admin User",
        "email": "assistant_tester@test.com",
        "password": "password",
        "role": "admin"
    })
    login_res = client.post("/auth/login", data={"username": "assistant_tester@test.com", "password": "password"})
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_query_summarize_problems_this_week(client, auth_headers):
    res = client.post("/assistant/query", json={"question": "Summarize the problems reported this week."}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert len(data["answer"]) > 0
    assert "referenced_report_ids" in data

def test_query_safety_issues_area_b(client, auth_headers):
    res = client.post("/assistant/query", json={"question": "What safety issues were found in Area B?"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert len(data["answer"]) > 0
    assert "referenced_report_ids" in data

def test_query_recurring_issues(client, auth_headers):
    res = client.post("/assistant/query", json={"question": "Which issues have occurred repeatedly?"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert len(data["answer"]) > 0
    assert "referenced_report_ids" in data

def test_query_weekly_progress_report(client, auth_headers):
    res = client.post("/assistant/query", json={"question": "Generate a weekly site progress report."}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert len(data["answer"]) > 0
    assert "referenced_report_ids" in data

def test_arbitrary_manual_query_greeting(client, auth_headers):
    res = client.post("/assistant/query", json={"question": "Hello, what can you do for our construction site?"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert len(data["answer"]) > 0

def test_arbitrary_manual_query_custom_topic(client, auth_headers):
    res = client.post("/assistant/query", json={"question": "Can you tell me about the HVAC chiller crane lift and roof deck status?"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert len(data["answer"]) > 0

def test_arbitrary_manual_query_specific_person(client, auth_headers):
    res = client.post("/assistant/query", json={"question": "What did Marcus Holloway log?"}, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert len(data["answer"]) > 0
