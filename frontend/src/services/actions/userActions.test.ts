import { describe, it, expect, beforeEach } from 'vitest';
import { mockStore } from '../../lib/mockStore/store';
import { reseedForTests } from '../../lib/mockStore/seed';
import { getUser, listUsers } from './userActions';

describe('userActions', () => {
    beforeEach(() => {
        mockStore.reset();
        reseedForTests();
    });

    describe('listUsers', () => {
        it('returns a paginated envelope with success=true', async () => {
            const res = await listUsers();

            expect(res.success).toBe(true);
            expect(res.statusCode).toBe(200);
            expect(res.data).toBeDefined();
            expect(Array.isArray(res.data!.data)).toBe(true);
            expect(res.data!.data.length).toBeGreaterThan(0);
            expect(res.data!.total).toBe(res.data!.total | 0);
        });

        it('respects pageSize and reports hasMore correctly', async () => {
            const total = (await listUsers({ pageSize: 9999 })).data!.total;
            const res = await listUsers({ page: 1, pageSize: 1 });

            expect(res.data!.data).toHaveLength(1);
            expect(res.data!.pageSize).toBe(1);
            expect(res.data!.hasMore).toBe(total > 1);
        });

        it('filters by systemRole', async () => {
            const res = await listUsers({ systemRole: 'system-admin', pageSize: 100 });
            expect(res.data!.data.every((u) => u.systemRole === 'system-admin')).toBe(true);
            // The seed has at least the superadmin user.
            expect(res.data!.data.length).toBeGreaterThan(0);
        });

        it('search matches case-insensitively against email/username/full_name', async () => {
            const res = await listUsers({ search: 'SUPERADMIN', pageSize: 100 });
            expect(res.data!.data.length).toBeGreaterThan(0);
            expect(res.data!.data.every((u) => u.email.toLowerCase().includes('superadmin'))).toBe(true);
        });
    });

    describe('getUser', () => {
        it('returns the user envelope when the id exists', async () => {
            const res = await getUser('user-000');
            expect(res.success).toBe(true);
            expect(res.data?.id).toBe('user-000');
        });

        it('returns 404 envelope when missing', async () => {
            const res = await getUser('does-not-exist');
            expect(res.success).toBe(false);
            expect(res.statusCode).toBe(404);
            expect(res.data).toBeUndefined();
            expect(res.error).toMatch(/not found/i);
        });
    });
});
