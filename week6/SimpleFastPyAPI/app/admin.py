"""Admin portal.

Server rendered pages (Jinja2 templates) for managing users. Every route
under /admin/ is guarded by the shared ADMIN TOKEN from the environment.

Passwords are never selected into a template context, never rendered and
never echoed back - the admin UI works with names and emails only.
"""
import os
from pathlib import Path
from typing import Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, Form, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.security import (
    hash_admin_token,
    hash_password,
    verify_admin_session,
    verify_admin_token,
)

BASE_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

ADMIN_TOKEN_ENV = "ADMIN_TOKEN"
ADMIN_SESSION_COOKIE = "admin_session"
SESSION_MAX_AGE = 60 * 60 * 8  # 8 hours

router = APIRouter(prefix="/admin", tags=["admin"])


class AdminUnauthorized(Exception):
    """Raised when a request cannot prove that it holds the admin token."""


def configured_admin_token() -> str:
    """The admin token from the environment, or "" when it is not set up."""
    return os.environ.get(ADMIN_TOKEN_ENV, "").strip()


def presented_token(request: Request) -> Optional[str]:
    """The token carried by this request, if any.

    Accepts the X-Admin-Token header, an Authorization: Bearer header or a
    ?token= query parameter (handy for scripted access).
    """
    header = request.headers.get("X-Admin-Token")
    if header:
        return header.strip()
    authorization = request.headers.get("Authorization", "")
    if authorization.lower().startswith("bearer "):
        return authorization[len("bearer "):].strip()
    query_token = request.query_params.get("token")
    if query_token:
        return query_token.strip()
    return None


def require_admin(request: Request) -> None:
    """FastAPI dependency that gates every admin route."""
    expected = configured_admin_token()
    if not expected:
        raise HTTPException(
            status_code=503,
            detail="Admin access is not configured (set the ADMIN_TOKEN env var).",
        )

    token = presented_token(request)
    if token and verify_admin_token(token, expected):
        return

    session = request.cookies.get(ADMIN_SESSION_COOKIE)
    if session and verify_admin_session(session, expected):
        return

    raise AdminUnauthorized()


def safe_next(target: str) -> str:
    """Keep redirects inside the admin portal - no absolute or protocol URLs."""
    if not target or not target.startswith("/") or target.startswith("//"):
        return "/admin/"
    return target


def public_user(user: User) -> dict:
    """Project a DB row to the shape the admin UI is allowed to see.

    The password column is deliberately dropped here so it can never reach
    a template by accident.
    """
    return {"id": user.id, "name": user.name, "email": user.email}


