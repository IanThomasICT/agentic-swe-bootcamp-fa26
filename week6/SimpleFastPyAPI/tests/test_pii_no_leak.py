"""PII red-phase suite.

Every test states what SHOULD be true of an API that correctly limits
exposure of Personally Identifiable Information. Most of these fail
against the current code - that is the point. Run pytest to see how bad
things are.
"""
from tests.conftest import assert_no_key_anywhere, assert_value_not_in


def test_create_response_does_not_echo_password(client, make_user):
    """POST /users/ must never return the password it was given."""
    resp, raw = make_user()
    assert resp.status_code == 200, resp.text
    assert_no_key_anywhere(resp.json(), "password")
    assert_value_not_in(resp.json(), raw["password"])


def test_get_all_no_passwords(client, make_two_users):
    """GET /users/ must not include any password key or password value."""
    (a_resp, raw_a), (b_resp, raw_b) = make_two_users
    resp = client.get("/users/")
    assert resp.status_code == 200, resp.text
    payload = resp.json()
    assert_no_key_anywhere(payload, "password")
    for raw in (raw_a, raw_b):
        assert_value_not_in(payload, raw["password"])


def test_get_one_no_password(client, make_user):
    """GET /users/{id} must not include the user's password."""
    make_resp, raw = make_user()
    resp = client.get(f"/users/{make_resp.json()['id']}")
    assert resp.status_code == 200, resp.text
    assert_no_key_anywhere(resp.json(), "password")
    assert_value_not_in(resp.json(), raw["password"])


def test_update_response_no_pii(client, make_user):
    """PUT /users/{id} must not echo the PII it just stored."""
    make_resp, _ = make_user()
    user_id = make_resp.json()["id"]
    update = {"name": "Updated Name", "email": "updated@example.com"}
    resp = client.put(f"/users/{user_id}", json=update)
    assert resp.status_code == 200, resp.text
    assert_no_key_anywhere(resp.json(), "password")
    assert_value_not_in(resp.json(), update["email"])


def test_duplicate_email_is_rejected_without_leaking(client, make_user):
    """Duplicate emails must yield a clean 4xx, never a stack-trace 500."""
    _, raw_a = make_user()

    # Same email, different name/password.
    resp = client.post(
        "/users/",
        json={"name": "Impostor", "email": raw_a["email"], "password": "x" * 20},
    )
    assert 400 <= resp.status_code < 500, (
        f"Duplicate email should be a 4xx client error, got {resp.status_code}: "
        f"{resp.text!r}"
    )
    assert raw_a["email"] not in resp.text


def test_unknown_user_404_is_minimal(client, make_two_users):
    """404 for a missing user must not include other users' PII."""
    resp = client.get("/users/999999")
    assert resp.status_code == 404
    text = resp.text.lower()
    assert "password" not in text
    for (r, raw) in make_two_users:
        assert raw["name"] not in resp.text
        assert raw["email"] not in resp.text


def test_password_not_stored_plaintext(client, make_user, db_session):
    """The stored credential must not equal the plaintext the user sent."""
    from app.models import User

    resp, raw = make_user(password="plaintext-canary-42")
    assert resp.status_code == 200, resp.text

    row = db_session.query(User).filter(User.id == resp.json()["id"]).first()
    assert row is not None
    assert row.password != "plaintext-canary-42", (
        f"Password stored in plaintext: {row.password!r}"
    )
    assert len(row.password) >= 50, "Password looks like raw storage, not a hash"


def test_get_all_no_names_no_emails(client, make_two_users):
    """Strict sweep: raw names/emails should not be trivially scrapable.

    Intentionally adversarial and expected to fail for a user directory API;
    included to quantify exactly how exposed the data model is.
    """
    resp = client.get("/users/")
    assert resp.status_code == 200, resp.text
    payload = resp.json()
    for (r, raw) in make_two_users:
        assert_value_not_in(payload, raw["name"])
        assert_value_not_in(payload, raw["email"])
