"""
PitchFinder Backend API
FastAPI + MongoDB - Amateur football community platform
"""
import os
import uuid
import logging
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import List, Optional

import bcrypt
import httpx
from jose import jwt, JWTError
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ============= CONFIG =============
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ.get("JWT_SECRET", "pitchfinder-dev-secret-change-me-in-prod-2026")
JWT_ALGO = "HS256"
JWT_EXPIRE_HOURS = 24 * 30  # 30 days

# Emergent Push relay
PUSH_BASE_URL = "https://integrations.emergentagent.com"
PUSH_KEY = os.environ.get("EMERGENT_PUSH_KEY", "placeholder")
_push_client = httpx.AsyncClient(
    base_url=PUSH_BASE_URL,
    headers={"X-Push-Key": PUSH_KEY},
    timeout=10.0,
)

# Emergent Google Auth
EMERGENT_AUTH_BASE = "https://demobackend.emergentagent.com"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="PitchFinder API")
api = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)


# ============= MODELS =============
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=2)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: str
    email: str
    name: str
    photo: Optional[str] = None
    age: Optional[int] = None
    position: Optional[str] = None  # GK, DEF, MID, FWD
    level: Optional[str] = None  # rookie, intermediate, advanced, elite
    foot: Optional[str] = None  # left, right, both
    city: Optional[str] = None
    radius_km: Optional[int] = None
    bio: Optional[str] = None
    availabilities: List[str] = []
    matches_played: int = 0
    goals: int = 0
    assists: int = 0
    reputation: int = 0
    badges: List[str] = []
    verified: bool = False
    created_at: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    photo: Optional[str] = None
    age: Optional[int] = None
    position: Optional[str] = None
    level: Optional[str] = None
    foot: Optional[str] = None
    city: Optional[str] = None
    radius_km: Optional[int] = None
    bio: Optional[str] = None
    availabilities: Optional[List[str]] = None


class GroupCreate(BaseModel):
    name: str = Field(min_length=2)
    description: str
    photo: Optional[str] = None
    city: str
    level: str  # rookie, intermediate, advanced, elite, mixed
    max_members: int = 20
    preferred_days: List[str] = []  # mon, tue, wed, thu, fri, sat, sun
    positions_needed: List[str] = []  # GK, DEF, MID, FWD


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    photo: Optional[str] = None
    city: Optional[str] = None
    level: Optional[str] = None
    max_members: Optional[int] = None
    preferred_days: Optional[List[str]] = None
    positions_needed: Optional[List[str]] = None


class ReportCreate(BaseModel):
    target_type: str  # user | group
    target_id: str
    reason: str  # spam, harassment, inappropriate, fake, other
    message: Optional[str] = None


class BlockToggle(BaseModel):
    target_type: str  # user | group
    target_id: str


class GroupPublic(BaseModel):
    id: str
    name: str
    description: str
    photo: Optional[str] = None
    city: str
    level: str
    max_members: int
    members_count: int
    distance_km: float
    admin_id: str
    next_match: Optional[dict] = None
    spots_left: int
    created_at: str
    is_member: bool = False


class JoinRequestCreate(BaseModel):
    message: Optional[str] = None


class MessageCreate(BaseModel):
    text: str = Field(min_length=1)


class MessagePublic(BaseModel):
    id: str
    group_id: str
    user_id: str
    user_name: str
    user_photo: Optional[str] = None
    text: str
    created_at: str


class MatchCreate(BaseModel):
    group_id: str
    title: str
    location: str
    date: str  # ISO date
    max_players: int = 10


class MatchPublic(BaseModel):
    id: str
    group_id: str
    title: str
    location: str
    date: str
    max_players: int
    players: List[str] = []
    created_by: str


# ============= AUTH HELPERS =============
def hash_password(pwd: str) -> str:
    return bcrypt.hashpw(pwd.encode(), bcrypt.gensalt()).decode()


def check_password(pwd: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pwd.encode(), hashed.encode())
    except Exception:
        return False


def make_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ============= PUSH HELPERS =============
async def send_push(
    recipients: List[str],
    data: dict,
    idempotency_key: Optional[str] = None,
) -> None:
    """Fire-and-forget push notification via Emergent relay.

    Non-blocking: exceptions are swallowed and logged so business ops never fail
    because of push. Called from event handlers with try/except wrapper too.
    """
    if not recipients:
        return
    if "title" not in data or "message" not in data:
        return
    payload: dict = {"recipients": recipients[:100], "data": data}
    if idempotency_key:
        payload["$idempotency_key"] = idempotency_key
    try:
        resp = await _push_client.post("/api/v1/push/trigger", json=payload)
        if resp.status_code >= 400:
            logger.warning("push trigger %s: %s", resp.status_code, resp.text[:200])
    except Exception as e:
        logger.warning("push send failed: %s", e)


