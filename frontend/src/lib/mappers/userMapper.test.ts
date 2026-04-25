import { describe, it, expect } from 'vitest';
import { toUserDb, toUserView } from './userMapper';
import type { UserRow } from '../../types/db';
import type { User } from '../../types';

const baseRow: UserRow = {
    id: 'user-001',
    username: 'an.nguyen',
    email: 'an.nguyen@example.com',
    hashed_password: '$$mock$$',
    role: 'manager',
    full_name: 'Nguyễn Văn An',
    avatar_url: 'https://cdn.example.com/avatar.png',
    is_active: 1,
    is_verified: 0,
    last_login: '2025-01-10T08:30:00.000Z',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-05T00:00:00.000Z',
};

describe('userMapper', () => {
    describe('toUserView()', () => {
        it('maps DB role "manager" to FE systemRole "org-admin"', () => {
            expect(toUserView(baseRow).systemRole).toBe('org-admin');
        });

        it('maps DB role "admin" to "system-admin" and "staff" to "member"', () => {
            expect(toUserView({ ...baseRow, role: 'admin' }).systemRole).toBe('system-admin');
            expect(toUserView({ ...baseRow, role: 'staff' }).systemRole).toBe('member');
        });

        it('splits full_name into firstName/lastName and exposes displayName', () => {
            const v = toUserView(baseRow);
            expect(v.firstName).toBe('Nguyễn Văn');
            expect(v.lastName).toBe('An');
            expect(v.displayName).toBe('Nguyễn Văn An');
        });

        it('converts is_active/last_login and DATETIME strings to richer JS types', () => {
            const v = toUserView(baseRow);
            expect(v.isActive).toBe(true);
            expect(v.lastLoginAt).toBeInstanceOf(Date);
            expect(v.lastLoginAt?.toISOString()).toBe('2025-01-10T08:30:00.000Z');
            expect(v.createdAt.toISOString()).toBe('2025-01-01T00:00:00.000Z');
        });

        it('avatar_url=null becomes avatar=undefined', () => {
            const v = toUserView({ ...baseRow, avatar_url: null });
            expect(v.avatar).toBeUndefined();
        });
    });

    describe('toUserDb()', () => {
        const baseUser: User = {
            id: 'user-002',
            email: 'minh.tran@example.com',
            firstName: 'Minh',
            lastName: 'Trần',
            displayName: 'Minh Trần',
            avatar: undefined,
            createdAt: new Date('2025-02-01T00:00:00.000Z'),
            updatedAt: new Date('2025-02-02T00:00:00.000Z'),
            lastLoginAt: undefined,
            isActive: true,
            systemRole: 'group-admin',
            orgMemberships: [],
            groupMemberships: [],
        };

        it('maps systemRole group-admin → DB "manager"', () => {
            expect(toUserDb(baseUser).role).toBe('manager');
        });

        it('falls back to email local-part when no username override', () => {
            expect(toUserDb(baseUser).username).toBe('minh.tran');
        });

        it('respects explicit username/hashedPassword overrides', () => {
            const row = toUserDb(baseUser, { username: 'mtr', hashedPassword: 'X' });
            expect(row.username).toBe('mtr');
            expect(row.hashed_password).toBe('X');
        });

        it('serialises createdAt/updatedAt to ISO strings', () => {
            const row = toUserDb(baseUser);
            expect(row.created_at).toBe('2025-02-01T00:00:00.000Z');
            expect(row.updated_at).toBe('2025-02-02T00:00:00.000Z');
        });
    });

    describe('round-trip', () => {
        it('toUserView(toUserDb(view)) preserves observable fields', () => {
            const original: User = toUserView(baseRow);
            const round = toUserView(toUserDb(original, { username: baseRow.username }));

            expect(round.id).toBe(original.id);
            expect(round.email).toBe(original.email);
            expect(round.systemRole).toBe(original.systemRole);
            expect(round.firstName).toBe(original.firstName);
            expect(round.lastName).toBe(original.lastName);
            expect(round.isActive).toBe(original.isActive);
            expect(round.createdAt.toISOString()).toBe(original.createdAt.toISOString());
        });
    });
});
