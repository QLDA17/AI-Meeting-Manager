from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session, joinedload

from src.api import auth, models, schemas
from src.api.core.action_item_support import (
    action_item_assigned_to_user,
    action_item_manageable_by_user,
    action_item_manager_error_detail,
    action_item_visible_to_user,
    broadcast_action_item_deleted,
    broadcast_action_item_updated,
    require_action_item_manager_for_meeting,
    resolve_action_item_assignees,
    serialize_action_item_payload,
)
from src.api.core.admin_runtime import append_admin_audit_log
from src.api.crud import (
    create_action_item,
    create_glossary_term,
    delete_action_item,
    delete_glossary_term,
    get_action_item_by_id,
    get_glossary_term_by_id,
    get_glossary_terms,
    update_action_item,
    update_glossary_term,
)


def user_org_ids(user: models.User) -> List[str]:
    return [membership.organization_id for membership in user.user_organizations]


def meeting_participant_meeting_ids_for_user(db: Session, user: models.User):
    email = (user.email or "").lower()
    participant_filter = models.MeetingParticipant.user_id == user.id
    if email:
        participant_filter = or_(
            participant_filter,
            func.lower(models.MeetingParticipant.email) == email,
        )
    return db.query(models.MeetingParticipant.meeting_id).filter(
        participant_filter,
        or_(
            models.MeetingParticipant.invite_status.is_(None),
            models.MeetingParticipant.invite_status != "declined",
        ),
    )


def list_glossary_terms_payload(
    organization_id: Optional[str],
    category: Optional[str],
    is_active: Optional[bool],
    skip: int,
    limit: int,
    db: Session,
    current_user: models.User,
) -> List[schemas.GlossaryTerm]:
    if organization_id:
        auth.require_org_member(db, current_user, organization_id)
        return get_glossary_terms(
            db,
            organization_id=organization_id,
            category=category,
            is_active=is_active,
            skip=skip,
            limit=limit,
        )

    query = db.query(models.GlossaryTerm)
    if current_user.role != "system-admin":
        query = query.filter(
            or_(
                models.GlossaryTerm.organization_id.is_(None),
                models.GlossaryTerm.organization_id.in_(user_org_ids(current_user)),
            )
        )
    if category:
        query = query.filter(models.GlossaryTerm.category == category)
    if is_active is not None:
        query = query.filter(models.GlossaryTerm.is_active == is_active)
    return query.order_by(models.GlossaryTerm.term).offset(skip).limit(limit).all()


def create_glossary_term_payload(
    term: schemas.GlossaryTermCreate,
    db: Session,
    current_user: models.User,
) -> schemas.GlossaryTerm:
    if term.organization_id:
        auth.require_org_admin(db, current_user, term.organization_id)
    elif current_user.role != "system-admin":
        raise HTTPException(status_code=403, detail="System admin access required for global glossary terms")
    return create_glossary_term(db, term.model_dump(), current_user.id)


def update_glossary_term_payload(
    term_id: str,
    updates: schemas.GlossaryTermUpdate,
    db: Session,
    current_user: models.User,
) -> schemas.GlossaryTerm:
    term = get_glossary_term_by_id(db, term_id)
    if not term:
        raise HTTPException(status_code=404, detail="Glossary term not found")
    if term.organization_id:
        auth.require_org_admin(db, current_user, term.organization_id)
    elif current_user.role != "system-admin":
        raise HTTPException(status_code=403, detail="System admin access required for global glossary terms")
    return update_glossary_term(db, term_id, updates.model_dump(exclude_unset=True))


def delete_glossary_term_payload(term_id: str, db: Session, current_user: models.User) -> Dict[str, str]:
    term = get_glossary_term_by_id(db, term_id)
    if not term:
        raise HTTPException(status_code=404, detail="Glossary term not found")
    if term.organization_id:
        auth.require_org_admin(db, current_user, term.organization_id)
    elif current_user.role != "system-admin":
        raise HTTPException(status_code=403, detail="System admin access required for global glossary terms")
    delete_glossary_term(db, term_id)
    return {"message": "Glossary term deleted successfully"}