def user_to_public(u: dict) -> dict:
    return {
        "id": u["id"],
        "email": u["email"],
        "name": u["name"],
        "photo": u.get("photo"),
        "age": u.get("age"),
        "position": u.get("position"),
        "level": u.get("level"),
        "foot": u.get("foot"),
        "city": u.get("city"),
        "radius_km": u.get("radius_km"),
        "bio": u.get("bio"),
        "availabilities": u.get("availabilities", []),
        "matches_played": u.get("matches_played", 0),
        "goals": u.get("goals", 0),
        "assists": u.get("assists", 0),
        "reputation": u.get("reputation", 0),
        "badges": u.get("badges", []),
        "verified": u.get("verified", False),
        "created_at": u.get("created_at", ""),
    }


# ============= AUTH ROUTES =============
@api.post("/auth/register")
async def register(body: UserRegister):
    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": user_id,
        "email": body.email.lower(),
        "password_hash": hash_password(body.password),
        "name": body.name,
        "photo": None,
        "age": None,
        "position": None,
        "level": "intermediate",
        "foot": None,
        "city": None,
        "radius_km": 10,
        "bio": None,
        "availabilities": [],
        "matches_played": 0,
        "goals": 0,
        "assists": 0,
        "reputation": 100,
        "badges": ["newcomer"],
        "verified": False,
        "created_at": now,
    }
    await db.users.insert_one(doc)
    token = make_token(user_id)
    return {"token": token, "user": user_to_public(doc)}


