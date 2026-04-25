/**
 * `users` table actions — the only sanctioned way for UI code to read/write
 * users. See `.gemini/skills/action-layer-architect/SKILL.md`.
 */

import { transport } from '../transport';
import { toUserView } from '../../lib/mappers/userMapper';
import type { ApiResponse, PaginatedResponse, SystemRole, User } from '../../types';

export interface ListUsersInput {
    /** Substring match against full name / email / username. Case-insensitive. */
    search?: string;
    /** Filter by FE systemRole; mapped through userMapper at compare time. */
    systemRole?: SystemRole;
    page?: number;
    pageSize?: number;
}

export async function listUsers(
    input: ListUsersInput = {},
): Promise<ApiResponse<PaginatedResponse<User>>> {
    return transport.run({
        op: 'users.list',
        table: 'users',
        handler: (rows) => {
            const search = input.search?.trim().toLowerCase();
            const filtered = rows.filter((row) => {
                if (search) {
                    const haystack = `${row.username} ${row.email} ${row.full_name ?? ''}`.toLowerCase();
                    if (!haystack.includes(search)) return false;
                }
                if (input.systemRole) {
                    if (toUserView(row).systemRole !== input.systemRole) return false;
                }
                return true;
            });

            const page = input.page ?? 1;
            const pageSize = input.pageSize ?? 20;
            const start = (page - 1) * pageSize;
            const slice = filtered.slice(start, start + pageSize).map(toUserView);

            return {
                data: slice,
                total: filtered.length,
                page,
                pageSize,
                hasMore: start + pageSize < filtered.length,
            };
        },
    });
}

export async function getUser(id: string): Promise<ApiResponse<User>> {
    return transport.runOne({
        op: 'users.get',
        table: 'users',
        id,
        map: toUserView,
    });
}
