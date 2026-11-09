from pathlib import Path

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from app.admin import AdminUnauthorized, router as admin_router
from app.database import get_db
from app.models import User
from app.schema import UserCreate, UserResponse, UserUpdate
from app.security import hash_password


app = FastAPI()

BASE_DIR = Path(__file__).resolve().parent
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "app" / "static")), name="static")
app.include_router(admin_router)


@app.exception_handler(AdminUnauthorized)
async def admin_unauthorized_handler(request: Request, exc: AdminUnauthorized):
    """Browsers get sent to the login page, API clients get a 401."""
    if "text/html" in request.headers.get("accept", ""):
        # Only the path is carried over - a query string could contain a
        # token and must never be echoed into a URL.
        return RedirectResponse(
            url=f"/admin/login?next={request.url.path}", status_code=303
        )
    return JSONResponse(
        status_code=401, content={"detail": "Invalid or missing admin token"}
    )


def to_response(db_user: User) -> UserResponse:
    """Project a DB row to the public shape - drops the password."""
    return UserResponse(id=db_user.id, name=db_user.name, email=db_user.email)


@app.get("/users/", response_model=list[UserResponse])
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [to_response(user) for user in users]

@app.get("/users/{user_id}", response_model=UserResponse)
def get_user_by_id(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        return to_response(user)
    raise HTTPException(status_code=404, detail="User not found")


@app.post("/users/", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    db_user = User(name=user.name, email=user.email, password=hash_password(user.password))
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return to_response(db_user)

@app.put("/users/{user_id}", response_model=None)
def update_user(user_id: int, user: UserUpdate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.email != db_user.email and db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    db_user.name = user.name
    db_user.email = user.email
    db.commit()
    return {"message": "User updated successfully"}

@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(db_user)
    db.commit()
    return {"message": "User deleted successfully"}
