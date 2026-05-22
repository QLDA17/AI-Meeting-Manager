from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date, datetime, time
import uuid
from .. import models, auth


def get_user_by_id(db: Session, user_id: str) -> Optional[models.User]:
    return db.query(models.User).options(
        joinedload(models.User.user_organizations).joinedload(models.UserOrganization.organization),
        joinedload(models.User.group_memberships).joinedload(models.GroupMembership.group)
    ).filter(models.User.id == user_id).first()


def get_user_by_username(db: Session, username: str) -> Optional[models.User]:
    return db.query(models.User).options(
        joinedload(models.User.user_organizations).joinedload(models.UserOrganization.organization),
        joinedload(models.User.group_memberships).joinedload(models.GroupMembership.group)
    ).filter(models.User.username == username).first()


def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()


def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[models.User]:
    return db.query(models.User).offset(skip).limit(limit).all()


def _as_datetime(value):
    if isinstance(value, datetime) or value is None:
        return value
    if isinstance(value, date):
        return datetime.combine(value, time.min)
    if isinstance(value, str) and value:
        return datetime.fromisoformat(value)
    return None


def create_user(db: Session, user_data: dict, commit: bool = True) -> models.User:
    hashed_password = auth.get_password_hash(user_data["password"])
    db_user = models.User(
        id=user_data.get("id", str(uuid.uuid4())),
        username=user_data["username"],
        email=user_data["email"],
        password_hash=hashed_password,
        role=user_data.get("role", "member"),
        first_name=user_data.get("first_name"),
        last_name=user_data.get("last_name"),
        avatar_url=user_data.get("avatar_url"),
        bio=user_data.get("bio"),
        language=user_data.get("language", "vi"),
        timezone=user_data.get("timezone", "Asia/Ho_Chi_Minh"),
        notification_preferences=user_data.get("notification_preferences"),
        is_active=user_data.get("is_active", True),
        is_verified=user_data.get("is_verified", False),
        phone=user_data.get("phone"),
        gender=user_data.get("gender"),
        date_of_birth=_as_datetime(user_data.get("date_of_birth")),
    )
    db.add(db_user)
    if commit:
        db.commit()
    else:
        db.flush()
    db.refresh(db_user)
    return db_user


def update_user(db: Session, user_id: str, updates: dict) -> Optional[models.User]:
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return None
    
    # Handle password update separately
    if "password" in updates:
        updates["password_hash"] = auth.get_password_hash(updates.pop("password"))
    
    for key, value in updates.items():
        if hasattr(db_user, key):
            setattr(db_user, key, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user


def delete_user(db: Session, user_id: str) -> bool:
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return False

    db.delete(db_user)
    db.commit()
    return True


def create_password_reset_otp(db: Session, user_id: str, email: str, otp: str, expires_at: datetime) -> models.PasswordResetOtp:
    db_otp = models.PasswordResetOtp(
        id=str(uuid.uuid4()),
        user_id=user_id,
        email=email.lower(),
        otp_hash=auth.get_password_hash(otp),
        expires_at=expires_at,
    )
    db.add(db_otp)
    db.commit()
    db.refresh(db_otp)
    return db_otp


def get_valid_password_reset_otp(db: Session, email: str, otp: str, now: datetime) -> Optional[models.PasswordResetOtp]:
    db_otps = db.query(models.PasswordResetOtp).filter(
        models.PasswordResetOtp.email == email.lower(),
        models.PasswordResetOtp.used_at.is_(None),
        models.PasswordResetOtp.expires_at > now,
    ).order_by(models.PasswordResetOtp.created_at.desc()).limit(5).all()

    for db_otp in db_otps:
        if auth.verify_password(otp, db_otp.otp_hash):
            return db_otp
    return None


def mark_password_reset_otp_used(db: Session, otp_id: str, used_at: datetime) -> Optional[models.PasswordResetOtp]:
    db_otp = db.query(models.PasswordResetOtp).filter(models.PasswordResetOtp.id == otp_id).first()
    if not db_otp:
        return None

    db_otp.used_at = used_at
    db.commit()
    db.refresh(db_otp)
    return db_otp
