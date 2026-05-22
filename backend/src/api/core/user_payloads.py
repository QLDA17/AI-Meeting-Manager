from typing import Any, Dict, Optional

from src.api import models


def normalize_global_role(role: Optional[str]) -> str:
    return "system-admin" if role == "system-admin" else "member"


def get_organization_approval_status(org: models.Organization) -> str:
    settings = org.settings or {}
    return settings.get("approval_status", "active")


def format_user_payload(user: models.User) -> Dict[str, Any]:
    display_name = " ".join(part for part in [user.first_name, user.last_name] if part).strip() or user.username
    system_role = normalize_global_role(user.role)
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": system_role,
        "systemRole": system_role,
        "displayName": display_name,
        "firstName": user.first_name,
        "lastName": user.last_name,
        "avatarUrl": user.avatar_url,
        "bio": user.bio,
        "phone": user.phone,
        "gender": user.gender,
        "dateOfBirth": user.date_of_birth.isoformat() if user.date_of_birth else None,
        "language": user.language or "vi",
        "timezone": user.timezone or "Asia/Ho_Chi_Minh",
        "notificationPreferences": user.notification_preferences or {},
        "isActive": user.is_active,
        "createdAt": user.created_at.isoformat() if user.created_at else None,
        "updatedAt": user.updated_at.isoformat() if user.updated_at else None,
        "orgMemberships": [
            {
                "orgId": om.organization_id,
                "role": om.role,
                "orgName": om.organization.name if om.organization else None,
                "approvalStatus": get_organization_approval_status(om.organization) if om.organization else "active",
            }
            for om in user.user_organizations
        ],
        "groupMemberships": [
            {"groupId": gm.group_id, "role": gm.role, "groupName": gm.group.name if gm.group else None}
            for gm in user.group_memberships
        ],
    }
