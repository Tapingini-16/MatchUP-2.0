"""
PitchFinder V2 backend tests
Covers: join requests + approval flow, match RSVP + teams, Google auth 401, push registration.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://free-geoloc-app.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@pitchfinder.app"
DEMO_PASSWORD = "demo1234"


# ---------------- FIXTURES ----------------
@pytest.fixture(scope="module")
def demo_headers():
    r = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="module")
def demo_user_id(demo_headers):
    r = requests.get(f"{API}/auth/me", headers=demo_headers)
    return r.json()["id"]


@pytest.fixture(scope="module")
def fresh_user():
    email = f"testv2_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": "pass1234", "name": "TEST V2 User"}, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    return {"token": d["token"], "user": d["user"], "headers": {"Authorization": f"Bearer {d['token']}"}}


@pytest.fixture(scope="module")
def demo_admin_group(demo_headers, demo_user_id):
    """A group where demo is admin (create one so we have full control)."""
    payload = {
        "name": f"TEST V2 Group {uuid.uuid4().hex[:6]}",
        "description": "V2 test group",
        "city": "Paris",
        "level": "mixed",
        "max_members": 12,
    }
    r = requests.post(f"{API}/groups", json=payload, headers=demo_headers)
    assert r.status_code == 200, r.text
    g = r.json()
    assert g["admin_id"] == demo_user_id
    assert g["is_admin"] is True
    assert g["join_status"] == "admin"
    return g


# ---------------- JOIN REQUESTS ----------------
class TestJoinRequests:
    def test_join_creates_pending_request(self, demo_admin_group, fresh_user):
        gid = demo_admin_group["id"]
        r = requests.post(f"{API}/groups/{gid}/join", json={"message": "hi"}, headers=fresh_user["headers"])
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "pending"
        assert "request_id" in d

    def test_join_status_pending_for_applicant(self, demo_admin_group, fresh_user):
        gid = demo_admin_group["id"]
        r = requests.get(f"{API}/groups/{gid}", headers=fresh_user["headers"])
        assert r.status_code == 200
        d = r.json()
        assert d["join_status"] == "pending"
        assert d["is_member"] is False
        assert d["is_admin"] is False

    def test_duplicate_join_request_400(self, demo_admin_group, fresh_user):
        gid = demo_admin_group["id"]
        r = requests.post(f"{API}/groups/{gid}/join", json={"message": "again"}, headers=fresh_user["headers"])
        assert r.status_code == 400

    def test_admin_lists_pending_requests(self, demo_admin_group, demo_headers, fresh_user):
        gid = demo_admin_group["id"]
        r = requests.get(f"{API}/groups/{gid}/join-requests", headers=demo_headers)
        assert r.status_code == 200
        reqs = r.json()
        assert isinstance(reqs, list) and len(reqs) >= 1
        matching = [x for x in reqs if x["user_id"] == fresh_user["user"]["id"]]
        assert matching, f"applicant not in list: {reqs}"
        assert matching[0]["status"] == "pending"
        assert "user_name" in matching[0]

    def test_non_admin_list_requests_403(self, demo_admin_group, fresh_user):
        gid = demo_admin_group["id"]
        r = requests.get(f"{API}/groups/{gid}/join-requests", headers=fresh_user["headers"])
        assert r.status_code == 403

    def test_cancel_request(self, demo_admin_group, demo_headers):
        """Create a second applicant, cancel their request, verify not in list."""
        email = f"testcancel_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/register", json={"email": email, "password": "pass1234", "name": "TEST Cancel"})
        assert r.status_code == 200
        u_hdr = {"Authorization": f"Bearer {r.json()['token']}"}

        gid = demo_admin_group["id"]
        r2 = requests.post(f"{API}/groups/{gid}/join", json={}, headers=u_hdr)
        assert r2.status_code == 200

        r3 = requests.post(f"{API}/groups/{gid}/join-requests/cancel", json={}, headers=u_hdr)
        assert r3.status_code == 200
        assert r3.json()["status"] == "cancelled"

        r4 = requests.get(f"{API}/groups/{gid}", headers=u_hdr)
        assert r4.json()["join_status"] == "none"

    def test_reject_request(self, demo_admin_group, demo_headers):
        """New applicant → admin rejects → verify status."""
        email = f"testrej_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/register", json={"email": email, "password": "pass1234", "name": "TEST Reject"})
        u_hdr = {"Authorization": f"Bearer {r.json()['token']}"}

        gid = demo_admin_group["id"]
        r2 = requests.post(f"{API}/groups/{gid}/join", json={}, headers=u_hdr)
        req_id = r2.json()["request_id"]

        # Non-admin cannot reject
        rx = requests.post(f"{API}/groups/{gid}/join-requests/{req_id}/reject", headers=u_hdr)
        assert rx.status_code == 403

        r3 = requests.post(f"{API}/groups/{gid}/join-requests/{req_id}/reject", headers=demo_headers)
        assert r3.status_code == 200
        assert r3.json()["status"] == "rejected"

        # applicant not member
        r4 = requests.get(f"{API}/groups/{gid}", headers=u_hdr)
        assert r4.json()["is_member"] is False

    def test_approve_request_makes_member(self, demo_admin_group, demo_headers, fresh_user):
        """Approve the earlier fresh_user pending request."""
        gid = demo_admin_group["id"]
        # Find req_id
        r = requests.get(f"{API}/groups/{gid}/join-requests", headers=demo_headers)
        reqs = [x for x in r.json() if x["user_id"] == fresh_user["user"]["id"]]
        assert reqs, "fresh_user has no pending request"
        req_id = reqs[0]["id"]

        # Non-admin approve → 403
        rx = requests.post(f"{API}/groups/{gid}/join-requests/{req_id}/approve", headers=fresh_user["headers"])
        assert rx.status_code == 403

        r2 = requests.post(f"{API}/groups/{gid}/join-requests/{req_id}/approve", headers=demo_headers)
        assert r2.status_code == 200
        assert r2.json()["status"] == "approved"

        # Verify user is now member
        r3 = requests.get(f"{API}/groups/{gid}", headers=fresh_user["headers"])
        assert r3.status_code == 200
        d = r3.json()
        assert d["is_member"] is True
        assert d["join_status"] == "member"

    def test_already_member_join_400(self, demo_admin_group, fresh_user):
        gid = demo_admin_group["id"]
        r = requests.post(f"{API}/groups/{gid}/join", json={}, headers=fresh_user["headers"])
        assert r.status_code == 400


# ---------------- MATCHES V2 ----------------
class TestMatchesV2:
    @pytest.fixture(scope="class")
    def match_ctx(self, demo_headers, demo_user_id):
        # Create a group + match with demo as admin
        gname = f"TEST V2 Match Grp {uuid.uuid4().hex[:6]}"
        rg = requests.post(f"{API}/groups", json={
            "name": gname, "description": "m", "city": "Paris", "level": "mixed", "max_members": 20
        }, headers=demo_headers)
        assert rg.status_code == 200
        gid = rg.json()["id"]

        # Add sarah as second member so we can assign teams
        r_sarah = requests.post(f"{API}/auth/login", json={"email": "sarah@pitchfinder.app", "password": "demo1234"})
        sarah_hdr = {"Authorization": f"Bearer {r_sarah.json()['token']}"}
        sarah_id = r_sarah.json()["user"]["id"]
        # sarah requests join, demo approves
        rjr = requests.post(f"{API}/groups/{gid}/join", json={}, headers=sarah_hdr)
        req_id = rjr.json()["request_id"]
        requests.post(f"{API}/groups/{gid}/join-requests/{req_id}/approve", headers=demo_headers)

        # Create match
        rm = requests.post(f"{API}/matches", json={
            "group_id": gid, "title": "TEST V2 Match", "location": "Stade", "date": "2030-01-15T18:00:00Z", "max_players": 10
        }, headers=demo_headers)
        assert rm.status_code == 200, rm.text
        mid = rm.json()["id"]
        return {"gid": gid, "mid": mid, "sarah_hdr": sarah_hdr, "sarah_id": sarah_id, "demo_id": demo_user_id}

    def test_get_match_returns_v2_fields(self, demo_headers, match_ctx):
        r = requests.get(f"{API}/matches/{match_ctx['mid']}", headers=demo_headers)
        assert r.status_code == 200
        m = r.json()
        for k in ("id", "rsvps", "teams", "users", "players"):
            assert k in m, f"missing {k}"
        assert isinstance(m["teams"].get("a"), list)
        assert isinstance(m["teams"].get("b"), list)
        assert isinstance(m["teams"].get("bench"), list)
        # creator is auto going
        assert m["rsvps"].get(match_ctx["demo_id"]) == "going"
        assert match_ctx["demo_id"] in m["players"]
        # users map populated
        assert match_ctx["demo_id"] in m["users"]

    def test_rsvp_going(self, match_ctx):
        r = requests.post(f"{API}/matches/{match_ctx['mid']}/rsvp", json={"status": "going"}, headers=match_ctx["sarah_hdr"])
        assert r.status_code == 200
        r2 = requests.get(f"{API}/matches/{match_ctx['mid']}", headers=match_ctx["sarah_hdr"])
        m = r2.json()
        assert m["rsvps"][match_ctx["sarah_id"]] == "going"
        assert match_ctx["sarah_id"] in m["players"]

    def test_rsvp_maybe_removes_from_players(self, match_ctx):
        # First put sarah in team a via admin
        requests.post(f"{API}/matches/{match_ctx['mid']}/team", json={"user_id": match_ctx["sarah_id"], "team": "a"}, headers={"Authorization": match_ctx["sarah_hdr"]["Authorization"].replace(match_ctx["sarah_hdr"]["Authorization"], "")} )
        # actually reset via demo admin
        demo_login = requests.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
        dhdr = {"Authorization": f"Bearer {demo_login.json()['token']}"}
        requests.post(f"{API}/matches/{match_ctx['mid']}/team", json={"user_id": match_ctx["sarah_id"], "team": "a"}, headers=dhdr)
        # Sarah declines
        r = requests.post(f"{API}/matches/{match_ctx['mid']}/rsvp", json={"status": "maybe"}, headers=match_ctx["sarah_hdr"])
        assert r.status_code == 200
        r2 = requests.get(f"{API}/matches/{match_ctx['mid']}", headers=match_ctx["sarah_hdr"])
        m = r2.json()
        assert m["rsvps"][match_ctx["sarah_id"]] == "maybe"
        assert match_ctx["sarah_id"] not in m["players"]
        # Removed from teams too
        assert match_ctx["sarah_id"] not in m["teams"]["a"]
        assert match_ctx["sarah_id"] not in m["teams"]["b"]
        assert match_ctx["sarah_id"] not in m["teams"]["bench"]

    def test_rsvp_invalid_status_400(self, demo_headers, match_ctx):
        r = requests.post(f"{API}/matches/{match_ctx['mid']}/rsvp", json={"status": "wtf"}, headers=demo_headers)
        assert r.status_code == 400

    def test_admin_assigns_team(self, demo_headers, match_ctx):
        # First re-rsvp sarah going
        requests.post(f"{API}/matches/{match_ctx['mid']}/rsvp", json={"status": "going"}, headers=match_ctx["sarah_hdr"])
        r = requests.post(f"{API}/matches/{match_ctx['mid']}/team",
                          json={"user_id": match_ctx["sarah_id"], "team": "b"}, headers=demo_headers)
        assert r.status_code == 200
        r2 = requests.get(f"{API}/matches/{match_ctx['mid']}", headers=demo_headers)
        m = r2.json()
        assert match_ctx["sarah_id"] in m["teams"]["b"]
        assert match_ctx["sarah_id"] not in m["teams"]["a"]

    def test_team_reassign_removes_from_prev(self, demo_headers, match_ctx):
        r = requests.post(f"{API}/matches/{match_ctx['mid']}/team",
                          json={"user_id": match_ctx["sarah_id"], "team": "a"}, headers=demo_headers)
        assert r.status_code == 200
        m = requests.get(f"{API}/matches/{match_ctx['mid']}", headers=demo_headers).json()
        assert match_ctx["sarah_id"] in m["teams"]["a"]
        assert match_ctx["sarah_id"] not in m["teams"]["b"]

    def test_team_none_removes_all(self, demo_headers, match_ctx):
        r = requests.post(f"{API}/matches/{match_ctx['mid']}/team",
                          json={"user_id": match_ctx["sarah_id"], "team": "none"}, headers=demo_headers)
        assert r.status_code == 200
        m = requests.get(f"{API}/matches/{match_ctx['mid']}", headers=demo_headers).json()
        assert match_ctx["sarah_id"] not in m["teams"]["a"]
        assert match_ctx["sarah_id"] not in m["teams"]["b"]
        assert match_ctx["sarah_id"] not in m["teams"]["bench"]

    def test_non_admin_team_403(self, match_ctx):
        r = requests.post(f"{API}/matches/{match_ctx['mid']}/team",
                          json={"user_id": match_ctx["sarah_id"], "team": "a"}, headers=match_ctx["sarah_hdr"])
        assert r.status_code == 403


# ---------------- GOOGLE AUTH ----------------
class TestGoogleAuth:
    def test_google_invalid_session_401_or_502(self):
        """With a fake session_id, Emergent provider will reject → 401 (or 502 if unreachable)."""
        r = requests.post(f"{API}/auth/google", json={"session_id": "fake-invalid-session-xxx"}, timeout=20)
        # Accept 401 (Invalid Google session) — spec expected value.
        # Allow 502 fallback if provider unreachable in preview; log otherwise.
        assert r.status_code in (401, 502), f"unexpected {r.status_code}: {r.text}"


# ---------------- PUSH ----------------
class TestPush:
    def test_register_push_no_500(self, demo_headers):
        """With placeholder key, endpoint must NOT return 500 — either 201 or graceful."""
        r = requests.post(
            f"{API}/register-push",
            json={"platform": "ios", "device_token": f"tok_{uuid.uuid4().hex}"},
            headers=demo_headers,
            timeout=15,
        )
        # spec: should be 201 or graceful. 500 = failure to graceful-degrade.
        assert r.status_code != 500, f"push endpoint 500'd — should graceful degrade. body={r.text}"
        assert r.status_code == 201

    def test_register_push_unauth_401(self):
        r = requests.post(f"{API}/register-push", json={"platform": "ios", "device_token": "x"})
        assert r.status_code == 401
