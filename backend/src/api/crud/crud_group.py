from sqlalchemy.orm import Session, joinedload
from typing import Optional
import uuid
from .. import models


def create_group(db: Session, group_data: dict, created_by: str) -> models.Group:
    db_group = models.Group(
        id=group_data.get("id", str(uuid.uuid4())),
        organization_id=group_data["organization_id"],
        name=group_data["name"],
        description=group_data.get("description"),
        privacy_level=group_data.get("privacy_level", "private"),
        settings=group_data.get("settings"),
        created_by=created_by,
    )
    db.add(db_group)
    db.flush()

    db_membership = models.GroupMembership(
        id=str(uuid.uuid4()),
        group_id=db_group.id,
        user_id=created_by,
        role="group-admin",
        invited_by=created_by,
    )
    db.add(db_membership)
    db.commit()
    db.refresh(db_group)
    return db_group


def get_group_by_id(db: Session, group_id: str) -> Optional[models.Group]:
    return db.query(models.Group).options(
        joinedload(models.Group.memberships).joinedload(models.GroupMembership.user)
    ).filter(models.Group.id == group_id).first()


def get_groups_by_org(db: Session, organization_id: str) -> list[models.Group]:
    return db.query(models.Group).filter(models.Group.organization_id == organization_id).all()


def update_group(db: Session, group_id: str, updates: dict) -> Optional[models.Group]:
    db_group = get_group_by_id(db, group_id)
    if not db_group:
        return None

    for key, value in updates.items():
        if hasattr(db_group, key):
            setattr(db_group, key, value)

    db.commit()
    db.refresh(db_group)
    return db_group


def delete_group(db: Session, group_id: str) -> bool:
    db_group = get_group_by_id(db, group_id)
    if not db_group:
        return False

    db.delete(db_group)
    db.commit()
    return True


def get_group_memberships(db: Session, group_id: str) -> list[models.GroupMembership]:
    return db.query(models.GroupMembership).options(
        joinedload(models.GroupMembership.user)
    ).filter(models.GroupMembership.group_id == group_id).all()


def get_group_membership(db: Session, group_id: str, user_id: str) -> Optional[models.GroupMembership]:
    return db.query(models.GroupMembership).filter(
        models.GroupMembership.group_id == group_id,
        models.GroupMembership.user_id == user_id,
    ).first()


def add_user_to_group(
    db: Session,
    group_id: str,
    user_id: str,
    role: str = "member",
    invited_by: Optional[str] = None,
    commit: bool = True,
) -> models.GroupMembership:
    existing = get_group_membership(db, group_id, user_id)
    if existing:
        return existing

    db_membership = models.GroupMembership(
        id=str(uuid.uuid4()),
        group_id=group_id,
        user_id=user_id,
        role=role,
        invited_by=invited_by,
    )
    db.add(db_membership)
    if commit:
        db.commit()
    else:
        db.flush()
    db.refresh(db_membership)
    return db_membership


def update_group_membership(
    db: Session,
    group_id: str,
    user_id: str,
    updates: dict,
) -> Optional[models.GroupMembership]:
    db_membership = get_group_membership(db, group_id, user_id)
    if not db_membership:
        return None

    for key, value in updates.items():
        if hasattr(db_membership, key):
            setattr(db_membership, key, value)

    db.commit()
    db.refresh(db_membership)
    return db_membership


def remove_user_from_group(db: Session, group_id: str, user_id: str) -> bool:
    db_membership = get_group_membership(db, group_id, user_id)
    if not db_membership:
        return False

    db.delete(db_membership)
    db.commit()
    return True


# ==================== Group Messages ====================

def create_group_message(
    db: Session,
    group_id: str,
    user_id: str,
    text: str,
    reactions: Optional[list] = None,
    reply_to_id: Optional[str] = None,
) -> models.GroupMessage:
    db_message = models.GroupMessage(
        id=str(uuid.uuid4()),
        group_id=group_id,
        user_id=user_id,
        text=text,
        reactions=reactions or [],
        reply_to_id=reply_to_id,
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message


def get_group_messages(
    db: Session,
    group_id: str,
    limit: int = 50,
    offset: int = 0,
) -> list[models.GroupMessage]:
    return (
        db.query(models.GroupMessage)
        .options(
            joinedload(models.GroupMessage.user),
            joinedload(models.GroupMessage.reply_to).joinedload(models.GroupMessage.user),
        )
        .filter(models.GroupMessage.group_id == group_id)
        .order_by(models.GroupMessage.created_at.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def update_group_message(
    db: Session,
    message_id: str,
    updates: dict,
) -> Optional[models.GroupMessage]:
    db_message = db.query(models.GroupMessage).filter(models.GroupMessage.id == message_id).first()
    if not db_message:
        return None

    for key, value in updates.items():
        if hasattr(db_message, key):
            setattr(db_message, key, value)

    db.commit()
    db.refresh(db_message)
    return db_message


def delete_group_message(db: Session, message_id: str) -> bool:
    db_message = db.query(models.GroupMessage).filter(models.GroupMessage.id == message_id).first()
    if not db_message:
        return False

    db.delete(db_message)
    db.commit()
    return True
