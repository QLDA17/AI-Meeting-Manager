/**
 * Action Layer transport. Today: in-memory mockStore. Tomorrow (Phase 5):
 * HTTP via `services/api.ts`. Actions call into `transport` so the swap is a
 * one-line change driven by `VITE_USE_MOCK`.
 *
 * Each op is named `<table>.<verb>` (e.g. `users.list`) so the same identifier
 * maps cleanly to a future RPC route.
 */

import { mockStore } from '../lib/mockStore/store';
import type { DbTableName, DbTables } from '../types/db';
import type { ApiResponse } from '../types';

const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? 'true') !== 'false';

const DEFAULT_LATENCY_MS = 0; // bumped to 80–200 in Phase 1+ for realistic loading UI.

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function ok<T>(data: T, statusCode = 200): ApiResponse<T> {
    return { success: true, data, statusCode };
}

function fail<T>(error: string, statusCode = 500): ApiResponse<T> {
    return { success: false, error, statusCode };
}

export interface TransportRunArgs<TTable extends DbTableName, TOut> {
    op: `${TTable}.${string}`;
    table: TTable;
    handler: (rows: DbTables[TTable][]) => TOut;
}

export interface TransportRunOneArgs<TTable extends DbTableName, TOut> {
    op: `${TTable}.${string}`;
    table: TTable;
    id: string;
    map: (row: DbTables[TTable]) => TOut;
}

export const transport = {
    isMock: USE_MOCK,

    async run<TTable extends DbTableName, TOut>(
        args: TransportRunArgs<TTable, TOut>,
    ): Promise<ApiResponse<TOut>> {
        if (!USE_MOCK) return fail<TOut>('HTTP transport not enabled (Phase 5)', 503);
        try {
            if (DEFAULT_LATENCY_MS > 0) await delay(DEFAULT_LATENCY_MS);
            const rows = mockStore.list<DbTables[TTable]>(args.table);
            return ok(args.handler(rows));
        } catch (e) {
            return fail<TOut>(e instanceof Error ? e.message : String(e));
        }
    },

    async runOne<TTable extends DbTableName, TOut>(
        args: TransportRunOneArgs<TTable, TOut>,
    ): Promise<ApiResponse<TOut>> {
        if (!USE_MOCK) return fail<TOut>('HTTP transport not enabled (Phase 5)', 503);
        try {
            if (DEFAULT_LATENCY_MS > 0) await delay(DEFAULT_LATENCY_MS);
            const row = mockStore.get<DbTables[TTable]>(args.table, args.id);
            if (!row) return fail<TOut>(`${args.table} ${args.id} not found`, 404);
            return ok(args.map(row));
        } catch (e) {
            return fail<TOut>(e instanceof Error ? e.message : String(e));
        }
    },
};
