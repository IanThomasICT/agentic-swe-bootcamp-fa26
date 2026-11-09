"""Admin portal tests.

One test per admin endpoint, written with unittest (see AGENTS.md).
Every test runs against a throwaway in-memory SQLite database - the
checked-in users.db is never touched.
"""
import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import get_db
from app.models import Base, User
from app.security import hash_password, verify_password
from main import app

ADMIN_TOKEN = "admin-token-for-tests"
BROWSER = {"Accept": "text/html,application/xhtml+xml"}


class AdminTestCase(unittest.TestCase):
    """Shared setup: isolated database, client and ADMIN_TOKEN."""

    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.session = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)()

        def override_get_db():
            yield self.session

        app.dependency_overrides[get_db] = override_get_db
        self.addCleanup(app.dependency_overrides.clear)

        # Redirects are not followed so the tests can assert on them.
        self.client = TestClient(
            app, raise_server_exceptions=False, follow_redirects=False
        )
        self.addCleanup(self.client.close)

        env = patch.dict(os.environ, {"ADMIN_TOKEN": ADMIN_TOKEN})
        env.start()
        self.addCleanup(env.stop)

        self.addCleanup(self.engine.dispose)
        self.addCleanup(self.session.close)

    # -- helpers ---------------------------------------------------------

    def auth(self):
        return {"X-Admin-Token": ADMIN_TOKEN}

    def seed_user(self, name="Ada", email="ada@example.com", password="ada-pass-123"):
        user = User(name=name, email=email, password=hash_password(password))
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        return user

    def login(self, token=ADMIN_TOKEN):
        return self.client.post(
            "/admin/login", data={"token": token, "next": "/admin/"}
        )

    def stored_user(self, user_id):
        return self.session.query(User).filter(User.id == user_id).first()

    def assert_no_password_leak(self, response, *secrets):
        """No plaintext password and no stored hash may appear in a page."""
        body = response.text
        for secret in secrets:
            self.assertNotIn(secret, body)
        self.assertNotIn("scrypt$", body)


class TestAdminAccess(AdminTestCase):
    """The token gate in front of the portal."""

    def test_login_page_is_public(self):
        """GET /admin/login is reachable without a token."""
        response = self.client.get("/admin/login")
        self.assertEqual(response.status_code, 200)
        self.assertIn('name="token"', response.text)

    def test_dashboard_requires_a_token(self):
        """GET /admin/ without a token is a 401 for API clients."""
        response = self.client.get("/admin/")
        self.assertEqual(response.status_code, 401)
        self.assertIn("detail", response.json())

    def test_dashboard_redirects_browsers_to_login(self):
        """A browser without a token is sent to the login page."""
        response = self.client.get("/admin/", headers=BROWSER)
        self.assertEqual(response.status_code, 303)
        self.assertIn("/admin/login", response.headers["location"])

    def test_wrong_token_is_rejected(self):
        """A token that does not match ADMIN_TOKEN never opens a session."""
        response = self.login(token="not-the-token")
        self.assertEqual(response.status_code, 401)
        self.assertIn("not valid", response.text)
        self.assertEqual(response.cookies.get("admin_session"), None)

    def test_admin_is_disabled_when_no_token_is_configured(self):
        """Without ADMIN_TOKEN the portal fails closed."""
        with patch.dict(os.environ, {"ADMIN_TOKEN": ""}):
            response = self.client.get("/admin/", headers=self.auth())
        self.assertEqual(response.status_code, 503)

    def test_login_opens_a_session(self):
        """POST /admin/login with the right token sets the session cookie."""
        response = self.login()
        self.assertEqual(response.status_code, 303)
        self.assertEqual(response.headers["location"], "/admin/")
        self.assertIn("admin_session", response.cookies)

        # The cookie alone is enough to reach the dashboard.
        page = self.client.get("/admin/")
        self.assertEqual(page.status_code, 200)

    def test_session_cookie_does_not_store_the_token(self):
        """The browser only ever holds a hash of the token."""
        response = self.login()
        self.assertNotIn(ADMIN_TOKEN, response.cookies["admin_session"])

    def test_logout_ends_the_session(self):
        """POST /admin/logout clears the cookie."""
        self.login()
        response = self.client.post("/admin/logout")
        self.assertEqual(response.status_code, 303)

        page = self.client.get("/admin/")
        self.assertEqual(page.status_code, 401)


