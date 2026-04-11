from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "BlueNet Auth Service"
    debug: bool = False

    database_url: str = "postgresql+asyncpg://bluenet:bluenet_secret@localhost:5432/bluenet"
    jwt_secret: str = "change_this_secret_in_production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440  # 24h
    jwt_refresh_expire_days: int = 7

    first_admin_user: str = "admin"
    first_admin_pass: str = "Admin@123"

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
