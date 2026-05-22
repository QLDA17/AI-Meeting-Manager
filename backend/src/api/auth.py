from datetime import datetime, timedelta
from typing import Optional
from jose import jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import os
import logging
from .database import get_db
from . import models

# Configuration
logger = logging.getLogger(__name__)
ENVIRONMENT = os.getenv("ENVIRONMENT", os.getenv("APP_ENV", "development"))
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    if ENVIRONMENT == "production":
        raise RuntimeError("SECRET_KEY required in production")
    SECRET_KEY = "your-secret-key-for-development"
    logger.warning("SECRET_KEY is not set; using development fallback")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception
        
    from .crud import get_user_by_username
    user = get_user_by_username(db, username)
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")
    return user


def get_user_org_role(db: Session, user: models.User, org_id: str) -> Optional[str]:
    if user.role == "system-admin":
        return "system-admin"

    membership = db.query(models.UserOrganization).filter(
        models.UserOrganization.user_id == user.id,
        models.UserOrganization.organization_id == org_id,
    ).first()
    return membership.role if membership else None


def require_org_member(db: Session, user: models.User, org_id: str) -> models.Organization:
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if not get_user_org_role(db, user, org_id):
        raise HTTPException(status_code=403, detail="Organization access denied")

    if user.role != "system-admin":
        approval_status = (org.settings or {}).get("approval_status", "active")
        if approval_status != "active":
            raise HTTPException(status_code=403, detail="Organization is pending approval")
    return org


def require_org_admin(db: Session, user: models.User, org_id: str) -> models.Organization:
    org = require_org_member(db, user, org_id)
    role = get_user_org_role(db, user, org_id)
    if role not in {"system-admin", "org-admin"}:
        raise HTTPException(status_code=403, detail="Organization admin access required")
    return org


def get_user_group_role(db: Session, user: models.User, group_id: str) -> Optional[str]:
    if user.role == "system-admin":
        return "system-admin"

    membership = db.query(models.GroupMembership).filter(
        models.GroupMembership.user_id == user.id,
        models.GroupMembership.group_id == group_id,
    ).first()
    return membership.role if membership else None


def require_group_member(db: Session, user: models.User, group_id: str) -> models.Group:
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    org_role = get_user_org_role(db, user, group.organization_id)
    group_role = get_user_group_role(db, user, group_id)
    if not org_role and not group_role:
        raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập nhóm này")
    if group.privacy_level == "private" and user.role != "system-admin":
        if org_role != "org-admin" and not group_role:
            raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập nhóm này")
    return group


def require_group_admin(db: Session, user: models.User, group_id: str) -> models.Group:
    group = require_group_member(db, user, group_id)
    org_role = get_user_org_role(db, user, group.organization_id)
    group_role = get_user_group_role(db, user, group_id)
    if org_role not in {"system-admin", "org-admin"} and group_role != "group-admin":
        raise HTTPException(status_code=403, detail="Group admin access required")
    return group


def require_strict_group_member(db: Session, user: models.User, group_id: str) -> models.Group:
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if user.role == "system-admin":
        return group
    group_role = get_user_group_role(db, user, group_id)
    if not group_role:
        raise HTTPException(status_code=403, detail="Bạn chưa là thành viên của nhóm này")
    return group
