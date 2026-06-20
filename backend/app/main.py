from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import connect_to_mongo, close_mongo_connection
from app.api import auth, feed

# Define what happens when the server starts and stops
@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup ---
    await connect_to_mongo()
    yield # The server runs here
    # --- Shutdown ---
    await close_mongo_connection()

app = FastAPI(
    title="EchoRoom Engine",
    description="Decentralized Digital Therapy and Empathy Architecture",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect the routers (Separation of Concerns)
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(feed.router, prefix="/api/posts", tags=["Feed & Interaction"])

@app.get("/")
async def root_status():
    return {
        "system": "EchoRoom Backend Online", 
        "database": "Connected",
        "status": 200
    }