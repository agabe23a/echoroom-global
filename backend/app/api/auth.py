from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime, timezone
from app.models.schemas import UserCreate, UserResponse
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token
from app.core.database import get_database

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user: UserCreate):
    """Creates a new anonymous identity."""
    db = get_database()
    
    # 1. Check if alias already exists (Case-insensitive check)
    existing_user = await db.users.find_one({"alias": {"$regex": f"^{user.alias}$", "$options": "i"}})
    if existing_user:
        raise HTTPException(status_code=400, detail="Alias is already echoing in the room. Choose another.")

    # 2. Hash the passcode and build the profile
    hashed_passcode = get_password_hash(user.passcode)
    
    new_user_doc = {
        "alias": user.alias,
        "passcode": hashed_passcode,
        "empathy_score": 0,
        "tier": "Novice Listener",
        "created_at": datetime.now(timezone.utc)
    }

    # 3. Inject into MongoDB
    await db.users.insert_one(new_user_doc)

    return new_user_doc


@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Authenticates the user and returns a JWT passport."""
    db = get_database()
    
    # form_data.username maps to our 'alias'
    user = await db.users.find_one({"alias": form_data.username})
    
    if not user or not verify_password(form_data.password, user["passcode"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect alias or passcode.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Generate the JWT with the alias as the "subject" (sub)
    access_token = create_access_token(data={"sub": user["alias"]})
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user_alias: str = Depends(decode_access_token)):
    """A protected route to fetch the currently logged-in user's profile."""
    db = get_database()
    user = await db.users.find_one({"alias": current_user_alias})
    
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found.")
        
    return user