def get_user_or_404(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


# --------------------------------------------------------------------------
# Session
# --------------------------------------------------------------------------


@router.get("/login")
def login_page(
    request: Request,
    next_url: str = Query("/admin/", alias="next"),
):
    """The login form. It is the only admin page reachable without a token."""
    return templates.TemplateResponse(
        request=request,
        name="admin/login.html",
        context={"next": safe_next(next_url)},
    )


@router.post("/login")
def login_submit(
    request: Request,
    token: str = Form(""),
    next_url: str = Form("/admin/", alias="next"),
):
    """Check the submitted token and open an admin session."""
    expected = configured_admin_token()
    if not expected:
        raise HTTPException(
            status_code=503,
            detail="Admin access is not configured (set the ADMIN_TOKEN env var).",
        )

    token = token.strip()
    if not token or not verify_admin_token(token, expected):
        return templates.TemplateResponse(
            request=request,
            name="admin/login.html",
            context={
                "error": "That admin token is not valid.",
                "next": safe_next(next_url),
            },
            status_code=401,
        )

    response = RedirectResponse(url=safe_next(next_url), status_code=303)
    response.set_cookie(
        ADMIN_SESSION_COOKIE,
        hash_admin_token(token),
        max_age=SESSION_MAX_AGE,
        httponly=True,
        samesite="strict",
        path="/admin",
    )
    return response


@router.post("/logout", dependencies=[Depends(require_admin)])
def logout(request: Request):
    """Drop the admin session cookie."""
    response = RedirectResponse(url="/admin/login", status_code=303)
    response.delete_cookie(ADMIN_SESSION_COOKIE, path="/admin")
    return response


# --------------------------------------------------------------------------
# Users
# --------------------------------------------------------------------------


@router.get("/", dependencies=[Depends(require_admin)])
def admin_dashboard(
    request: Request,
    db: Session = Depends(get_db),
    q: str = Query("", description="Search by name or email"),
    message: str = Query("", description="Flash message"),
):
    """The user directory: every user, searchable by name or email."""
    query = db.query(User)
    term = q.strip()
    if term:
        pattern = f"%{term.lower()}%"
        query = query.filter(
            or_(
                func.lower(User.name).like(pattern),
                func.lower(User.email).like(pattern),
            )
        )
    users = [public_user(user) for user in query.order_by(User.id).all()]

    return templates.TemplateResponse(
        request=request,
        name="admin/users.html",
        context={"users": users, "q": term, "total": len(users), "message": message},
    )


@router.get("/users/new", dependencies=[Depends(require_admin)])
def new_user_page(request: Request):
    """The create-user form."""
    return templates.TemplateResponse(
        request=request,
        name="admin/user_new.html",
        context={},
    )


@router.post("/users/", dependencies=[Depends(require_admin)])
def create_user(
    request: Request,
    db: Session = Depends(get_db),
    name: str = Form(""),
    email: str = Form(""),
    password: str = Form(""),
):
    """Create a user from the admin form."""
    name = name.strip()
    email = email.strip()

    if not name or not email or not password:
        return templates.TemplateResponse(
            request=request,
            name="admin/user_new.html",
            context={
                "error": "Name, email and password are all required.",
                "name": name,
                "email": email,
            },
            status_code=400,
        )

    if db.query(User).filter(User.email == email).first():
        return templates.TemplateResponse(
            request=request,
            name="admin/user_new.html",
            context={
                "error": "That email address is already registered.",
                "name": name,
                "email": email,
            },
            status_code=409,
        )

    db_user = User(name=name, email=email, password=hash_password(password))
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return RedirectResponse(
        url=f"/admin/users/{db_user.id}?message={quote('User created.')}",
        status_code=303,
    )


@router.get("/users/{user_id}", dependencies=[Depends(require_admin)])
def user_detail(
    request: Request,
    user_id: int,
    db: Session = Depends(get_db),
    message: str = Query("", description="Flash message"),
):
    """One user, with the edit form."""
    db_user = get_user_or_404(db, user_id)
    if not db_user:
        return templates.TemplateResponse(
            request=request,
            name="admin/user_missing.html",
            context={"user_id": user_id},
            status_code=404,
        )

    return templates.TemplateResponse(
        request=request,
        name="admin/user_detail.html",
        context={"user": public_user(db_user), "message": message},
    )


@router.post("/users/{user_id}", dependencies=[Depends(require_admin)])
def update_user(
    request: Request,
    user_id: int,
    db: Session = Depends(get_db),
    name: str = Form(""),
    email: str = Form(""),
    password: str = Form(""),
):
    """Update a user. A blank password field keeps the current password."""
    db_user = get_user_or_404(db, user_id)
    if not db_user:
        return templates.TemplateResponse(
            request=request,
            name="admin/user_missing.html",
            context={"user_id": user_id},
            status_code=404,
        )

    name = name.strip()
    email = email.strip()

    if not name or not email:
        return templates.TemplateResponse(
            request=request,
            name="admin/user_detail.html",
            context={
                "user": public_user(db_user),
                "error": "Name and email are required.",
                "form_name": name,
                "form_email": email,
            },
            status_code=400,
        )

    clash = db.query(User).filter(User.email == email, User.id != user_id).first()
    if clash:
        return templates.TemplateResponse(
            request=request,
            name="admin/user_detail.html",
            context={
                "user": public_user(db_user),
                "error": "That email address is already registered.",
                "form_name": name,
                "form_email": email,
            },
            status_code=409,
        )

    db_user.name = name
    db_user.email = email
    if password:
        db_user.password = hash_password(password)
    db.commit()

    return RedirectResponse(
        url=f"/admin/users/{user_id}?message={quote('User updated.')}",
        status_code=303,
    )


@router.post("/users/{user_id}/delete", dependencies=[Depends(require_admin)])
def delete_user(
    request: Request,
    user_id: int,
    db: Session = Depends(get_db),
):
    """Delete a user."""
    db_user = get_user_or_404(db, user_id)
    if not db_user:
        return templates.TemplateResponse(
            request=request,
            name="admin/user_missing.html",
            context={"user_id": user_id},
            status_code=404,
        )

    db.delete(db_user)
    db.commit()

    return RedirectResponse(
        url=f"/admin/?message={quote('User deleted.')}",
        status_code=303,
    )