@api.post("/auth/login")
async def login(body: UserLogin):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not check_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = make_token(user["id"])
    return {"token": token, "user": user_to_public(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    return user_to_public(user)


class GoogleSessionBody(BaseModel):
    session_id: str


@api.post("/auth/google")
async def google_session(body: GoogleSessionBody):
    """Exchange an Emergent session_id for a PitchFinder JWT.

    Upserts the user by email so repeated Google logins map to the same account.
    """
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.get(
                f"{EMERGENT_AUTH_BASE}/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": body.session_id},
            )
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Auth provider unreachable: {e}")
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google session")
    data = resp.json()
    email = (data.get("email") or "").lower()
    name = data.get("name") or email.split("@")[0]
    picture = data.get("picture")
    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email")

    existing = await db.users.find_one({"email": email})
    if existing:
        # Update picture if we don't have one yet
        if picture and not existing.get("photo"):
            await db.users.update_one({"id": existing["id"]}, {"$set": {"photo": picture}})
        user_id = existing["id"]
    else:
        user_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        doc = {
            "id": user_id,
            "email": email,
            "password_hash": "",  # Google-only user
            "name": name,
            "photo": picture,
            "age": None,
            "position": None,
            "level": "intermediate",
            "foot": None,
            "city": None,
            "radius_km": 10,
            "bio": None,
            "availabilities": [],
            "matches_played": 0,
            "goals": 0,
            "assists": 0,
            "reputation": 100,
            "badges": ["newcomer"],
            "verified": True,  # Google-verified
            "created_at": now,
            "auth_provider": "google",
        }
        await db.users.insert_one(doc)

    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    token = make_token(user_id)
    return {"token": token, "user": user_to_public(user)}


# ============= PUSH REGISTER =============
class RegisterPushBody(BaseModel):
    platform: str
    device_token: str


@api.post("/register-push", status_code=201)
async def register_push(body: RegisterPushBody, user: dict = Depends(current_user)):
    """Register a device token with Emergent push provider for the current user.

    Graceful degrade: if EMERGENT_PUSH_KEY is missing/placeholder, we log and return
    'skipped' so the app can proceed. Real push delivery happens post-deploy when
    the key is injected by the deployment pipeline.
    """
    if not PUSH_KEY or PUSH_KEY == "placeholder":
        logger.info("register_push skipped: push key not configured")
        return {"status": "skipped"}
    try:
        resp = await _push_client.post(
            "/api/v1/push/users/register",
            json={
                "user_id": user["id"],
                "platform": body.platform,
                "device_token": body.device_token,
            },
        )
        if resp.status_code == 401:
            logger.warning("register_push: Emergent push key rejected")
            return {"status": "skipped"}
        if resp.status_code >= 500:
            logger.warning("register_push: provider 5xx %s", resp.status_code)
            return {"status": "skipped"}
        resp.raise_for_status()
    except Exception as e:
        logger.warning("register_push failed: %s", e)
        return {"status": "skipped"}
    return {"status": "registered"}


# ============= USER ROUTES =============
@api.patch("/users/me")
async def update_me(body: UserUpdate, user: dict = Depends(current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return user_to_public(updated)


@api.get("/users/{user_id}")
async def get_user(user_id: str, user: dict = Depends(current_user)):
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return user_to_public(u)


# ============= GROUP ROUTES =============
async def group_to_public(g: dict, user_id: str) -> dict:
    members_count = await db.group_members.count_documents({"group_id": g["id"]})
    next_match = await db.matches.find_one(
        {"group_id": g["id"]},
        {"_id": 0},
        sort=[("date", 1)],
    )
    is_member = await db.group_members.find_one(
        {"group_id": g["id"], "user_id": user_id}
    )
    is_admin = is_member and is_member.get("role") == "admin"
    join_status = "none"
    if is_admin:
        join_status = "admin"
    elif is_member:
        join_status = "member"
    else:
        pending = await db.join_requests.find_one(
            {"group_id": g["id"], "user_id": user_id, "status": "pending"}
        )
        if pending:
            join_status = "pending"
    return {
        "id": g["id"],
        "name": g["name"],
        "description": g["description"],
        "photo": g.get("photo"),
        "city": g["city"],
        "level": g["level"],
        "max_members": g["max_members"],
        "members_count": members_count,
        "distance_km": g.get("distance_km", round(1 + (hash(g["id"]) % 25), 1)),
        "admin_id": g["admin_id"],
        "next_match": next_match,
        "spots_left": max(0, g["max_members"] - members_count),
        "created_at": g["created_at"],
        "is_member": bool(is_member),
        "is_admin": bool(is_admin),
        "join_status": join_status,
        "preferred_days": g.get("preferred_days", []),
        "positions_needed": g.get("positions_needed", []),
    }


async def blocked_ids(user_id: str) -> tuple[set, set]:
    """Return (blocked_user_ids, blocked_group_ids) for a user."""
    blocks = await db.blocks.find({"user_id": user_id}, {"_id": 0}).to_list(500)
    u = {b["target_id"] for b in blocks if b["target_type"] == "user"}
    g = {b["target_id"] for b in blocks if b["target_type"] == "group"}
    return u, g


@api.get("/groups")
async def list_groups(
    q: Optional[str] = None,
    level: Optional[str] = None,
    city: Optional[str] = None,
    radius_km: Optional[float] = None,
    day: Optional[str] = None,
    position: Optional[str] = None,
    sort: Optional[str] = "distance",
    user: dict = Depends(current_user),
):
    query: dict = {}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"city": {"$regex": q, "$options": "i"}},
        ]
    if level and level != "all":
        query["level"] = level
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if day:
        days = [d.strip() for d in day.split(",") if d.strip()]
        if len(days) == 1:
            query["preferred_days"] = days[0]
        elif len(days) > 1:
            query["preferred_days"] = {"$in": days}
    if position and position != "any":
        positions = [p.strip() for p in position.split(",") if p.strip()]
        if len(positions) == 1:
            query["positions_needed"] = positions[0]
        elif len(positions) > 1:
            query["positions_needed"] = {"$in": positions}

    _, blocked_groups = await blocked_ids(user["id"])
    if blocked_groups:
        query["id"] = {"$nin": list(blocked_groups)}

    groups = await db.groups.find(query, {"_id": 0}).to_list(200)
    result = [await group_to_public(g, user["id"]) for g in groups]

    if radius_km is not None:
        result = [r for r in result if r["distance_km"] <= radius_km]

    if sort == "distance":
        result.sort(key=lambda x: x["distance_km"])
    elif sort == "members":
        result.sort(key=lambda x: -x["members_count"])
    elif sort == "recent":
        result.sort(key=lambda x: x["created_at"], reverse=True)
    return result


@api.post("/groups")
async def create_group(body: GroupCreate, user: dict = Depends(current_user)):
    gid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": gid,
        "name": body.name,
        "description": body.description,
        "photo": body.photo,
        "city": body.city,
        "level": body.level,
        "max_members": body.max_members,
        "preferred_days": body.preferred_days,
        "positions_needed": body.positions_needed,
        "admin_id": user["id"],
        "created_at": now,
        "distance_km": 0.0,
    }
    await db.groups.insert_one(doc)
    await db.group_members.insert_one(
        {"group_id": gid, "user_id": user["id"], "role": "admin", "joined_at": now}
    )
    return await group_to_public(doc, user["id"])


@api.patch("/groups/{group_id}")
async def update_group(
    group_id: str, body: GroupUpdate, user: dict = Depends(current_user)
):
    g = await db.groups.find_one({"id": group_id})
    if not g or g["admin_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Admin only")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        await db.groups.update_one({"id": group_id}, {"$set": updates})
    updated = await db.groups.find_one({"id": group_id}, {"_id": 0})
    return await group_to_public(updated, user["id"])


@api.get("/groups/{group_id}")
async def get_group(group_id: str, user: dict = Depends(current_user)):
    g = await db.groups.find_one({"id": group_id}, {"_id": 0})
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    return await group_to_public(g, user["id"])


@api.get("/groups/{group_id}/members")
async def group_members(group_id: str, user: dict = Depends(current_user)):
    members = await db.group_members.find({"group_id": group_id}, {"_id": 0}).to_list(200)
    user_ids = [m["user_id"] for m in members]
    users = await db.users.find(
        {"id": {"$in": user_ids}}, {"_id": 0, "password_hash": 0}
    ).to_list(200)
    users_by_id = {u["id"]: user_to_public(u) for u in users}
    return [
        {**users_by_id[m["user_id"]], "role": m.get("role", "member"), "joined_at": m["joined_at"]}
        for m in members
        if m["user_id"] in users_by_id
    ]