class TestAdminUsers(AdminTestCase):
    """Managing users through the portal."""

    def test_list_shows_users_without_passwords(self):
        """GET /admin/ lists users and never exposes a credential."""
        user = self.seed_user(name="Ada", email="ada@example.com", password="ada-pass-123")

        response = self.client.get("/admin/", headers=self.auth())
        self.assertEqual(response.status_code, 200)
        self.assertIn("Ada", response.text)
        self.assertIn("ada@example.com", response.text)
        self.assert_no_password_leak(response, "ada-pass-123", user.password)

    def test_list_can_be_searched(self):
        """GET /admin/?q= filters by name or email."""
        self.seed_user(name="Ada", email="ada@example.com")
        self.seed_user(name="Grace", email="grace@example.com")

        response = self.client.get("/admin/?q=grace", headers=self.auth())
        self.assertEqual(response.status_code, 200)
        self.assertIn("grace@example.com", response.text)
        self.assertNotIn("ada@example.com", response.text)

    def test_new_user_form_renders(self):
        """GET /admin/users/new renders the create form."""
        response = self.client.get("/admin/users/new", headers=self.auth())
        self.assertEqual(response.status_code, 200)
        self.assertIn('name="email"', response.text)

    def test_create_user_hashes_the_password(self):
        """POST /admin/users/ stores a hash, never the plaintext."""
        response = self.client.post(
            "/admin/users/",
            data={"name": "Ada", "email": "ada@example.com", "password": "ada-pass-123"},
            headers=self.auth(),
        )
        self.assertEqual(response.status_code, 303)

        user = self.stored_user(1)
        self.assertIsNotNone(user)
        self.assertEqual(user.email, "ada@example.com")
        self.assertNotEqual(user.password, "ada-pass-123")
        self.assertTrue(verify_password("ada-pass-123", user.password))

    def test_create_user_rejects_a_duplicate_email(self):
        """A taken email is reported, and the page leaks no password."""
        self.seed_user(name="Ada", email="ada@example.com")

        response = self.client.post(
            "/admin/users/",
            data={"name": "Impostor", "email": "ada@example.com", "password": "other-pass"},
            headers=self.auth(),
        )
        self.assertEqual(response.status_code, 409)
        self.assertIn("already registered", response.text)
        self.assert_no_password_leak(response, "other-pass")

    def test_create_user_requires_every_field(self):
        """An empty form is rejected."""
        response = self.client.post(
            "/admin/users/",
            data={"name": "", "email": "", "password": ""},
            headers=self.auth(),
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("required", response.text)

    def test_detail_page_renders_the_user(self):
        """GET /admin/users/{id} shows the user without the password."""
        user = self.seed_user(name="Ada", email="ada@example.com", password="ada-pass-123")

        response = self.client.get(f"/admin/users/{user.id}", headers=self.auth())
        self.assertEqual(response.status_code, 200)
        self.assertIn("ada@example.com", response.text)
        self.assert_no_password_leak(response, "ada-pass-123", user.password)

    def test_detail_page_404_for_a_missing_user(self):
        """An unknown id renders the not-found page."""
        response = self.client.get("/admin/users/999999", headers=self.auth())
        self.assertEqual(response.status_code, 404)
        self.assertIn("not found", response.text.lower())

    def test_update_user_changes_the_fields(self):
        """POST /admin/users/{id} updates name and email."""
        user = self.seed_user(name="Ada", email="ada@example.com")

        response = self.client.post(
            f"/admin/users/{user.id}",
            data={"name": "Ada Lovelace", "email": "ada@example.org"},
            headers=self.auth(),
        )
        self.assertEqual(response.status_code, 303)

        updated = self.stored_user(user.id)
        self.assertEqual(updated.name, "Ada Lovelace")
        self.assertEqual(updated.email, "ada@example.org")

    def test_update_user_can_reset_the_password(self):
        """A password in the update form replaces the stored credential."""
        user = self.seed_user(name="Ada", email="ada@example.com", password="old-pass-123")

        response = self.client.post(
            f"/admin/users/{user.id}",
            data={"name": "Ada", "email": "ada@example.com", "password": "new-pass-456"},
            headers=self.auth(),
        )
        self.assertEqual(response.status_code, 303)

        updated = self.stored_user(user.id)
        self.assertTrue(verify_password("new-pass-456", updated.password))
        self.assertFalse(verify_password("old-pass-123", updated.password))
        self.assert_no_password_leak(response, "new-pass-456")

    def test_update_user_keeps_the_password_when_the_field_is_blank(self):
        """An empty password field leaves the credential alone."""
        user = self.seed_user(name="Ada", email="ada@example.com", password="old-pass-123")

        response = self.client.post(
            f"/admin/users/{user.id}",
            data={"name": "Ada Lovelace", "email": "ada@example.com", "password": ""},
            headers=self.auth(),
        )
        self.assertEqual(response.status_code, 303)
        self.assertTrue(verify_password("old-pass-123", self.stored_user(user.id).password))

    def test_update_user_rejects_a_duplicate_email(self):
        """A taken email is reported."""
        self.seed_user(name="Ada", email="ada@example.com")
        other = self.seed_user(name="Grace", email="grace@example.com")

        response = self.client.post(
            f"/admin/users/{other.id}",
            data={"name": "Grace", "email": "ada@example.com", "password": ""},
            headers=self.auth(),
        )
        self.assertEqual(response.status_code, 409)
        self.assertIn("already registered", response.text)

    def test_delete_user_removes_the_row(self):
        """POST /admin/users/{id}/delete deletes the user."""
        user = self.seed_user(name="Ada", email="ada@example.com")

        response = self.client.post(
            f"/admin/users/{user.id}/delete", headers=self.auth()
        )
        self.assertEqual(response.status_code, 303)
        self.assertIsNone(self.stored_user(user.id))

    def test_delete_missing_user_is_a_404(self):
        """Deleting an unknown id renders the not-found page."""
        response = self.client.post("/admin/users/999999/delete", headers=self.auth())
        self.assertEqual(response.status_code, 404)

    def test_every_admin_page_is_guarded(self):
        """No admin page answers without a token."""
        paths = [
            "/admin/",
            "/admin/users/new",
            "/admin/users/1",
            "/admin/users/1/delete",
            "/admin/logout",
        ]
        for path in paths:
            with self.subTest(path=path):
                response = self.client.post(path) if "delete" in path or "logout" in path else self.client.get(path)
                self.assertEqual(response.status_code, 401)


if __name__ == "__main__":
    unittest.main()
