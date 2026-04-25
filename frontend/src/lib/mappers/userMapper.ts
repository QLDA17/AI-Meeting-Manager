/**
 * Two-way mapping between `users` rows (DB shape, snake_case) and the
 * camelCase `User` view-model the UI consumes. See:
 * - `database/canonical_schema.sql` for the column definitions
 * - `.gemini/skills/db-schema-alignment/SKILL.md` for the role-mapping policy
 */

import type { SystemRole, User } from '../../types';
import type { UserRow, UserRowRole } from '../../types/db';

const DB_TO_FE_ROLE: Record<UserRowRole, SystemRole> = {
    admin: 'system-admin',
    manager: 'org-admin',
    staff: 'member',
};

const FE_TO_DB_ROLE: Record<SystemRole, UserRowRole> = {
    'system-admin': 'admin',
    'org-admin': 'manager',
    'group-admin': 'manager',
    member: 'staff',
    viewer: 'staff',
};

function splitFullName(fullName: string | null): { firstName: string; lastName: string } {
    if (!fullName) return { firstName: '', lastName: '' };
    const trimmed = fullName.trim();
    if (!trimmed) return { firstName: '', lastName: '' };
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    return {
        firstName: parts.slice(0, -1).join(' '),
        lastName: parts.slice(-1).join(' '),
    };
}

function buildFullName(firstName: string, lastName: string, displayName?: string): string | null {
    const combined = `${firstName ?? ''} ${lastName ?? ''}`.trim();
    if (combined) return combined;
    if (displayName) return displayName;
    return null;
}

export function toUserView(row: UserRow): User {
    const { firstName, lastName } = splitFullName(row.full_name);
    return {
        id: row.id,
        email: row.email,
        firstName,
        lastName,
        displayName: row.full_name ?? (`${firstName} ${lastName}`.trim() || row.username),
        avatar: row.avatar_url ?? undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        lastLoginAt: row.last_login ? new Date(row.last_login) : undefined,
        isActive: row.is_active === 1,
        systemRole: DB_TO_FE_ROLE[row.role],
        // Memberships live in `user_organizations` / group tables — joined in
        // dedicated actions, not here.
        orgMemberships: [],
        groupMemberships: [],
    };
}

export interface ToUserDbOptions {
    /** Optional explicit username; defaults to the email's local part. */
    username?: string;
    /** Optional pre-hashed password; defaults to a placeholder for mock data. */
    hashedPassword?: string;
}

export function toUserDb(user: User, opts: ToUserDbOptions = {}): UserRow {
    const fullName = buildFullName(user.firstName, user.lastName, user.displayName);
    const role: UserRowRole = user.systemRole ? FE_TO_DB_ROLE[user.systemRole] : 'staff';
    return {
        id: user.id,
        username: opts.username ?? user.email.split('@')[0] ?? user.id,
        email: user.email,
        hashed_password: opts.hashedPassword ?? '$$mock$$',
        role,
        full_name: fullName,
        avatar_url: user.avatar ?? null,
        is_active: user.isActive ? 1 : 0,
        is_verified: 0,
        last_login: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
        created_at: user.createdAt.toISOString(),
        updated_at: user.updatedAt.toISOString(),
    };
}
