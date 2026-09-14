import pytest
import asyncio
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import get_db, Base
from app.config import settings

# Override config for testing
settings.DATABASE_URL = "sqlite+aiosqlite:///./test.db"

test_engine = create_async_engine(settings.DATABASE_URL, echo=False)
TestingSessionLocal = sessionmaker(
    bind=test_engine, class_=AsyncSession, expire_on_commit=False
)

async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db

async def init_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

async def drop_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    asyncio.run(init_db())
    yield
    asyncio.run(drop_db())

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c
