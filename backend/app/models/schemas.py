from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
from enum import Enum

# --- ENUMS (Strict Choices) ---
class PostType(str, Enum):
    void = "void"
    echo = "echo"

class EmpathyRating(str, Enum):
    heard = "heard"
    comforting = "comforting"
    advice = "advice"

# --- USER SCHEMAS ---
class UserCreate(BaseModel):
    alias: str = Field(..., min_length=3, max_length=20)
    passcode: str = Field(..., min_length=6)

class UserResponse(BaseModel):
    alias: str
    empathy_score: int
    tier: str
    created_at: datetime

# --- REPLY SCHEMAS ---
class ReplyBase(BaseModel):
    reply_id: str
    author_alias: str
    content: str = Field(..., min_length=1, max_length=500)
    empathy_rating: Optional[EmpathyRating] = None
    is_system: bool = False
    is_OP: Optional[bool] = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReplyCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=500)
    read_time: int = 0  # The 8-second Speed Bump tracker

# --- POST SCHEMAS ---
class PostCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=500)
    post_type: PostType
    tags: List[str] = []
    has_cw: bool = False  # Content Warning toggle

class PostResponse(BaseModel):
    id: str = Field(alias="_id") # Maps MongoDB's internal _id to a clean string
    author_alias: str
    content: str
    post_type: PostType
    tags: List[str]
    has_cw: bool
    replies: List[ReplyBase]
    relates: List[str]
    created_at: datetime
    expireAt: Optional[datetime] = None # Used for the 24-hour Void auto-prune

    # This config tells Pydantic to allow populating the 'id' field using MongoDB's '_id'
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

class Token(BaseModel):
    access_token: str
    token_type: str    