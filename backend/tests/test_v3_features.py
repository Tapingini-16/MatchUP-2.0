"""
PitchFinder V3 backend tests: advanced filters + reports + blocks moderation.
Assumes seed data with 8 groups is present.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://amateur-soccer-hub-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@pitchfinder.app"
DEMO_PASSWORD = "demo1234"
SARAH_EMAIL = "sarah@pitchfinder.app"


# ---------------- FIXTURES ----------------
@pytest.fixture(scope="module")
def demo():
    r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    return {"token": d["token"], "user": d["user"], "headers": {"Authorization": f"Bearer {d['token']}"}}


@pytest.fixture(scope="module")
def sarah():
    r = requests.post(f"{API}/auth/login", json={"email": SARAH_EMAIL, "password": DEMO_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    return {"token": d["token"], "user": d["user"], "headers": {"Authorization": f"Bearer {d['token']}"}}


@pytest.fixture(scope="module")
def fresh_user():
    email = f"testv3_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": "pass1234", "name": "TEST V3 User"})
    assert r.status_code == 200
    d = r.json()
    return {"token": d["token"], "user": d["user"], "headers": {"Authorization": f"Bearer {d['token']}"}}


# ---------------- ADVANCED FILTERS ----------------
class TestAdvancedFilters:
    def test_groups_include_v3_fields(self, demo):
        r = requests.get(f"{API}/groups", headers=demo["headers"])
        assert r.status_code == 200
        groups = r.json()
        # Only look at seeded groups (skip any TEST_* left over from prior runs)
        seeded_names = {"FC République", "Les Titans du 11ème", "Bastille United",
                        "Les Débutants du Sud", "Elite Paris FC", "Mixed Vibes",
                        "Cité Universitaire FC", "Old School Kickers"}
        seeded = [g for g in groups if g["name"] in seeded_names]
        assert len(seeded) == 8, f"Expected 8 seeded groups, got {len(seeded)}: {[g['name'] for g in seeded]}"
        for g in seeded:
            assert "preferred_days" in g
            assert "positions_needed" in g
            assert isinstance(g["preferred_days"], list)
            assert isinstance(g["positions_needed"], list)
            assert len(g["preferred_days"]) > 0, f"{g['name']} has empty preferred_days"
            assert len(g["positions_needed"]) > 0, f"{g['name']} has empty positions_needed"

    def test_filter_day_sunday(self, demo):
        r = requests.get(f"{API}/groups", params={"day": "sun"}, headers=demo["headers"])
        assert r.status_code == 200
        groups = r.json()
        names = [g["name"] for g in groups]
        expected = {"FC République", "Les Débutants du Sud", "Cité Universitaire FC",
                    "Elite Paris FC", "Old School Kickers"}
        assert expected.issubset(set(names)), f"Missing sunday groups. Got: {names}"
        # every returned group has 'sun'
        for g in groups:
            assert "sun" in g["preferred_days"], f"{g['name']} lacks sun but returned"

    def test_filter_position_gk(self, demo):
        r = requests.get(f"{API}/groups", params={"position": "GK"}, headers=demo["headers"])
        assert r.status_code == 200
        groups = [g for g in r.json() if g["name"] in {
            "FC République", "Les Titans du 11ème", "Bastille United",
            "Les Débutants du Sud", "Elite Paris FC", "Mixed Vibes",
            "Cité Universitaire FC", "Old School Kickers"}]
        # Spec: expect 3 seeded groups
        assert len(groups) == 3, f"Expected 3 GK groups, got {len(groups)}: {[g['name'] for g in groups]}"
        for g in groups:
            assert "GK" in g["positions_needed"]

    def test_filter_radius_5km(self, demo):
        r = requests.get(f"{API}/groups", params={"radius_km": 5}, headers=demo["headers"])
        assert r.status_code == 200
        for g in r.json():
            assert g["distance_km"] <= 5, f"{g['name']} distance {g['distance_km']} > 5"


# ---------------- GROUP PATCH ----------------
class TestGroupPatch:
    def test_admin_patch_group(self, demo):
        # Create a test group first so we own it
        r = requests.post(f"{API}/groups", json={
            "name": f"TEST V3 Patch {uuid.uuid4().hex[:6]}",
            "description": "patch test", "city": "Paris",
            "level": "mixed", "max_members": 10,
            "preferred_days": ["mon"], "positions_needed": ["MID"]
        }, headers=demo["headers"])
        assert r.status_code == 200
        gid = r.json()["id"]

        r2 = requests.patch(f"{API}/groups/{gid}", json={
            "name": "Patched Name",
            "preferred_days": ["sat", "sun"],
            "positions_needed": ["GK", "DEF"],
            "max_members": 15,
            "level": "advanced"
        }, headers=demo["headers"])
        assert r2.status_code == 200, r2.text
        d = r2.json()
        assert d["name"] == "Patched Name"
        assert set(d["preferred_days"]) == {"sat", "sun"}
        assert set(d["positions_needed"]) == {"GK", "DEF"}
        assert d["max_members"] == 15
        assert d["level"] == "advanced"

    def test_non_admin_patch_403(self, demo, sarah):
        # Create group by demo
        r = requests.post(f"{API}/groups", json={
            "name": f"TEST V3 PatchDeny {uuid.uuid4().hex[:6]}",
            "description": "x", "city": "Paris", "level": "mixed", "max_members": 10
        }, headers=demo["headers"])
        gid = r.json()["id"]
        # Sarah is not admin
        r2 = requests.patch(f"{API}/groups/{gid}", json={"name": "hack"}, headers=sarah["headers"])
        assert r2.status_code == 403


# ---------------- REPORTS ----------------
class TestReports:
    def test_report_group(self, demo):
        # Find any group id
        r = requests.get(f"{API}/groups", headers=demo["headers"])
        gid = r.json()[0]["id"]
        r2 = requests.post(f"{API}/reports", json={
            "target_type": "group", "target_id": gid,
            "reason": "spam", "message": "TEST v3 report"
        }, headers=demo["headers"])
        assert r2.status_code == 201, r2.text
        d = r2.json()
        assert "id" in d
        assert d["status"] == "submitted"

    def test_report_user(self, demo, sarah):
        r = requests.post(f"{API}/reports", json={
            "target_type": "user", "target_id": sarah["user"]["id"], "reason": "harassment"
        }, headers=demo["headers"])
        assert r.status_code == 201

    def test_report_invalid_reason_400(self, demo, sarah):
        r = requests.post(f"{API}/reports", json={
            "target_type": "user", "target_id": sarah["user"]["id"], "reason": "notvalid"
        }, headers=demo["headers"])
        assert r.status_code == 400

    def test_report_invalid_type_400(self, demo):
        r = requests.post(f"{API}/reports", json={
            "target_type": "match", "target_id": "x", "reason": "spam"
        }, headers=demo["headers"])
        assert r.status_code == 400

    def test_report_self_400(self, demo):
        r = requests.post(f"{API}/reports", json={
            "target_type": "user", "target_id": demo["user"]["id"], "reason": "spam"
        }, headers=demo["headers"])
        assert r.status_code == 400


# ---------------- BLOCKS ----------------
class TestBlocks:
    def test_block_group_hides_from_feed(self, fresh_user):
        # Get all groups
        r = requests.get(f"{API}/groups", headers=fresh_user["headers"])
        assert r.status_code == 200
        groups = r.json()
        assert len(groups) >= 1
        target = groups[0]
        target_id = target["id"]

        # Block
        r2 = requests.post(f"{API}/blocks", json={
            "target_type": "group", "target_id": target_id
        }, headers=fresh_user["headers"])
        assert r2.status_code == 201, r2.text
        assert r2.json()["status"] == "blocked"

        # Idempotent - second call
        r3 = requests.post(f"{API}/blocks", json={
            "target_type": "group", "target_id": target_id
        }, headers=fresh_user["headers"])
        assert r3.status_code == 201
        assert r3.json()["status"] == "blocked"

        # List blocks - dedup check
        r_list = requests.get(f"{API}/blocks", headers=fresh_user["headers"])
        assert r_list.status_code == 200
        blocks = r_list.json()
        matching = [b for b in blocks if b["target_id"] == target_id]
        assert len(matching) == 1, f"Duplicate blocks: {matching}"
        assert matching[0]["target"] is not None
        assert matching[0]["target"]["name"] == target["name"]

        # Group hidden from feed
        r4 = requests.get(f"{API}/groups", headers=fresh_user["headers"])
        ids = [g["id"] for g in r4.json()]
        assert target_id not in ids, "Blocked group still appears in feed"

        # Unblock
        r5 = requests.delete(f"{API}/blocks/group/{target_id}", headers=fresh_user["headers"])
        assert r5.status_code == 200
        r6 = requests.get(f"{API}/groups", headers=fresh_user["headers"])
        assert target_id in [g["id"] for g in r6.json()]

    def test_block_user(self, fresh_user, sarah):
        r = requests.post(f"{API}/blocks", json={
            "target_type": "user", "target_id": sarah["user"]["id"]
        }, headers=fresh_user["headers"])
        assert r.status_code == 201
        r_list = requests.get(f"{API}/blocks", headers=fresh_user["headers"])
        matching = [b for b in r_list.json() if b["target_id"] == sarah["user"]["id"]]
        assert matching
        assert matching[0]["target"]["name"]
        # Cleanup
        requests.delete(f"{API}/blocks/user/{sarah['user']['id']}", headers=fresh_user["headers"])

    def test_block_self_400(self, demo):
        r = requests.post(f"{API}/blocks", json={
            "target_type": "user", "target_id": demo["user"]["id"]
        }, headers=demo["headers"])
        assert r.status_code == 400

    def test_messages_filter_blocked_user(self, demo, sarah):
        """When demo blocks sarah, sarah's messages hidden in group feeds where both are members."""
        # Find a group where both are members
        r = requests.get(f"{API}/groups", headers=demo["headers"])
        target_gid = None
        for g in r.json():
            if g.get("is_member") and g["name"] in {"FC République", "Les Titans du 11ème", "Les Débutants du Sud"}:
                # Check sarah membership
                r_m = requests.get(f"{API}/groups/{g['id']}/members", headers=demo["headers"])
                if any(m["id"] == sarah["user"]["id"] for m in r_m.json()):
                    target_gid = g["id"]
                    break
        if not target_gid:
            pytest.skip("No shared group between demo and sarah")

        # Sarah posts message
        r_msg = requests.post(f"{API}/groups/{target_gid}/messages",
                              json={"text": f"TEST v3 sarah msg {uuid.uuid4().hex[:6]}"},
                              headers=sarah["headers"])
        assert r_msg.status_code == 200, r_msg.text
        posted_text = r_msg.json().get("text")

        # Demo can see before block
        r_before = requests.get(f"{API}/groups/{target_gid}/messages", headers=demo["headers"])
        assert any(m.get("text") == posted_text for m in r_before.json())

        # Demo blocks sarah
        rb = requests.post(f"{API}/blocks",
                           json={"target_type": "user", "target_id": sarah["user"]["id"]},
                           headers=demo["headers"])
        assert rb.status_code == 201

        r_after = requests.get(f"{API}/groups/{target_gid}/messages", headers=demo["headers"])
        texts = [m.get("text") for m in r_after.json()]
        assert posted_text not in texts, "Blocked user's messages still visible"
        # Also verify no messages from sarah at all
        assert not any(m.get("user_id") == sarah["user"]["id"] for m in r_after.json())

        # Cleanup unblock
        requests.delete(f"{API}/blocks/user/{sarah['user']['id']}", headers=demo["headers"])
