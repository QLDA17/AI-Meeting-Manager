import { describe, it, expect, beforeEach } from 'vitest';
import { mockStore } from './store';
import type { UserRow } from '../../types/db';

const aUser = (overrides: Partial<UserRow> = {}): UserRow => ({
    id: 'user-test-1',
    username: 'tester',
    email: 'tester@example.com',
    hashed_password: '$$mock$$',
    role: 'staff',
    full_name: 'Tester',
    avatar_url: null,
    is_active: 1,
    is_verified: 0,
    last_login: null,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
    ...overrides,
});

describe('mockStore', () => {
    beforeEach(() => {
        mockStore.reset();
        // Replace any auto-seeded data with an empty `users` table for these unit tests.
        mockStore.seed({ users: [] });
    });

    it('list() returns an empty array for an empty table', () => {
        expect(mockStore.list<UserRow>('users')).toEqual([]);
    });

    it('create() inserts a row and get() retrieves it by id', () => {
        const row = aUser();
        mockStore.create<UserRow>('users', row);

        expect(mockStore.get<UserRow>('users', row.id)).toEqual(row);
        expect(mockStore.list<UserRow>('users')).toHaveLength(1);
    });

    it('create() with duplicate id throws', () => {
        const row = aUser();
        mockStore.create<UserRow>('users', row);
        expect(() => mockStore.create<UserRow>('users', row)).toThrow(/duplicate/i);
    });

    it('update() patches an existing row and returns the new state', () => {
        const row = aUser();
        mockStore.create<UserRow>('users', row);

        const updated = mockStore.update<UserRow>('users', row.id, {
            full_name: 'Renamed',
        });

        expect(updated?.full_name).toBe('Renamed');
        expect(mockStore.get<UserRow>('users', row.id)?.full_name).toBe('Renamed');
    });

    it('update() returns undefined for a missing id', () => {
        expect(mockStore.update<UserRow>('users', 'missing', { full_name: 'x' })).toBeUndefined();
    });

    it('remove() deletes the row and returns true; subsequent remove returns false', () => {
        const row = aUser();
        mockStore.create<UserRow>('users', row);

        expect(mockStore.remove('users', row.id)).toBe(true);
        expect(mockStore.remove('users', row.id)).toBe(false);
        expect(mockStore.get<UserRow>('users', row.id)).toBeUndefined();
    });

    it('query() filters by predicate', () => {
        mockStore.create<UserRow>('users', aUser({ id: 'a', role: 'admin' }));
        mockStore.create<UserRow>('users', aUser({ id: 'b', role: 'staff' }));
        mockStore.create<UserRow>('users', aUser({ id: 'c', role: 'admin' }));

        const admins = mockStore.query<UserRow>('users', (r) => r.role === 'admin');
        expect(admins.map((u) => u.id).sort()).toEqual(['a', 'c']);
    });

    it('seed() replaces rows wholesale; reset() restores last-seeded state', () => {
        mockStore.seed({ users: [aUser({ id: 'seed-1' })] });
        expect(mockStore.list<UserRow>('users').map((u) => u.id)).toEqual(['seed-1']);

        mockStore.create<UserRow>('users', aUser({ id: 'mutated' }));
        expect(mockStore.list<UserRow>('users')).toHaveLength(2);

        mockStore.reset();
        expect(mockStore.list<UserRow>('users').map((u) => u.id)).toEqual(['seed-1']);
    });

    it('list() returns a defensive copy (mutating result does not affect the store)', () => {
        const row = aUser();
        mockStore.create<UserRow>('users', row);

        const snapshot = mockStore.list<UserRow>('users');
        snapshot.length = 0;

        expect(mockStore.list<UserRow>('users')).toHaveLength(1);
    });
});
