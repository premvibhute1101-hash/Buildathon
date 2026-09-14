import pytest

def test_register_user(client):
    response = client.post("/auth/register", json={
        "name": "Admin User",
        "email": "admin@test.com",
        "password": "password",
        "role": "admin"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "admin@test.com"
    assert data["role"] == "admin"
    assert "id" in data

def test_login_user(client):
    response = client.post("/auth/login", data={
        "username": "admin@test.com",
        "password": "password"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_get_current_user(client):
    login_res = client.post("/auth/login", data={"username": "admin@test.com", "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    res = client.get("/auth/me", headers=headers)
    assert res.status_code == 200
    assert res.json()["email"] == "admin@test.com"

def test_create_project_and_site(client):
    login_res = client.post("/auth/login", data={"username": "admin@test.com", "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.post("/projects", json={"name": "Test Project"}, headers=headers)
    assert response.status_code == 201
    project_id = response.json()["id"]
    
    # Create site
    site_res = client.post(f"/projects/{project_id}/sites", json={"name": "Zone A"}, headers=headers)
    assert site_res.status_code == 201
    assert site_res.json()["name"] == "Zone A"

    # List projects
    res_list = client.get("/projects", headers=headers)
    assert res_list.status_code == 200
    assert len(res_list.json()) >= 1

def test_dashboard_and_recurring(client):
    login_res = client.post("/auth/login", data={"username": "admin@test.com", "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    response = client.get("/dashboard/summary", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_reports" in data
    assert "compliance_rate" in data

    rec_res = client.get("/dashboard/recurring-issues", headers=headers)
    assert rec_res.status_code == 200

def test_assistant_query(client):
    login_res = client.post("/auth/login", data={"username": "admin@test.com", "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    res = client.post("/assistant/query", json={"question": "Summarize the problems reported this week"}, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert "referenced_report_ids" in data
