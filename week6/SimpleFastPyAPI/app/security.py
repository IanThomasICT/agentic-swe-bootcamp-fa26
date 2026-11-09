import hashlib
import hmac
import secrets


def hash_admin_token(token: str) -> str:
    """SHA-256 of the admin token.

    This is what the browser session cookie stores - the raw ADMIN_TOKEN
    never leaves the login request.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def verify_admin_token(candidate: str, expected: str) -> bool:
    """Constant-time check of a presented admin token against the real one."""
    if not candidate or not expected:
        return False
    return hmac.compare_digest(hash_admin_token(candidate), hash_admin_token(expected))


def verify_admin_session(session_value: str, expected_token: str) -> bool:
    """Constant-time check of a session cookie against the configured token."""
    if not session_value or not expected_token:
        return False
    return hmac.compare_digest(session_value, hash_admin_token(expected_token))


def hash_password(password: str) -> str:
    """Salted scrypt hash of a password. Never store plaintext."""
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1)
    return f"scrypt${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _scheme, salt_hex, digest_hex = stored.split("$")
    except ValueError:
        return False
    candidate = hashlib.scrypt(
        password.encode("utf-8"), salt=bytes.fromhex(salt_hex), n=2**14, r=8, p=1
    )
    return hmac.compare_digest(candidate.hex(), digest_hex)
