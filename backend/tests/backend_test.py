"""
PitchFinder backend tests
Covers auth, users, groups, membership, messages, matches
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://amateur-soccer-hub-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@pitchfinder.app"
DEMO_PASSWORD = "demo1234"


@pytest.fixture(scope="session")
def demo_token():
    r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "user" in data
    return data["token"]


@pytest.fixture(scope="session")
def demo_headers(demo_token):
    return {"Authorization": f"Bearer {demo_token}"}


@pytest.fixture(scope="session")
def secondary_user():
    """Register a fresh user for negative-membership tests"""
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(
        f"{API}/auth/register",
        json={"email": email, "password": "testpass123", "name": "TEST User"},
        timeout=15,
    )
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    d = r.json()
    return {"token": d["token"], "user": d["user"], "headers": {"Authorization": f"Bearer {d['token']}"}}


# ============= AUTH =============
class TestAuth:
    def test_register_new_user(self):
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/register", json={"email": email, "password": "pass123", "name": "Reg User"})
        assert r.status_code == 200
        d = r.json()
        assert "token" in d and "user" in d
        assert d["user"]["email"] == email.lower()
        assert d["user"]["name"] == "Reg User"

    def test_register_duplicate_email_400(self):
        r = requests.post(f"{API}/auth/register", json={"email": DEMO_EMAIL, "password": "pass123", "name": "Dup"})
        assert r.status_code == 400

    def test_login_demo_returns_token(self, demo_token):
        assert isinstance(demo_token, str) and len(demo_token) > 20

    def test_login_wrong_password_401(self):
        r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": "wrong-pass"})
        assert r.status_code == 401

    def test_me_with_valid_token(self, demo_headers):
        r = requests.get(f"{API}/auth/me", headers=demo_headers)
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == DEMO_EMAIL
        assert d["name"] == "Alex Martin"

    def test_me_without_token_401(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_with_invalid_token_401(self):
        r = requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer garbage.token.here"})
        assert r.status_code == 401


# ============= USERS =============
class TestUsers:
    def test_update_me_and_verify_persistence(self, demo_headers):
        payload = {
            "bio": "TEST bio updated",
            "city": "Paris",
            "position": "MID",
            "level": "intermediate",
            "foot": "right",
            "availabilities": ["evening", "weekend"],
        }
        r = requests.patch(f"{API}/users/me", json=payload, headers=demo_headers)
        assert r.status_code == 200
        d = r.json()
        assert d["bio"] == "TEST bio updated"
        assert d["position"] == "MID"
        # Verify persistence
        r2 = requests.get(f"{API}/auth/me", headers=demo_headers)
        assert r2.status_code == 200
        assert r2.json()["bio"] == "TEST bio updated"
        assert r2.json()["availabilities"] == ["evening", "weekend"]

    def test_update_me_name(self, demo_headers):
        r = requests.patch(f"{API}/users/me", json={"name": "Alex Martin"}, headers=demo_headers)
        assert r.status_code == 200
        assert r.json()["name"] == "Alex Martin"


# ============= GROUPS =============
class TestGroups:
    def test_list_groups_returns_8_seeded(self, demo_headers):
        r = requests.get(f"{API}/groups", headers=demo_headers)
        assert r.status_code == 200
        groups = r.json()
        assert isinstance(groups, list)
        assert len(groups) >= 8, f"expected >=8 seeded, got {len(groups)}"
        g = groups[0]
        for k in ["id", "name", "description", "city", "level", "members_count", "distance_km", "spots_left", "is_member"]:
            assert k in g, f"missing key {k}"

    def test_list_groups_sorted_by_distance_default(self, demo_headers):
        r = requests.get(f"{API}/groups", headers=demo_headers)
        groups = r.json()
        distances = [g["distance_km"] for g in groups]
        assert distances == sorted(distances)

    def test_filter_by_level_intermediate(self, demo_headers):
        r = requests.get(f"{API}/groups?level=intermediate", headers=demo_headers)
        assert r.status_code == 200
        groups = r.json()
        assert len(groups) >= 1
        for g in groups:
            assert g["level"] == "intermediate"

    def test_search_by_paris(self, demo_headers):
        r = requests.get(f"{API}/groups?q=paris", headers=demo_headers)
        assert r.status_code == 200
        groups = r.json()
        assert len(groups) >= 1

    def test_group_detail(self, demo_headers):
        r = requests.get(f"{API}/groups", headers=demo_headers)
        gid = r.json()[0]["id"]
        r2 = requests.get(f"{API}/groups/{gid}", headers=demo_headers)
        assert r2.status_code == 200
        g = r2.json()
        assert g["id"] == gid
        assert "members_count" in g and g["members_count"] >= 1
        assert "spots_left" in g
        assert "is_member" in g

    def test_group_members(self, demo_headers):
        r = requests.get(f"{API}/groups", headers=demo_headers)
        gid = r.json()[0]["id"]
        r2 = requests.get(f"{API}/groups/{gid}/members", headers=demo_headers)
        assert r2.status_code == 200
        members = r2.json()
        assert isinstance(members, list) and len(members) >= 1
        assert "role" in members[0]

    def test_my_groups(self, demo_headers):
        r = requests.get(f"{API}/groups/mine/list", headers=demo_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_group_and_verify(self, demo_headers):
        payload = {
            "name": f"TEST Group {uuid.uuid4().hex[:6]}",
            "description": "TEST group for pytest",
            "city": "Paris",
            "level": "mixed",
            "max_members": 12,
        }
        r = requests.post(f"{API}/groups", json=payload, headers=demo_headers)
        assert r.status_code == 200
        g = r.json()
        assert g["name"] == payload["name"]
        assert g["is_member"] is True  # creator becomes admin/member
        # verify GET
        r2 = requests.get(f"{API}/groups/{g['id']}", headers=demo_headers)
        assert r2.status_code == 200
        assert r2.json()["name"] == payload["name"]

    def test_join_group_and_verify_membership(self, secondary_user):
        r = requests.get(f"{API}/groups", headers=secondary_user["headers"])
        # Pick a group where user is NOT a member yet
        target = next((g for g in r.json() if not g["is_member"]), None)
        assert target is not None, "secondary user is already a member of all groups"
        gid = target["id"]
        r2 = requests.post(f"{API}/groups/{gid}/join", json={}, headers=secondary_user["headers"])
        assert r2.status_code == 200
        # verify
        r3 = requests.get(f"{API}/groups/{gid}", headers=secondary_user["headers"])
        assert r3.status_code == 200
        assert r3.json()["is_member"] is True


# ============= MESSAGES =============
class TestMessages:
    def test_get_messages_seeded(self, demo_headers):
        # find a group where demo is member
        r = requests.get(f"{API}/groups/mine/list", headers=demo_headers)
        groups = r.json()
        assert len(groups) >= 1, "demo has no groups"
        gid = groups[0]["id"]
        r2 = requests.get(f"{API}/groups/{gid}/messages", headers=demo_headers)
        assert r2.status_code == 200
        msgs = r2.json()
        assert isinstance(msgs, list) and len(msgs) >= 1
        assert "text" in msgs[0] and "user_name" in msgs[0]

    def test_send_message(self, demo_headers):
        r = requests.get(f"{API}/groups/mine/list", headers=demo_headers)
        gid = r.json()[0]["id"]
        text = f"TEST msg {uuid.uuid4().hex[:6]}"
        r2 = requests.post(f"{API}/groups/{gid}/messages", json={"text": text}, headers=demo_headers)
        assert r2.status_code == 200
        d = r2.json()
        assert d["text"] == text
        assert "_id" not in d
        # verify in GET
        r3 = requests.get(f"{API}/groups/{gid}/messages", headers=demo_headers)
        assert any(m["text"] == text for m in r3.json())

    def test_non_member_cannot_get_messages_403(self, secondary_user, demo_headers):
        # Demo creates a fresh group; secondary user is not a member
        payload = {
            "name": f"TEST Private {uuid.uuid4().hex[:6]}",
            "description": "private",
            "city": "Paris",
            "level": "mixed",
            "max_members": 5,
        }
        r = requests.post(f"{API}/groups", json=payload, headers=demo_headers)
        gid = r.json()["id"]
        r2 = requests.get(f"{API}/groups/{gid}/messages", headers=secondary_user["headers"])
        assert r2.status_code == 403

    def test_non_member_cannot_post_messages_403(self, secondary_user, demo_headers):
        payload = {
            "name": f"TEST Private2 {uuid.uuid4().hex[:6]}",
            "description": "private",
            "city": "Paris",
            "level": "mixed",
            "max_members": 5,
        }
        r = requests.post(f"{API}/groups", json=payload, headers=demo_headers)
        gid = r.json()["id"]
        r2 = requests.post(f"{API}/groups/{gid}/messages", json={"text": "hi"}, headers=secondary_user["headers"])
        assert r2.status_code == 403


# ============= MATCHES =============
class TestMatches:
    def test_list_matches(self, demo_headers):
        r = requests.get(f"{API}/groups", headers=demo_headers)
        gid = r.json()[0]["id"]
        r2 = requests.get(f"{API}/groups/{gid}/matches", headers=demo_headers)
        assert r2.status_code == 200
        matches = r2.json()
        assert isinstance(matches, list)
        if matches:
            assert "title" in matches[0] and "date" in matches[0]
