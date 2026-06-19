from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from datetime import datetime, timedelta, timezone
from bson.objectid import ObjectId
from app.models.schemas import PostCreate, PostResponse, ReplyCreate, EmpathyRating
from app.core.security import decode_access_token
from app.core.database import get_database

router = APIRouter()

# --- CLINICAL HELPER FUNCTIONS ---
CRISIS_KEYWORDS = ['suicide', 'kill myself', 'end it all', 'self harm', 'give up']

def detect_crisis(content: str) -> bool:
    content_lower = content.lower()
    return any(word in content_lower for word in CRISIS_KEYWORDS)

def format_mongo_doc(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

# --- POST ROUTES ---
@router.post("/", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(post: PostCreate, current_user_alias: str = Depends(decode_access_token)):
    db = get_database()
    new_post = {
        "author_alias": current_user_alias,
        "content": post.content,
        "post_type": post.post_type.value,
        "tags": post.tags,
        "has_cw": post.has_cw,
        "replies": [],
        "relates": [],
        "created_at": datetime.now(timezone.utc),
        "is_hidden": False,
        "expireAt": datetime.now(timezone.utc) + timedelta(hours=24) if post.post_type.value == 'void' else None
    }

    if detect_crisis(post.content) and post.post_type.value == 'echo':
        system_reply = {
            "reply_id": str(ObjectId()),
            "author_alias": "System Administrator",
            "content": "You are not alone. If you are in crisis, please reach out to our counseling channel or a local helpline immediately. We are here to support you.",
            "empathy_rating": "comforting",
            "is_system": True,
            "is_OP": False,
            "created_at": datetime.now(timezone.utc)
        }
        new_post["replies"].append(system_reply)

    result = await db.posts.insert_one(new_post)
    new_post["_id"] = result.inserted_id
    return format_mongo_doc(new_post)


@router.get("/feed", response_model=List[PostResponse])
async def get_feed():
    db = get_database()
    cursor = db.posts.find({"is_hidden": False}).sort("created_at", -1).limit(50)
    posts = await cursor.to_list(length=50)
    return [format_mongo_doc(p) for p in posts]


@router.get("/{post_id}", response_model=PostResponse)
async def get_single_post(post_id: str):
    db = get_database()
    if not ObjectId.is_valid(post_id):
        raise HTTPException(status_code=400, detail="Invalid post ID format.")
        
    post = await db.posts.find_one({"_id": ObjectId(post_id), "is_hidden": False})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")

    for reply in post.get("replies", []):
        reply["is_OP"] = (reply.get("author_alias") == post.get("author_alias"))

    return format_mongo_doc(post)


# --- INTERACTION ROUTES ---
@router.post("/{post_id}/reply", status_code=status.HTTP_201_CREATED)
async def create_reply(post_id: str, reply: ReplyCreate, current_user_alias: str = Depends(decode_access_token)):
    if reply.read_time < 8:
        raise HTTPException(status_code=429, detail="Take a breath. Please read the full post before replying.")

    db = get_database()
    target_post = await db.posts.find_one({"_id": ObjectId(post_id), "is_hidden": False})
    
    if not target_post:
        raise HTTPException(status_code=404, detail="Post not found.")
    if target_post.get("post_type") == "void":
        raise HTTPException(status_code=403, detail="You cannot reply to a post in The Void.")

    new_reply = {
        "reply_id": str(ObjectId()),
        "author_alias": current_user_alias,
        "content": reply.content,
        "empathy_rating": None,
        "is_system": False,
        "is_OP": current_user_alias == target_post.get("author_alias"),
        "created_at": datetime.now(timezone.utc)
    }

    await db.posts.update_one(
        {"_id": ObjectId(post_id)},
        {"$push": {"replies": new_reply}}
    )
    return {"message": "Echo sent.", "reply": new_reply}


@router.post("/{post_id}/reply/{reply_id}/rate")
async def rate_reply(post_id: str, reply_id: str, rating: EmpathyRating, current_user_alias: str = Depends(decode_access_token)):
    db = get_database()
    post = await db.posts.find_one({"_id": ObjectId(post_id)})
    if not post or post.get("author_alias") != current_user_alias:
        raise HTTPException(status_code=403, detail="Only the Original Poster can rate replies.")

    target_reply = next((r for r in post.get("replies", []) if r["reply_id"] == reply_id), None)
    
    if not target_reply or target_reply.get("author_alias") == current_user_alias or target_reply.get("empathy_rating"):
        raise HTTPException(status_code=400, detail="Invalid rating operation.")

    points_map = {"heard": 1, "comforting": 2, "advice": 3}
    points_awarded = points_map[rating.value]
    reply_author = target_reply["author_alias"]

    await db.posts.update_one(
        {"_id": ObjectId(post_id), "replies.reply_id": reply_id},
        {"$set": {"replies.$.empathy_rating": rating.value}}
    )

    user = await db.users.find_one({"alias": reply_author})
    new_tier = "Novice Listener"
    if user:
        new_score = user.get("empathy_score", 0) + points_awarded
        if new_score >= 150: new_tier = "Campus Guardian"
        elif new_score >= 50: new_tier = "Empathy Anchor"
        elif new_score >= 15: new_tier = "Trusted Voice"

        await db.users.update_one(
            {"alias": reply_author},
            {"$set": {"empathy_score": new_score, "tier": new_tier}}
        )

    return {"message": "Validation sent.", "awarded": points_awarded, "new_tier": new_tier}


@router.post("/{post_id}/relate")
async def toggle_relate(post_id: str, current_user_alias: str = Depends(decode_access_token)):
    """Toggles the Silent Resonance Heart"""
    db = get_database()
    if not ObjectId.is_valid(post_id):
        raise HTTPException(status_code=400, detail="Invalid post ID.")
        
    post = await db.posts.find_one({"_id": ObjectId(post_id)})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")

    relates_array = post.get("relates", [])
    if current_user_alias in relates_array:
        await db.posts.update_one({"_id": ObjectId(post_id)}, {"$pull": {"relates": current_user_alias}})
        return {"message": "Resonance quieted.", "status": "removed"}
    else:
        await db.posts.update_one({"_id": ObjectId(post_id)}, {"$push": {"relates": current_user_alias}})
        return {"message": "Resonance sent.", "status": "added"}