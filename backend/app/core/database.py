from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

class Database:
    client: AsyncIOMotorClient = None

db = Database()

async def connect_to_mongo():
    """Fires when the FastAPI server boots up."""
    print("Initializing Asynchronous MongoDB Connection...")
    db.client = AsyncIOMotorClient(settings.MONGODB_URL)
    print("Successfully connected to EchoRoom Atlas Cluster.")

async def close_mongo_connection():
    """Fires when the server shuts down."""
    if db.client:
        db.client.close()
        print("MongoDB connection closed cleanly.")

def get_database():
    """Utility to inject the database into our API routes later."""
    return db.client[settings.DATABASE_NAME]