@api.post("/groups/{group_id}/join")
async def request_join_group(
    group_id: str, body: JoinRequestCreate, user: dict = Depends(current_user)
):
    """Create a pending join request. Admin must approve to actually add member."""
    g = await db.groups.find_one({"id": group_id})
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    existing_member = await db.group_members.find_one(
        {"group_id": group_id, "user_id": user["id"]}
    )
    if existing_member:
        raise HTTPException(status_code=400, detail="Already a member")
    existing_pending = await db.join_requests.find_one(
        {"group_id": group_id, "user_id": user["id"], "status": "pending"}
    )
    if existing_pending:
        raise HTTPException(status_code=400, detail="Request already pending")
    doc = {
        "id": str(uuid.uuid4()),
        "group_id": group_id,
        "user_id": user["id"],
        "user_name": user["name"],
        "user_photo": user.get("photo"),
        "message": body.message,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.join_requests.insert_one(doc)
    # Notify admin
    try:
        await send_push(
            recipients=[g["admin_id"]],
            data={
                "title": "Nouvelle demande d'adhésion",
                "message": f"{user['name']} veut rejoindre {g['name']}",
                "action_url": f"/group/{group_id}",
            },
        )
    except Exception as e:
        logger.warning("push failed: %s", e)
    doc.pop("_id", None)
    return {"status": "pending", "request_id": doc["id"]}


@api.get("/groups/{group_id}/join-requests")
async def list_join_requests(group_id: str, user: dict = Depends(current_user)):
    """Admin-only: list pending requests for a group."""
    g = await db.groups.find_one({"id": group_id})
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    if g["admin_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Admin only")
    reqs = await db.join_requests.find(
        {"group_id": group_id, "status": "pending"}, {"_id": 0}
    ).sort("created_at", 1).to_list(200)
    return reqs


@api.post("/groups/{group_id}/join-requests/{req_id}/approve")
async def approve_join_request(
    group_id: str, req_id: str, user: dict = Depends(current_user)
):
    g = await db.groups.find_one({"id": group_id})
    if not g or g["admin_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Admin only")
    req = await db.join_requests.find_one({"id": req_id, "group_id": group_id})
    if not req or req["status"] != "pending":
        raise HTTPException(status_code=404, detail="Request not found")
    now = datetime.now(timezone.utc).isoformat()
    await db.group_members.insert_one(
        {"group_id": group_id, "user_id": req["user_id"], "role": "member", "joined_at": now}
    )
    await db.join_requests.update_one(
        {"id": req_id}, {"$set": {"status": "approved", "resolved_at": now}}
    )
    # Notify the applicant
    try:
        await send_push(
            recipients=[req["user_id"]],
            data={
                "title": f"Bienvenue dans {g['name']} !",
                "message": "Ta demande d'adhésion a été acceptée. À toi de jouer 🔥",
                "action_url": f"/chat/{group_id}",
            },
        )
    except Exception as e:
        logger.warning("push failed: %s", e)
    return {"status": "approved"}


@api.post("/groups/{group_id}/join-requests/{req_id}/reject")
async def reject_join_request(
    group_id: str, req_id: str, user: dict = Depends(current_user)
):
    g = await db.groups.find_one({"id": group_id})
    if not g or g["admin_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Admin only")
    now = datetime.now(timezone.utc).isoformat()
    result = await db.join_requests.update_one(
        {"id": req_id, "group_id": group_id, "status": "pending"},
        {"$set": {"status": "rejected", "resolved_at": now}},
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"status": "rejected"}


@api.post("/groups/{group_id}/join-requests/cancel")
async def cancel_my_join_request(group_id: str, user: dict = Depends(current_user)):
    """User can cancel their own pending request."""
    now = datetime.now(timezone.utc).isoformat()
    await db.join_requests.update_many(
        {"group_id": group_id, "user_id": user["id"], "status": "pending"},
        {"$set": {"status": "cancelled", "resolved_at": now}},
    )
    return {"status": "cancelled"}


@api.post("/groups/{group_id}/leave")
async def leave_group(group_id: str, user: dict = Depends(current_user)):
    await db.group_members.delete_one({"group_id": group_id, "user_id": user["id"]})
    return {"status": "left"}


@api.get("/groups/mine/list")
async def my_groups(user: dict = Depends(current_user)):
    memberships = await db.group_members.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).to_list(200)
    gids = [m["group_id"] for m in memberships]
    groups = await db.groups.find({"id": {"$in": gids}}, {"_id": 0}).to_list(200)
    return [await group_to_public(g, user["id"]) for g in groups]


