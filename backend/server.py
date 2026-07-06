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
    ) is not None
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
        "is_member": is_member,
    }


@api.get("/groups")
async def list_groups(
    q: Optional[str] = None,
    level: Optional[str] = None,
    city: Optional[str] = None,
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

    groups = await db.groups.find(query, {"_id": 0}).to_list(200)
    result = [await group_to_public(g, user["id"]) for g in groups]

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
        "admin_id": user["id"],
        "created_at": now,
        "distance_km": 0.0,
    }
    await db.groups.insert_one(doc)
    await db.group_members.insert_one(
        {"group_id": gid, "user_id": user["id"], "role": "admin", "joined_at": now}
    )
    return await group_to_public(doc, user["id"])


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
async def join_group(
    group_id: str, body: JoinRequestCreate, user: dict = Depends(current_user)
):
    g = await db.groups.find_one({"id": group_id})
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    existing = await db.group_members.find_one(
        {"group_id": group_id, "user_id": user["id"]}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already a member")
    now = datetime.now(timezone.utc).isoformat()
    # For MVP: instant join (no admin approval)
    await db.group_members.insert_one(
        {
            "group_id": group_id,
            "user_id": user["id"],
            "role": "member",
            "joined_at": now,
        }
    )
    return {"status": "joined"}


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
    msgs = await db.messages.find({"group_id": group_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
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
    return doc


# ============= MATCHES =============
@api.get("/groups/{group_id}/matches")
async def list_matches(group_id: str, user: dict = Depends(current_user)):
    matches = await db.matches.find({"group_id": group_id}, {"_id": 0}).sort("date", 1).to_list(200)
    return matches


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
        "created_by": user["id"],
    }
    await db.matches.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.post("/matches/{match_id}/join")
async def join_match(match_id: str, user: dict = Depends(current_user)):
    m = await db.matches.find_one({"id": match_id})
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")
    if user["id"] in m.get("players", []):
        return {"status": "already joined"}
    if len(m.get("players", [])) >= m["max_players"]:
        raise HTTPException(status_code=400, detail="Match full")
    await db.matches.update_one({"id": match_id}, {"$push": {"players": user["id"]}})
    return {"status": "joined"}


@api.post("/matches/{match_id}/leave")
async def leave_match(match_id: str, user: dict = Depends(current_user)):
    await db.matches.update_one({"id": match_id}, {"$pull": {"players": user["id"]}})
    return {"status": "left"}


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
        },
        {
            "name": "FC République",
            "description": "Foot du dimanche matin à République. Match 8v8 sur terrain synthétique. Niveau intermédiaire à avancé.",
            "photo": "https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?w=800",
            "city": "Paris 3",
            "level": "advanced",
            "max_members": 18,
            "distance_km": 2.4,
        },
        {
            "name": "Bastille United",
            "description": "Petit collectif de passionnés basé à Bastille. Match hebdo tous les samedis matins. 7v7 en salle. Places limitées !",
            "photo": "https://images.unsplash.com/photo-1459865264687-595d652de67e?w=800",
            "city": "Paris 12",
            "level": "advanced",
            "max_members": 16,
            "distance_km": 3.1,
        },
        {
            "name": "Les Débutants du Sud",
            "description": "100% débutants ou reprise du foot. On apprend, on rigole, on progresse ensemble. Aucun jugement.",
            "photo": "https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=800",
            "city": "Paris 13",
            "level": "rookie",
            "max_members": 25,
            "distance_km": 5.8,
        },
        {
            "name": "Elite Paris FC",
            "description": "Équipe compétitive pour matchs 11v11 sur pelouse. Niveau régional/départemental minimum. Entraînement obligatoire.",
            "photo": "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800",
            "city": "Paris 15",
            "level": "elite",
            "max_members": 22,
            "distance_km": 7.2,
        },
        {
            "name": "Mixed Vibes",
            "description": "Groupe mixte tous niveaux, ambiance chill. Foot 5v5 en semaine, apéro après le match.",
            "photo": "https://images.unsplash.com/photo-1526232761682-d26e03ac148e?w=800",
            "city": "Paris 20",
            "level": "mixed",
            "max_members": 20,
            "distance_km": 4.5,
        },
        {
            "name": "Cité Universitaire FC",
            "description": "Étudiants et jeunes actifs, foot tous les mercredis soirs et dimanches. Rejoins-nous après ta journée !",
            "photo": "https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?w=800",
            "city": "Paris 14",
            "level": "intermediate",
            "max_members": 24,
            "distance_km": 6.1,
        },
        {
            "name": "Old School Kickers",
            "description": "35+ vétérans, foot loisir sans blessure. Le plaisir d'abord. Match dominical à Vincennes.",
            "photo": "https://images.unsplash.com/photo-1602273660127-a0000560a4c1?w=800",
            "city": "Vincennes",
            "level": "intermediate",
            "max_members": 18,
            "distance_km": 8.9,
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
