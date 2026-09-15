import pytest
import io
from datetime import datetime, timedelta

def get_auth_token(client):
    login_res = client.post("/auth/login", data={"username": "comp_admin@test.com", "password": "password"})
    if login_res.status_code != 200:
        client.post("/auth/register", json={
            "name": "Comparison Admin",
            "email": "comp_admin@test.com",
            "password": "password",
            "role": "admin"
        })
        login_res = client.post("/auth/login", data={"username": "comp_admin@test.com", "password": "password"})
    return login_res.json()["access_token"]


def test_site_comparisons_workflow(client):
    token = get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create two separate projects
    p1_res = client.post("/projects", json={"name": "Project Alpha"}, headers=headers)
    assert p1_res.status_code == 201
    p1_id = p1_res.json()["id"]

    p2_res = client.post("/projects", json={"name": "Project Beta"}, headers=headers)
    assert p2_res.status_code == 201
    p2_id = p2_res.json()["id"]

    # 2. Create sites
    s1_res = client.post(f"/projects/{p1_id}/sites", json={"name": "North Wing Site"}, headers=headers)
    assert s1_res.status_code == 201
    s1_id = s1_res.json()["id"]

    s2_res = client.post(f"/projects/{p2_id}/sites", json={"name": "South Wing Site"}, headers=headers)
    assert s2_res.status_code == 201
    s2_id = s2_res.json()["id"]

    # 3. Create reports with dummy images
    dummy_img_bytes1 = io.BytesIO(b"fake image data 1")
    r1_res = client.post(
        f"/sites/{s1_id}/reports",
        data={"type": "inspection", "text": "Framing inspection day 1"},
        files={"images": ("day1.jpg", dummy_img_bytes1, "image/jpeg")},
        headers=headers
    )
    assert r1_res.status_code == 201
    img1_id = r1_res.json()["images"][0]["id"]

    dummy_img_bytes2 = io.BytesIO(b"fake image data 2")
    r2_res = client.post(
        f"/sites/{s1_id}/reports",
        data={"type": "progress", "text": "Framing completed day 10"},
        files={"images": ("day10.jpg", dummy_img_bytes2, "image/jpeg")},
        headers=headers
    )
    assert r2_res.status_code == 201
    img2_id = r2_res.json()["images"][0]["id"]

    # Create report in project 2
    dummy_img_bytes3 = io.BytesIO(b"fake image data 3")
    r3_res = client.post(
        f"/sites/{s2_id}/reports",
        data={"type": "progress", "text": "Project 2 work"},
        files={"images": ("proj2.jpg", dummy_img_bytes3, "image/jpeg")},
        headers=headers
    )
    assert r3_res.status_code == 201
    img3_id = r3_res.json()["images"][0]["id"]

    # 4. TEST VALIDATION: Reject when before and after photos are identical
    err_same = client.post("/comparisons", json={
        "project_id": p1_id,
        "location_tag": "North Wing — Level 2",
        "before_photo_id": img1_id,
        "after_photo_id": img1_id
    }, headers=headers)
    assert err_same.status_code == 400
    assert "same photo" in err_same.json()["detail"].lower()

    # 5. TEST VALIDATION: Reject when photos belong to different projects
    err_diff_proj = client.post("/comparisons", json={
        "project_id": p1_id,
        "location_tag": "North Wing — Level 2",
        "before_photo_id": img1_id,
        "after_photo_id": img3_id
    }, headers=headers)
    assert err_diff_proj.status_code == 400
    assert "project" in err_diff_proj.json()["detail"].lower()

    # 6. TEST SUCCESS: Create valid comparison
    create_res = client.post("/comparisons", json={
        "project_id": p1_id,
        "location_tag": "North Wing — Level 2",
        "before_photo_id": img1_id,
        "after_photo_id": img2_id
    }, headers=headers)
    assert create_res.status_code == 201
    comp_data = create_res.json()
    comp_id = comp_data["id"]
    assert comp_data["location_tag"] == "North Wing — Level 2"
    assert "before_photo" in comp_data
    assert "after_photo" in comp_data
    assert "safety_diff" in comp_data
    assert comp_data["ai_summary"] is not None

    # 7. TEST LIST: GET /comparisons/{project_id}
    list_res = client.get(f"/comparisons/{p1_id}", headers=headers)
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert isinstance(list_data, list)
    assert len(list_data) >= 1
    assert list_data[0]["id"] == comp_id

    # 8. TEST DETAIL: GET /comparisons/{id}
    detail_res = client.get(f"/comparisons/{comp_id}", headers=headers)
    assert detail_res.status_code == 200
    single_data = detail_res.json()
    assert single_data["id"] == comp_id
    assert single_data["before_photo"]["id"] == img1_id

    # 9. TEST DIRECT UPLOAD: POST /comparisons/upload
    up_before = io.BytesIO(b"upload before content")
    up_after = io.BytesIO(b"upload after content")
    upload_res = client.post(
        "/comparisons/upload",
        data={
            "project_id": p1_id,
            "location_tag": "East Stairwell",
            "before_notes": "Rough-in stage",
            "after_notes": "Drywall stage"
        },
        files={
            "before_file": ("stair_before.jpg", up_before, "image/jpeg"),
            "after_file": ("stair_after.jpg", up_after, "image/jpeg")
        },
        headers=headers
    )
    assert upload_res.status_code == 201
    up_data = upload_res.json()
    assert up_data["location_tag"] == "East Stairwell"
    assert up_data["before_photo"]["url"].startswith("/uploads/")
    assert up_data["after_photo"]["url"].startswith("/uploads/")
