from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

class Database:
    client: AsyncIOMotorClient = None

    # THE INNOVATION: The Magic Router
    # If the app asks for db.users, this intercepts it and grabs the 'users' collection dynamically
    def __getattr__(self, name):
        if self.client is None:
            raise Exception("Database client is not initialized. Did the server boot correctly?")
        return self.client[settings.DATABASE_NAME][name]

db = Database()

async def connect_to_mongo():
    print("Booting Sanctuary Database Engine...")
    db.client = AsyncIOMotorClient(settings.MONGODB_URL)
    print("Successfully connected to EchoRoom Atlas Cluster.")

async def close_mongo_connection():
    if db.client:
        print("Fires when the server shuts down...")
        db.client.close()
        print("MongoDB connection closed cleanly.")
        
def get_database():
    return db.client[settings.DATABASE_NAME]