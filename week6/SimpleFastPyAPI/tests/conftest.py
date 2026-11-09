"""Test fixtures: isolated database, API client, user factory.

The app's real database is sqlite:///./users.db checked into the repo.
Tests never touch it - dependency injection is overridden to point at a
throwaway in-memory SQLite database instead.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import get_db
from app.models import Base
# The app module lives at the repo root, not inside app/.
from main import app

TEST_DB_URL = "sqlite://"  # in-memory


@pytest.fixture(scope="session")
def engine():
    engine = create_engine(
        TEST_DB_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture()
def db_session(engine):
    """Fresh schema per test so tests stay independent."""
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, autocommit=False, autoflush=False)()
    yield session
    session.close()


@pytest.fixture()
def client(engine, db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass  # session closed by its own fixture

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app, raise_server_exceptions=False)
    app.dependency_overrides.clear()


@pytest.fixture()
def make_user(client):
    """POST a user and remember the RAW PII that was sent to the server.

    Returns (response, raw) where raw contains the plaintext values used.
    """
    counter = {"n": 0}

    def _make_user(name="Alice", email=None, password="s3cret-pass-1"):
        counter["n"] += 1
        email = email or f"user{counter['n']}@example.com"
        raw = {"name": name, "email": email, "password": password}
        resp = client.post("/users/", json=raw)
        resp.raw_pii = raw
        return resp, raw

    return _make_user


@pytest.fixture()
def make_two_users(make_user):
    resp_a, raw_a = make_user(name="Alpha", password="alpha-pass-111")
    resp_b, raw_b = make_user(name="Beta", password="beta-pass-222")
    assert resp_a.status_code == 200 and resp_b.status_code == 200
    return (resp_a, raw_a), (resp_b, raw_b)


def all_json_payloads(payload):
    """Yield every JSON object inside an arbitrarily nested response."""
    yield payload
    if isinstance(payload, dict):
        for value in payload.values():
            yield from all_json_payloads(value)
    elif isinstance(payload, list):
        for item in payload:
            yield from all_json_payloads(item)


def assert_no_key_anywhere(payload, key):
    for obj in all_json_payloads(payload):
        assert isinstance(obj, dict) is False or key not in obj, (
            f"Sensitive key '{key}' leaked in response: {payload}"
        )


def assert_value_not_in(payload, value):
    import json

    text = json.dumps(payload)
    assert value not in text, f"PII value '{value}' leaked in response: {text}"
