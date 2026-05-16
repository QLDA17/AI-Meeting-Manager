from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import uuid
from .. import models


def get_organization_by_id(db: Session, org_id: str) -> Optional[models.Organization]:
    return db.query(models.Organization).filter(models.Organization.id == org_id).first()


def get_organizations(db: Session, skip: int = 0, limit: int = 100) -> List[models.Organization]:
    return db.query(models.Organization).offset(skip).limit(limit).all()


def create_organization(db: Session, org_data: dict, commit: bool = True) -> models.Organization:
    db_org = models.Organization(
        id=org_data.get("id", str(uuid.uuid4())),
        name=org_data["name"],
        description=org_data.get("description"),
        domain=org_data.get("domain"),
        logo_url=org_data.get("logo_url"),
        settings=org_data.get("settings"),
    )
    db.add(db_org)
    if commit:
        db.commit()
    else:
        db.flush()
    db.refresh(db_org)
    return db_org


def update_organization(db: Session, org_id: str, updates: dict) -> Optional[models.Organization]:
    db_org = get_organization_by_id(db, org_id)
    if not db_org:
        return None
    
    for key, value in updates.items():
        if hasattr(db_org, key):
            setattr(db_org, key, value)
    
    db.commit()
    db.refresh(db_org)
    return db_org


def delete_organization(db: Session, org_id: str) -> bool:
    db_org = get_organization_by_id(db, org_id)
    if not db_org:
        return False
    
    db.delete(db_org)
    db.commit()
    return True


def add_user_to_organization(
    db: Session,
    user_id: str,
    org_id: str,
    role: str = "member",
    commit: bool = True,
) -> Optional[models.UserOrganization]:
    # Check if already exists
    existing = db.query(models.UserOrganization).filter(
        models.UserOrganization.user_id == user_id,
        models.UserOrganization.organization_id == org_id
    ).first()
    
    if existing:
        return existing
    
    db_user_org = models.UserOrganization(
        id=str(uuid.uuid4()),
        user_id=user_id,
        organization_id=org_id,
        role=role,
    )
    db.add(db_user_org)
    if commit:
        db.commit()
    else:
        db.flush()
    db.refresh(db_user_org)
    return db_user_org


def update_user_organization_role(
    db: Session,
    user_id: str,
    org_id: str,
    role: str,
) -> Optional[models.UserOrganization]:
    db_user_org = db.query(models.UserOrganization).filter(
        models.UserOrganization.user_id == user_id,
        models.UserOrganization.organization_id == org_id,
    ).first()

    if not db_user_org:
        return None

    db_user_org.role = role
    db.commit()
    db.refresh(db_user_org)
    return db_user_org


def remove_user_from_organization(db: Session, user_id: str, org_id: str) -> bool:
    db_user_org = db.query(models.UserOrganization).filter(
        models.UserOrganization.user_id == user_id,
        models.UserOrganization.organization_id == org_id
    ).first()
    
    if not db_user_org:
        return False
    
    db.delete(db_user_org)
    db.commit()
    return True