# ============= MESSAGES =============
@api.get("/groups/{group_id}/messages")
async def get_messages(group_id: str, user: dict = Depends(current_user)):
    is_member = await db.group_members.find_one(
        {"group_id": group_id, "user_id": user["id"]}
    )
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a group member")
    blocked_users, _ = await blocked_ids(user["id"])
    q: dict = {"group_id": group_id}
    if blocked_users:
        q["user_id"] = {"$nin": list(blocked_users)}
    msgs = await db.messages.find(q, {"_id": 0}).sort("created_at", 1).to_list(500)
    return msgs


@api.post("/groups/{group_id}/messages")
async def send_message(
    group_id: str, body: MessageCreate, user: dict = Depends(current_user)
):
    is_member = await db.group_members.find_one(
        {"group_id": group_id, "user_id": user["id"]}
    )
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a group member")
    doc = {
        "id": str(uuid.uuid4()),
        "group_id": group_id,
        "user_id": user["id"],
        "user_name": user["name"],
        "user_photo": user.get("photo"),
        "text": body.text,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.messages.insert_one(doc)
    doc.pop("_id", None)
    # Notify other members
    try:
        members = await db.group_members.find(
            {"group_id": group_id, "user_id": {"$ne": user["id"]}}, {"_id": 0, "user_id": 1}
        ).to_list(200)
        group = await db.groups.find_one({"id": group_id}, {"_id": 0, "name": 1})
        preview = body.text[:80] + ("…" if len(body.text) > 80 else "")
        await send_push(
            recipients=[m["user_id"] for m in members],
            data={
                "title": f"{user['name']} · {group['name'] if group else 'PitchFinder'}",
                "message": preview,
                "action_url": f"/chat/{group_id}",
            },
        )
    except Exception as e:
        logger.warning("push failed: %s", e)
    return doc


# ============= MATCHES =============
async def match_to_public(m: dict) -> dict:
    """Enrich match with member details for RSVP/team views."""
    uids = list(set(
        m.get("players", [])
        + m.get("teams", {}).get("a", [])
        + m.get("teams", {}).get("b", [])
        + m.get("teams", {}).get("bench", [])
        + list(m.get("rsvps", {}).keys())
    ))
    users_map: dict = {}
    if uids:
        users = await db.users.find(
            {"id": {"$in": uids}}, {"_id": 0, "id": 1, "name": 1, "photo": 1, "position": 1}
        ).to_list(200)
        users_map = {u["id"]: u for u in users}
    return {
        "id": m["id"],
        "group_id": m["group_id"],
        "title": m["title"],
        "location": m["location"],
        "date": m["date"],
        "max_players": m["max_players"],
        "players": m.get("players", []),
        "created_by": m.get("created_by"),
        "rsvps": m.get("rsvps", {}),
        "teams": m.get("teams", {"a": [], "b": [], "bench": []}),
        "users": users_map,
    }


@api.get("/groups/{group_id}/matches")
async def list_matches(group_id: str, user: dict = Depends(current_user)):
    matches = await db.matches.find({"group_id": group_id}, {"_id": 0}).sort("date", 1).to_list(200)
    return matches


@api.get("/matches/{match_id}")
async def get_match(match_id: str, user: dict = Depends(current_user)):
    m = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")
    return await match_to_public(m)


@api.post("/matches")
async def create_match(body: MatchCreate, user: dict = Depends(current_user)):
    is_member = await db.group_members.find_one(
        {"group_id": body.group_id, "user_id": user["id"]}
    )
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a group member")
    doc = {
        "id": str(uuid.uuid4()),
        "group_id": body.group_id,
        "title": body.title,
        "location": body.location,
        "date": body.date,
        "max_players": body.max_players,
        "players": [user["id"]],
        "rsvps": {user["id"]: "going"},
        "teams": {"a": [], "b": [], "bench": []},
        "created_by": user["id"],
    }
    await db.matches.insert_one(doc)
    doc.pop("_id", None)
    # Notify group members
    try:
        members = await db.group_members.find(
            {"group_id": body.group_id, "user_id": {"$ne": user["id"]}}, {"_id": 0, "user_id": 1}
        ).to_list(200)
        await send_push(
            recipients=[m["user_id"] for m in members],
            data={
                "title": "Nouveau match programmé",
                "message": f"{body.title} · {body.location}",
                "action_url": f"/match/{doc['id']}",
            },
        )
    except Exception as e:
        logger.warning("push failed: %s", e)
    return doc


class RsvpBody(BaseModel):
    status: str  # going | maybe | decline


@api.post("/matches/{match_id}/rsvp")
async def rsvp_match(match_id: str, body: RsvpBody, user: dict = Depends(current_user)):
    if body.status not in ("going", "maybe", "decline"):
        raise HTTPException(status_code=400, detail="Invalid RSVP status")
    m = await db.matches.find_one({"id": match_id})
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")
    is_member = await db.group_members.find_one(
        {"group_id": m["group_id"], "user_id": user["id"]}
    )
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a group member")
    updates: dict = {f"rsvps.{user['id']}": body.status}
    if body.status == "going":
        await db.matches.update_one(
            {"id": match_id}, {"$addToSet": {"players": user["id"]}, "$set": updates}
        )
    else:
        await db.matches.update_one(
            {"id": match_id}, {"$pull": {"players": user["id"]}, "$set": updates}
        )
        # Also remove from teams
        await db.matches.update_one(
            {"id": match_id},
            {"$pull": {"teams.a": user["id"], "teams.b": user["id"], "teams.bench": user["id"]}},
        )
    return {"status": body.status}


class TeamBody(BaseModel):
    user_id: str
    team: str  # a | b | bench | none


@api.post("/matches/{match_id}/team")
async def assign_team(match_id: str, body: TeamBody, user: dict = Depends(current_user)):
    if body.team not in ("a", "b", "bench", "none"):
        raise HTTPException(status_code=400, detail="Invalid team")
    m = await db.matches.find_one({"id": match_id})
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")
    group = await db.groups.find_one({"id": m["group_id"]})
    if not group or group["admin_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Admin only")
    # Remove from all teams first
    await db.matches.update_one(
        {"id": match_id},
        {"$pull": {"teams.a": body.user_id, "teams.b": body.user_id, "teams.bench": body.user_id}},
    )
    if body.team != "none":
        await db.matches.update_one(
            {"id": match_id}, {"$addToSet": {f"teams.{body.team}": body.user_id}}
        )
    return {"status": "ok"}


@api.post("/matches/{match_id}/join")
async def join_match(match_id: str, user: dict = Depends(current_user)):
    m = await db.matches.find_one({"id": match_id})
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")
    if user["id"] in m.get("players", []):
        return {"status": "already joined"}
    if len(m.get("players", [])) >= m["max_players"]:
        raise HTTPException(status_code=400, detail="Match full")
    await db.matches.update_one(
        {"id": match_id},
        {"$push": {"players": user["id"]}, "$set": {f"rsvps.{user['id']}": "going"}},
    )
    return {"status": "joined"}


@api.post("/matches/{match_id}/leave")
async def leave_match(match_id: str, user: dict = Depends(current_user)):
    await db.matches.update_one(
        {"id": match_id},
        {
            "$pull": {
                "players": user["id"],
                "teams.a": user["id"],
                "teams.b": user["id"],
                "teams.bench": user["id"],
            },
            "$set": {f"rsvps.{user['id']}": "decline"},
        },
    )
    return {"status": "left"}


# ============= REPORTS & BLOCKS =============
@api.post("/reports", status_code=201)
async def create_report(body: ReportCreate, user: dict = Depends(current_user)):
    if body.target_type not in ("user", "group"):
        raise HTTPException(400, "Invalid target_type")
    if body.reason not in ("spam", "harassment", "inappropriate", "fake", "other"):
        raise HTTPException(400, "Invalid reason")
    if body.target_type == "user" and body.target_id == user["id"]:
        raise HTTPException(400, "Cannot report yourself")
    doc = {
        "id": str(uuid.uuid4()),
        "reporter_id": user["id"],
        "target_type": body.target_type,
        "target_id": body.target_id,
        "reason": body.reason,
        "message": body.message,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.reports.insert_one(doc)
    doc.pop("_id", None)
    return {"status": "submitted", "id": doc["id"]}


@api.post("/blocks", status_code=201)
async def block(body: BlockToggle, user: dict = Depends(current_user)):
    if body.target_type not in ("user", "group"):
        raise HTTPException(400, "Invalid target_type")
    if body.target_type == "user" and body.target_id == user["id"]:
        raise HTTPException(400, "Cannot block yourself")
    await db.blocks.update_one(
        {"user_id": user["id"], "target_type": body.target_type, "target_id": body.target_id},
        {"$set": {
            "user_id": user["id"],
            "target_type": body.target_type,
            "target_id": body.target_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"status": "blocked"}


@api.delete("/blocks/{target_type}/{target_id}")
async def unblock(target_type: str, target_id: str, user: dict = Depends(current_user)):
    if target_type not in ("user", "group"):
        raise HTTPException(400, "Invalid target_type")
    await db.blocks.delete_one(
        {"user_id": user["id"], "target_type": target_type, "target_id": target_id}
    )
    return {"status": "unblocked"}


@api.get("/blocks")
async def list_blocks(user: dict = Depends(current_user)):
    blocks = await db.blocks.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    user_ids = [b["target_id"] for b in blocks if b["target_type"] == "user"]
    group_ids = [b["target_id"] for b in blocks if b["target_type"] == "group"]
    users_map = {}
    groups_map = {}
    if user_ids:
        users = await db.users.find(
            {"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "name": 1, "photo": 1}
        ).to_list(500)
        users_map = {u["id"]: u for u in users}
    if group_ids:
        groups = await db.groups.find(
            {"id": {"$in": group_ids}}, {"_id": 0, "id": 1, "name": 1, "photo": 1, "city": 1}
        ).to_list(500)
        groups_map = {g["id"]: g for g in groups}
    return [
        {
            **b,
            "target": users_map.get(b["target_id"]) if b["target_type"] == "user" else groups_map.get(b["target_id"]),
        }
        for b in blocks
    ]


# ============= SEED =============
@api.post("/seed")
async def seed_data():
    """Idempotent seed for demo data."""
    # Check if already seeded
    existing = await db.groups.count_documents({})
    if existing > 0:
        return {"status": "already seeded", "groups": existing}

    now = datetime.now(timezone.utc).isoformat()

    # Demo users
    demo_users = [
        {
            "email": "demo@pitchfinder.app",
            "password": "demo1234",
            "name": "Alex Martin",
            "position": "MID",
            "level": "intermediate",
            "foot": "right",
            "city": "Paris",
            "age": 27,
            "bio": "Amateur passionné, dispo les soirs et weekends. Milieu box-to-box, j'adore les longs ballons.",
            "photo": "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400",
            "matches_played": 42,
            "goals": 8,
            "assists": 15,
            "reputation": 850,
            "badges": ["playmaker", "captain", "veteran"],
        },
        {
            "email": "sarah@pitchfinder.app",
            "password": "demo1234",
            "name": "Sarah Ndiaye",
            "position": "FWD",
            "level": "advanced",
            "foot": "left",
            "city": "Paris",
            "age": 24,
            "photo": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
            "matches_played": 65,
            "goals": 47,
            "assists": 12,
            "reputation": 1240,
            "badges": ["top-scorer", "elite", "verified"],
            "verified": True,
        },
        {
            "email": "leo@pitchfinder.app",
            "password": "demo1234",
            "name": "Léo Dubois",
            "position": "DEF",
            "level": "intermediate",
            "foot": "right",
            "city": "Paris",
            "age": 30,
            "photo": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
            "matches_played": 28,
            "goals": 2,
            "assists": 5,
            "reputation": 720,
            "badges": ["wall", "reliable"],
        },
        {
            "email": "tom@pitchfinder.app",
            "password": "demo1234",
            "name": "Tom Garcia",
            "position": "GK",
            "level": "advanced",
            "foot": "right",
            "city": "Paris",
            "age": 26,
            "photo": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
            "matches_played": 55,
            "goals": 0,
            "assists": 3,
            "reputation": 980,
            "badges": ["cleansheet", "hands-of-steel"],
        },
    ]

    user_ids = {}
    for u in demo_users:
        uid = str(uuid.uuid4())
        user_ids[u["email"]] = uid
        doc = {
            "id": uid,
            "email": u["email"],
            "password_hash": hash_password(u["password"]),
            "name": u["name"],
            "photo": u["photo"],
            "age": u["age"],
            "position": u["position"],
            "level": u["level"],
            "foot": u["foot"],
            "city": u["city"],
            "radius_km": 15,
            "bio": u.get("bio", "Prêt pour le prochain match !"),
            "availabilities": ["evening", "weekend"],
            "matches_played": u["matches_played"],
            "goals": u["goals"],
            "assists": u["assists"],
            "reputation": u["reputation"],
            "badges": u["badges"],
            "verified": u.get("verified", False),
            "created_at": now,
        }
        await db.users.insert_one(doc)

    # Demo groups
    demo_groups = [
        {
            "name": "Les Titans du 11ème",
            "description": "Groupe convivial pour matchs 5v5 et 7v7 à Paris Est. On joue tous les mardis et jeudis soirs. Bonne ambiance, tous niveaux acceptés.",
            "photo": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800",
            "city": "Paris 11",
            "level": "intermediate",
            "max_members": 20,
            "distance_km": 1.2,
            "preferred_days": ["tue", "thu"],
            "positions_needed": ["FWD", "MID"],
        },
        {
            "name": "FC République",
            "description": "Foot du dimanche matin à République. Match 8v8 sur terrain synthétique. Niveau intermédiaire à avancé.",
            "photo": "https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?w=800",
            "city": "Paris 3",
            "level": "advanced",
            "max_members": 18,
            "distance_km": 2.4,
            "preferred_days": ["sun"],
            "positions_needed": ["GK", "DEF"],
        },
        {
            "name": "Bastille United",
            "description": "Petit collectif de passionnés basé à Bastille. Match hebdo tous les samedis matins. 7v7 en salle. Places limitées !",
            "photo": "https://images.unsplash.com/photo-1459865264687-595d652de67e?w=800",
            "city": "Paris 12",
            "level": "advanced",
            "max_members": 16,
            "distance_km": 3.1,
            "preferred_days": ["sat"],
            "positions_needed": ["MID"],
        },
        {
            "name": "Les Débutants du Sud",
            "description": "100% débutants ou reprise du foot. On apprend, on rigole, on progresse ensemble. Aucun jugement.",
            "photo": "https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=800",
            "city": "Paris 13",
            "level": "rookie",
            "max_members": 25,
            "distance_km": 5.8,
            "preferred_days": ["wed", "sat", "sun"],
            "positions_needed": ["GK", "DEF", "MID", "FWD"],
        },
        {
            "name": "Elite Paris FC",
            "description": "Équipe compétitive pour matchs 11v11 sur pelouse. Niveau régional/départemental minimum. Entraînement obligatoire.",
            "photo": "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800",
            "city": "Paris 15",
            "level": "elite",
            "max_members": 22,
            "distance_km": 7.2,
            "preferred_days": ["sat", "sun"],
            "positions_needed": ["GK"],
        },
        {
            "name": "Mixed Vibes",
            "description": "Groupe mixte tous niveaux, ambiance chill. Foot 5v5 en semaine, apéro après le match.",
            "photo": "https://images.unsplash.com/photo-1526232761682-d26e03ac148e?w=800",
            "city": "Paris 20",
            "level": "mixed",
            "max_members": 20,
            "distance_km": 4.5,
            "preferred_days": ["mon", "wed", "fri"],
            "positions_needed": ["MID", "FWD"],
        },
        {
            "name": "Cité Universitaire FC",
            "description": "Étudiants et jeunes actifs, foot tous les mercredis soirs et dimanches. Rejoins-nous après ta journée !",
            "photo": "https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?w=800",
            "city": "Paris 14",
            "level": "intermediate",
            "max_members": 24,
            "distance_km": 6.1,
            "preferred_days": ["wed", "sun"],
            "positions_needed": ["DEF", "MID"],
        },
        {
            "name": "Old School Kickers",
            "description": "35+ vétérans, foot loisir sans blessure. Le plaisir d'abord. Match dominical à Vincennes.",
            "photo": "https://images.unsplash.com/photo-1602273660127-a0000560a4c1?w=800",
            "city": "Vincennes",
            "level": "intermediate",
            "max_members": 18,
            "distance_km": 8.9,
            "preferred_days": ["sun"],
            "positions_needed": ["FWD"],
        },
    ]

    admins_pool = list(user_ids.values())
    for i, g in enumerate(demo_groups):
        gid = str(uuid.uuid4())
        group_admin = admins_pool[i % len(admins_pool)]
        doc = {
            "id": gid,
            "admin_id": group_admin,
            "created_at": now,
            **g,
        }
        await db.groups.insert_one(doc)
        # Admin auto member
        await db.group_members.insert_one(
            {"group_id": gid, "user_id": group_admin, "role": "admin", "joined_at": now}
        )
        # Add a few other members
        for uid in admins_pool:
            if uid != group_admin and (hash(gid + uid) % 3) != 0:
                await db.group_members.insert_one(
                    {"group_id": gid, "user_id": uid, "role": "member", "joined_at": now}
                )

        # Sample next match
        future = (datetime.now(timezone.utc) + timedelta(days=(i % 7) + 1)).isoformat()
        match_doc = {
            "id": str(uuid.uuid4()),
            "group_id": gid,
            "title": ["Match du mardi", "Foot du dimanche", "Match 5v5", "Séance hebdo"][i % 4],
            "location": ["Stade Léo Lagrange", "City Foot République", "Urban Soccer Bastille", "Stade Charléty"][i % 4],
            "date": future,
            "max_players": 12,
            "players": admins_pool[:3],
            "created_by": group_admin,
        }
        await db.matches.insert_one(match_doc)

        # Some welcome messages
        welcome_msgs = [
            (group_admin, "Bienvenue dans le groupe ! On se voit sur le terrain 💪"),
            (admins_pool[(i + 1) % 4], "Hâte du prochain match !"),
            (admins_pool[(i + 2) % 4], "Qui vient mardi soir ?"),
        ]
        for j, (uid, txt) in enumerate(welcome_msgs):
            user_data = await db.users.find_one({"id": uid})
            await db.messages.insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "group_id": gid,
                    "user_id": uid,
                    "user_name": user_data["name"],
                    "user_photo": user_data.get("photo"),
                    "text": txt,
                    "created_at": (datetime.now(timezone.utc) - timedelta(hours=(3 - j))).isoformat(),
                }
            )

    return {"status": "seeded", "users": len(demo_users), "groups": len(demo_groups)}


@api.get("/")
async def root():
    return {"app": "PitchFinder", "version": "1.0.0"}


# ============= REGISTER =============
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("pitchfinder")


@app.on_event("startup")
async def on_startup():
    # Auto-seed on startup
    try:
        count = await db.groups.count_documents({})
        if count == 0:
            logger.info("Auto-seeding demo data...")
            await seed_data()
    except Exception as e:
        logger.warning("Auto-seed skipped: %s", e)


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
