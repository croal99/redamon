import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from core.database import engine, Base
from core.config import get_settings
from core.security import get_password_hash
from models.user import User, UserRole
from api.auth import router as auth_router
from api.users import router as users_router
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
settings = get_settings()


async def create_first_admin():
    async with AsyncSession(engine) as session:
        result = await session.execute(
            select(User).where(User.username == settings.first_admin_user)
        )
        if not result.scalar_one_or_none():
            admin = User(
                username=settings.first_admin_user,
                password_hash=get_password_hash(settings.first_admin_pass),
                role=UserRole.admin,
            )
            session.add(admin)
            await session.commit()
            logger.info(f"Created first admin user: {settings.first_admin_user}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await create_first_admin()
    yield
    await engine.dispose()


app = FastAPI(title="BlueNet Auth Service", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth")
app.include_router(users_router, prefix="/auth")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "auth-service"}