def list_action_items_payload(
    db: Session,
    current_user: models.User,
    meeting_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[schemas.ActionItem]:
    query = db.query(models.ActionItem).options(
        joinedload(models.ActionItem.meeting)
        .joinedload(models.Meeting.participants)
        .joinedload(models.MeetingParticipant.user),
        joinedload(models.ActionItem.meeting).joinedload(models.Meeting.speaker_mappings),
        joinedload(models.ActionItem.meeting).joinedload(models.Meeting.transcripts),
        joinedload(models.ActionItem.assignees).joinedload(models.ActionItemAssignee.user),
    )

    if meeting_id:
        meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        from src.api.core.meeting_operations import require_meeting_room_access

        require_meeting_room_access(db, current_user, meeting)
        query = query.filter(models.ActionItem.meeting_id == meeting_id)
    else:
        participant_meeting_ids = meeting_participant_meeting_ids_for_user(db, current_user)
        user_email = (current_user.email or "").lower()
        assigned_filters = [models.ActionItem.assignees.any(models.ActionItemAssignee.user_id == current_user.id)]
        if user_email:
            assigned_filters.append(
                models.ActionItem.assignees.any(func.lower(models.ActionItemAssignee.email) == user_email)
            )
        query = query.filter(
            or_(
                *assigned_filters,
                and_(
                    ~models.ActionItem.assignees.any(),
                    or_(
                        and_(
                            models.ActionItem.meeting_id.is_(None),
                            models.ActionItem.created_by == current_user.id,
                        ),
                        models.ActionItem.meeting_id.in_(participant_meeting_ids),
                    ),
                ),
            )
        )

    if status:
        query = query.filter(models.ActionItem.status == status)

    items = query.order_by(models.ActionItem.created_at.desc()).offset(skip).limit(limit).all()
    return [serialize_action_item_payload(item) for item in items]


def create_action_item_payload(
    action_item: schemas.ActionItemCreate,
    db: Session,
    current_user: models.User,
) -> schemas.ActionItem:
    meeting = None
    if action_item.meeting_id:
        meeting = db.query(models.Meeting).filter(models.Meeting.id == action_item.meeting_id).first()
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        require_action_item_manager_for_meeting(db, current_user, meeting)

    action_data = resolve_action_item_assignees(db, action_item.model_dump(), meeting)
    created = create_action_item(db, action_data, current_user.id)
    append_admin_audit_log(
        actor=current_user.username,
        action="CREATE_ACTION_ITEM",
        target=created.title,
        role=current_user.role or "member",
    )
    payload = serialize_action_item_payload(created)
    broadcast_action_item_updated(created)
    return payload


def update_action_item_payload(
    action_id: str,
    updates: schemas.ActionItemUpdate,
    db: Session,
    current_user: models.User,
) -> schemas.ActionItem:
    db_action = get_action_item_by_id(db, action_id)
    if not db_action:
        raise HTTPException(status_code=404, detail="Action item not found")
    if not action_item_visible_to_user(db, db_action, current_user):
        raise HTTPException(status_code=403, detail="Action item access denied")

    meeting = None
    if db_action.meeting_id:
        meeting = db.query(models.Meeting).filter(models.Meeting.id == db_action.meeting_id).first()
    update_data = updates.model_dump(exclude_unset=True)
    is_manager = action_item_manageable_by_user(db, db_action, current_user)
    is_assignee = action_item_assigned_to_user(db_action, current_user)

    if not is_manager:
        if not is_assignee:
            if meeting:
                raise HTTPException(status_code=403, detail=action_item_manager_error_detail(meeting))
            raise HTTPException(status_code=403, detail="Action item access denied")
        raise HTTPException(status_code=403, detail="Use /assignees/me for personal status updates")

    update_data = resolve_action_item_assignees(
        db,
        update_data,
        meeting,
        current_assignees=list(db_action.assignees or []),
    )
    updated = update_action_item(db, action_id, update_data)
    append_admin_audit_log(
        actor=current_user.username,
        action="UPDATE_ACTION_ITEM",
        target=updated.title if updated else action_id,
        role=current_user.role or "member",
    )
    payload = serialize_action_item_payload(updated)
    broadcast_action_item_updated(updated)
    return payload


def update_my_action_item_assignment_payload(
    action_id: str,
    updates: schemas.ActionItemAssigneeStatusUpdate,
    db: Session,
    current_user: models.User,
) -> schemas.ActionItem:
    db_action = get_action_item_by_id(db, action_id)
    if not db_action:
        raise HTTPException(status_code=404, detail="Action item not found")
    if not action_item_assigned_to_user(db_action, current_user):
        raise HTTPException(status_code=403, detail="Action item access denied")

    user_email = (current_user.email or "").lower()
    target = next(
        (
            assignee for assignee in (db_action.assignees or [])
            if assignee.user_id == current_user.id or ((assignee.email or "").lower() == user_email and user_email)
        ),
        None,
    )
    if not target:
        raise HTTPException(status_code=404, detail="Action item assignee not found")

    next_status = updates.status
    target.status = next_status
    target.completed_at = datetime.now() if next_status == "COMPLETED" else None
    update_action_item(
        db,
        action_id,
        {
            "assignees": [
                {
                    "user_id": assignee.user_id,
                    "email": assignee.email,
                    "display_name": assignee.display_name,
                    "status": assignee.status,
                    "completed_at": assignee.completed_at,
                }
                for assignee in (db_action.assignees or [])
            ]
        },
    )
    refreshed = get_action_item_by_id(db, action_id)
    payload = serialize_action_item_payload(refreshed)
    broadcast_action_item_updated(refreshed)
    return payload


def delete_action_item_payload(action_id: str, db: Session, current_user: models.User) -> Dict[str, str]:
    db_action = get_action_item_by_id(db, action_id)
    if not db_action:
        raise HTTPException(status_code=404, detail="Action item not found")
    if not action_item_manageable_by_user(db, db_action, current_user):
        if db_action.meeting_id:
            meeting = db.query(models.Meeting).filter(models.Meeting.id == db_action.meeting_id).first()
            if meeting:
                raise HTTPException(status_code=403, detail=action_item_manager_error_detail(meeting))
        raise HTTPException(status_code=403, detail="Action item access denied")

    deleted_title = db_action.title
    deleted_meeting_id = db_action.meeting_id
    delete_action_item(db, action_id)
    append_admin_audit_log(
        actor=current_user.username,
        action="DELETE_ACTION_ITEM",
        target=deleted_title,
        role=current_user.role or "member",
    )
    broadcast_action_item_deleted(deleted_meeting_id, action_id)
    return {"message": "Action item deleted successfully"}
