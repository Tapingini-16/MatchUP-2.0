"""V4 backend tests: friends, polls, ratings, leave, OTP, change password."""
import os
import time
import pytest
import requests

BASE_URL = "http://localhost:8001"
API = f"{BASE_URL}/api"

DEMO = {"email": "demo@matchup.app", "password": "demo1234"}
SARAH = {"email": "sarah@matchup.app", "password": "demo1234"}
LEO = {"email": "leo@matchup.app", "password": "demo1234"}


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=10)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    return data["token"], data["user"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def demo_ctx():
    tok, user = _login(DEMO)
    return {"token": tok, "user": user}


@pytest.fixture(scope="module")
def sarah_ctx():
    tok, user = _login(SARAH)
    return {"token": tok, "user": user}


@pytest.fixture(scope="module")
def leo_ctx():
    tok, user = _login(LEO)
    return {"token": tok, "user": user}


@pytest.fixture(scope="module")
def sample_group_id(demo_ctx):
    r = requests.get(f"{API}/groups", headers=_auth(demo_ctx["token"]), timeout=10)
    assert r.status_code == 200
    groups = r.json()
    # Find "Les Titans du 11ème" or first available where demo is member
    for g in groups:
        if "Titans" in g.get("name", ""):
            return g["id"]
    return groups[0]["id"]


# ==================== AUTH ====================
class TestAuth:
    def test_login_demo(self):
        r = requests.post(f"{API}/auth/login", json=DEMO, timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert data["user"]["email"] == DEMO["email"]


# ==================== FRIENDS ====================
class TestFriends:
    def test_full_friends_flow(self, demo_ctx, sarah_ctx, sample_group_id):
        demo_h = _auth(demo_ctx["token"])
        sarah_h = _auth(sarah_ctx["token"])
        sarah_id = sarah_ctx["user"]["id"]
        demo_id = demo_ctx["user"]["id"]

        # Reset: remove any existing friendship
        requests.delete(f"{API}/friends/{sarah_id}", headers=demo_h, timeout=10)

        # 1. Send friend request demo -> sarah
        r = requests.post(
            f"{API}/friends/request",
            headers=demo_h,
            json={"to_user_id": sarah_id},
            timeout=10,
        )
        assert r.status_code in (200, 201), f"request failed: {r.status_code} {r.text}"

        # 2. Sarah sees incoming
        r = requests.get(f"{API}/friends", headers=sarah_h, timeout=10)
        assert r.status_code == 200
        data = r.json()
        incoming_ids = [u["id"] for u in data.get("incoming", [])]
        assert demo_id in incoming_ids, f"demo not in sarah's incoming: {incoming_ids}"

        # 3. Status before accept - should be pending
        r = requests.get(f"{API}/friends/status/{sarah_id}", headers=demo_h, timeout=10)
        assert r.status_code == 200
        assert r.json()["status"] in ("outgoing", "pending", "incoming")

        # 4. Sarah accepts
        r = requests.post(
            f"{API}/friends/{demo_id}/accept", headers=sarah_h, timeout=10
        )
        assert r.status_code == 200, f"accept failed: {r.status_code} {r.text}"

        # 5. Status = friends both ways
        for ctx, other in [(demo_ctx, sarah_id), (sarah_ctx, demo_id)]:
            r = requests.get(
                f"{API}/friends/status/{other}",
                headers=_auth(ctx["token"]),
                timeout=10,
            )
            assert r.status_code == 200
            assert r.json()["status"] == "friends", (
                f"expected friends, got {r.json()}"
            )

        # 6. Both see each other in friends list
        r = requests.get(f"{API}/friends", headers=demo_h, timeout=10)
        assert sarah_id in [u["id"] for u in r.json().get("friends", [])]

        # 7. Remove friendship
        r = requests.delete(f"{API}/friends/{sarah_id}", headers=demo_h, timeout=10)
        assert r.status_code == 200

        # Confirm removal
        r = requests.get(f"{API}/friends/status/{sarah_id}", headers=demo_h, timeout=10)
        assert r.status_code == 200
        assert r.json()["status"] != "friends"


# ==================== POLLS ====================
class TestPolls:
    def test_poll_create_vote_idempotent(
        self, demo_ctx, sarah_ctx, sample_group_id
    ):
        demo_h = _auth(demo_ctx["token"])
        sarah_h = _auth(sarah_ctx["token"])

        # Create poll
        r = requests.post(
            f"{API}/groups/{sample_group_id}/messages",
            headers=demo_h,
            json={"poll": {"question": "Ce samedi ?", "options": ["Oui", "Non"]}},
            timeout=10,
        )
        assert r.status_code in (200, 201), f"poll create failed: {r.text}"
        msg = r.json()
        msg_id = msg["id"]
        assert msg["poll"]["question"] == "Ce samedi ?"
        assert msg["poll"]["options"] == ["Oui", "Non"]

        # Demo votes option 0
        r = requests.post(
            f"{API}/messages/{msg_id}/poll/vote",
            headers=demo_h,
            json={"option_index": 0},
            timeout=10,
        )
        assert r.status_code == 200, f"vote failed: {r.text}"
        updated = r.json()
        assert updated["poll"]["votes"][demo_ctx["user"]["id"]] == 0

        # Demo re-votes same → should be no-op / same state
        r = requests.post(
            f"{API}/messages/{msg_id}/poll/vote",
            headers=demo_h,
            json={"option_index": 0},
            timeout=10,
        )
        assert r.status_code == 200
        # Only one vote entry for demo
        votes = r.json()["poll"]["votes"]
        assert votes[demo_ctx["user"]["id"]] == 0
        # Vote count for demo stays as 1 entry (upserted)
        assert list(votes.values()).count(0) >= 1

        # Sarah votes option 1
        r = requests.post(
            f"{API}/messages/{msg_id}/poll/vote",
            headers=sarah_h,
            json={"option_index": 1},
            timeout=10,
        )
        assert r.status_code == 200
        votes = r.json()["poll"]["votes"]
        assert votes[demo_ctx["user"]["id"]] == 0
        assert votes[sarah_ctx["user"]["id"]] == 1
        assert len(votes) >= 2

        # Invalid option
        r = requests.post(
            f"{API}/messages/{msg_id}/poll/vote",
            headers=demo_h,
            json={"option_index": 5},
            timeout=10,
        )
        assert r.status_code == 400


# ==================== MATCH RATINGS ====================
class TestMatchRatings:
    def test_rating_flow(self, demo_ctx, sarah_ctx, sample_group_id):
        demo_h = _auth(demo_ctx["token"])
        # Find a match in the group
        r = requests.get(
            f"{API}/groups/{sample_group_id}/matches",
            headers=demo_h,
            timeout=10,
        )
        assert r.status_code == 200
        matches = r.json()
        if not matches:
            pytest.skip("No matches in group")
        match_id = matches[0]["id"]
        sarah_id = sarah_ctx["user"]["id"]
        demo_id = demo_ctx["user"]["id"]

        # Rate sarah
        r = requests.post(
            f"{API}/matches/{match_id}/ratings",
            headers=demo_h,
            json={
                "match_id": match_id,
                "ratings": {
                    sarah_id: {"level": 4, "punctuality": 5, "fairplay": 5}
                },
            },
            timeout=10,
        )
        assert r.status_code in (200, 201), f"rating failed: {r.text}"

        # GET mine — must contain sarah with correct values
        r = requests.get(
            f"{API}/matches/{match_id}/ratings/mine",
            headers=demo_h,
            timeout=10,
        )
        assert r.status_code == 200
        data = r.json()
        assert sarah_id in data, f"missing sarah in {data}"
        assert data[sarah_id]["level"] == 4
        assert data[sarah_id]["punctuality"] == 5
        assert data[sarah_id]["fairplay"] == 5

        # Rate self → server just skips silently (see server.py L1254 continue)
        # Per spec: "Rating self → should 400"
        r = requests.post(
            f"{API}/matches/{match_id}/ratings",
            headers=demo_h,
            json={
                "match_id": match_id,
                "ratings": {
                    demo_id: {"level": 5, "punctuality": 5, "fairplay": 5}
                },
            },
            timeout=10,
        )
        # Current behavior: 200/201 (silently skipped). Record this deviation.
        # We accept 400 or the current silent-skip; verify self rating NOT stored.
        r2 = requests.get(
            f"{API}/matches/{match_id}/ratings/mine",
            headers=demo_h,
            timeout=10,
        )
        assert r2.status_code == 200
        assert demo_id not in r2.json(), "Self rating should not be stored"
        # Flag as issue if server returned 200 instead of 400
        assert r.status_code == 400, (
            f"SPEC deviation: self-rating expected 400, got {r.status_code}"
        )


# ==================== LEAVE GROUP ====================
class TestLeaveGroup:
    def test_leave_as_member(self, leo_ctx, demo_ctx):
        """Leo leaves a group where he is a member (not admin)."""
        leo_h = _auth(leo_ctx["token"])
        # Fetch leo's groups
        r = requests.get(f"{API}/groups/mine/list", headers=leo_h, timeout=10)
        assert r.status_code == 200
        groups = r.json()
        if not groups:
            pytest.skip("Leo has no groups")

        # Find a group where Leo is a member (not admin)
        target_gid = None
        for g in groups:
            r2 = requests.get(f"{API}/groups/{g['id']}/members", headers=leo_h, timeout=10)
            members = r2.json()
            for m in members:
                if m["id"] == leo_ctx["user"]["id"] and m.get("role") != "admin":
                    target_gid = g["id"]
                    break
            if target_gid:
                break
        if not target_gid:
            pytest.skip("Leo is admin everywhere")

        # Leave
        r = requests.post(f"{API}/groups/{target_gid}/leave", headers=leo_h, timeout=10)
        assert r.status_code == 200

        # Confirm no longer member
        r = requests.get(f"{API}/groups/{target_gid}/members", headers=leo_h, timeout=10)
        # Leo shouldn't be in members list anymore (endpoint returns 200 even if not a member)
        # If it 403s, that's also fine (not member)
        if r.status_code == 200:
            member_ids = [m["id"] for m in r.json()]
            assert leo_ctx["user"]["id"] not in member_ids

        # Rejoin so future runs are stable (via direct join request — admin approval needed)
        # Best-effort re-add via API - may fail if approval required.
        requests.post(
            f"{API}/groups/{target_gid}/join",
            headers=leo_h,
            json={"message": "re-add TEST"},
            timeout=10,
        )

    def test_leave_as_admin_behavior(self, demo_ctx):
        """Demo is admin of some groups. Verify what happens on leave."""
        demo_h = _auth(demo_ctx["token"])
        r = requests.get(f"{API}/groups/mine/list", headers=demo_h, timeout=10)
        groups = r.json()
        admin_gid = None
        for g in groups:
            r2 = requests.get(f"{API}/groups/{g['id']}/members", headers=demo_h, timeout=10)
            for m in r2.json():
                if m["id"] == demo_ctx["user"]["id"] and m.get("role") == "admin":
                    admin_gid = g["id"]
                    break
            if admin_gid:
                break
        if not admin_gid:
            pytest.skip("Demo is not admin anywhere")

        # Attempt leave as admin — CURRENT server just deletes the membership without transfer.
        # Test WITHOUT actually leaving (would corrupt seed data). We just document.
        # Instead, verify /groups/{gid}/leave endpoint exists via HEAD/OPTIONS or skip actual call.
        # Skip actual destructive call:
        pytest.skip(
            "Skipping destructive admin-leave test to preserve seed data. "
            "Current server does NOT block admin leave nor transfer admin — issue for main agent."
        )


# ==================== OTP ====================
class TestOTP:
    def test_otp_request_and_verify(self, demo_ctx):
        h = _auth(demo_ctx["token"])
        # Request
        r = requests.post(
            f"{API}/security/otp/request?target=email", headers=h, timeout=10
        )
        assert r.status_code == 200, f"otp request failed: {r.text}"
        assert r.json().get("status") == "sent"

        # Verify with correct code
        r = requests.post(
            f"{API}/security/otp/verify",
            headers=h,
            json={"code": "000000", "target": "email"},
            timeout=10,
        )
        assert r.status_code == 200, f"otp verify failed: {r.text}"
        assert r.json().get("status") == "verified"

        # Wrong code — first re-request otp challenge
        requests.post(
            f"{API}/security/otp/request?target=email", headers=h, timeout=10
        )
        r = requests.post(
            f"{API}/security/otp/verify",
            headers=h,
            json={"code": "999999", "target": "email"},
            timeout=10,
        )
        assert r.status_code == 400

    def test_otp_invalid_target(self, demo_ctx):
        h = _auth(demo_ctx["token"])
        r = requests.post(
            f"{API}/security/otp/request?target=badtarget", headers=h, timeout=10
        )
        assert r.status_code == 400


# ==================== CHANGE PASSWORD ====================
class TestChangePassword:
    def test_change_and_revert(self):
        # Fresh login
        tok, _ = _login(DEMO)
        h = _auth(tok)

        # Change password
        r = requests.post(
            f"{API}/users/me/password",
            headers=h,
            json={"current_password": "demo1234", "new_password": "newpass1"},
            timeout=10,
        )
        assert r.status_code == 200, f"change pw failed: {r.text}"

        # Login with new password
        r = requests.post(
            f"{API}/auth/login",
            json={"email": "demo@matchup.app", "password": "newpass1"},
            timeout=10,
        )
        assert r.status_code == 200, f"login with new pw failed: {r.status_code}"
        new_tok = r.json()["token"]

        # Revert
        r = requests.post(
            f"{API}/users/me/password",
            headers=_auth(new_tok),
            json={"current_password": "newpass1", "new_password": "demo1234"},
            timeout=10,
        )
        assert r.status_code == 200

        # Verify original password works
        r = requests.post(f"{API}/auth/login", json=DEMO, timeout=10)
        assert r.status_code == 200, "revert failed — demo password broken!"

    def test_change_wrong_current(self):
        tok, _ = _login(DEMO)
        r = requests.post(
            f"{API}/users/me/password",
            headers=_auth(tok),
            json={"current_password": "WRONG", "new_password": "abcdef1"},
            timeout=10,
        )
        assert r.status_code == 400
