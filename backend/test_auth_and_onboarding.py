import asyncio
import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import async_engine, Base

@pytest.mark.asyncio
async def test_full_auth_and_onboarding_flow():
    # Setup test DB tables
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        unique_id = uuid.uuid4().hex[:8]
        
        # 1. Register new Email/Password user
        test_email = f"student_{unique_id}@university.edu"
        reg_resp = await client.post("/api/v1/auth/register", json={
            "email": test_email,
            "password": "securepassword123",
            "full_name": "Fresh Student",
            "target_role": "AI / ML Engineer"
        })
        assert reg_resp.status_code == 200, reg_resp.text
        reg_data = reg_resp.json()
        assert reg_data["is_first_time"] is True
        assert reg_data["auth_provider"] == "email"
        token = reg_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Check /auth/me returns is_first_time = True
        me_resp = await client.get("/api/v1/auth/me", headers=headers)
        assert me_resp.status_code == 200
        assert me_resp.json()["is_first_time"] is True

        # 3. Submit First-Time Onboarding Form
        onboard_resp = await client.post("/api/v1/auth/complete-onboarding", headers=headers, json={
            "full_name": "Fresh Student Updated",
            "age": 22,
            "college_name": "VIT Bhopal University",
            "course_and_branch": "B.Tech CSE (AI & ML)",
            "tenth_marks": "94.2%",
            "twelfth_marks": "92.0%",
            "ug_cgpa": "8.95",
            "pg_cgpa": "N/A",
            "work_experience": "Software Development Intern at AI Labs"
        })
        assert onboard_resp.status_code == 200, onboard_resp.text
        onboard_data = onboard_resp.json()
        assert onboard_data["is_first_time"] is False
        assert onboard_data["profile"]["college_name"] == "VIT Bhopal University"
        assert onboard_data["profile"]["ug_cgpa"] == 8.95
        # Legacy clients send "%"-suffixed marks and no separate `cgpa`
        assert onboard_data["profile"]["tenth_percentage"] == 94.2
        assert onboard_data["profile"]["cgpa"] == 8.95

        # 4. Subsequent Login for this user -> is_first_time MUST BE False!
        login_resp = await client.post("/api/v1/auth/login", data={
            "username": test_email,
            "password": "securepassword123"
        })
        assert login_resp.status_code == 200
        assert login_resp.json()["is_first_time"] is False

        # 5. Test Google Sign In for a new Google user
        google_email = f"google_{unique_id}@gmail.com"
        google_id_str = f"google_id_{unique_id}"
        g_resp = await client.post("/api/v1/auth/google", json={
            "email": google_email,
            "full_name": "Google User",
            "google_id": google_id_str,
            "target_role": "AI / ML Engineer"
        })
        assert g_resp.status_code == 200
        g_data = g_resp.json()
        assert g_data["is_first_time"] is True
        assert g_data["auth_provider"] == "google"

        # 6. Complete onboarding for Google user
        g_token = g_data["access_token"]
        g_headers = {"Authorization": f"Bearer {g_token}"}
        g_onboard = await client.post("/api/v1/auth/complete-onboarding", headers=g_headers, json={
            "full_name": "Google User Verified",
            "age": 21,
            "college_name": "VIT Bhopal University",
            "course_and_branch": "B.Tech CSE (Cloud Architecture)",
            "tenth_marks": "90.0%",
            "twelfth_marks": "88.5%",
            "ug_cgpa": "8.50",
            "pg_cgpa": None,
            "work_experience": "Cloud Project Lead"
        })
        assert g_onboard.status_code == 200
        assert g_onboard.json()["is_first_time"] is False

        # 7. Subsequent Google Sign In -> is_first_time MUST BE False!
        g_login2 = await client.post("/api/v1/auth/google", json={
            "email": google_email,
            "full_name": "Google User Verified",
            "google_id": google_id_str
        })
        assert g_login2.status_code == 200
        assert g_login2.json()["is_first_time"] is False

    print("\n✅ All Auth & First-Time Onboarding Integration Tests Passed!")

if __name__ == "__main__":
    asyncio.run(test_full_auth_and_onboarding_flow())
