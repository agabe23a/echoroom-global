from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime, timezone
from app.models.schemas import UserCreate, UserResponse, Token
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token
from app.core.database import db

router = APIRouter()

# --- CLINICAL HELPER FUNCTION ---
# This stops the silent crash by translating MongoDB's language to FastAPI's language
def format_user_doc(doc: dict) -> dict:
    if doc is None:
        return None
    doc["id"] = str(doc["_id"])
    return doc

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user: UserCreate):
    # 1. Check if Alias already exists
    existing_user = await db.users.find_one({"alias": {"$regex": f"^{user.alias}$", "$options": "i"}})
    if existing_user:
        raise HTTPException(status_code=400, detail="Alias is already echoing in the room. Choose another.")

    # 2. Hash Password and Create User
    hashed_password = get_password_hash(user.passcode)
    
    new_user_doc = {
        "alias": user.alias,
        "passcode": hashed_password,
        "tier": "Novice Listener",
        "empathy_score": 0,
        "created_at": datetime.now(timezone.utc)
    }

    result = await db.users.insert_one(new_user_doc)
    created_user = await db.users.find_one({"_id": result.inserted_id})
    
    # 3. Format and Return
    return format_user_doc(created_user)

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # 1. Find User
    user = await db.users.find_one({"alias": form_data.username})
    if not user:
        raise HTTPException(status_code=401, detail="Alias not found in the Sanctuary.")

    # 2. Verify Passcode
    if not verify_password(form_data.password, user["passcode"]):
        raise HTTPException(status_code=401, detail="Incorrect passcode.")

    # 3. Generate Token
    access_token = create_access_token(data={"sub": user["alias"]})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user_alias: str = Depends(decode_access_token)):
    user = await db.users.find_one({"alias": current_user_alias})
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found.")
        
    # This prevents the Pydantic crash!
    return format_user_doc(user)