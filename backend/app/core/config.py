from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "EchoRoom Engine"
    MONGODB_URL: str
    DATABASE_NAME: str
    SECRET_KEY: str

    class Config:
        env_file = ".env"

# This instantly validates your .env file when imported
settings = Settings()