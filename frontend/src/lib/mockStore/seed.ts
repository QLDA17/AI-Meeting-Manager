/**
 * Single entry point that loads the legacy `data/*.ts` view-models, runs them
 * through their respective mappers, and seeds the canonical `mockStore` with
 * DB-shaped rows. Imported once at app boot (and during tests that need a
 * realistic snapshot).
 */

import { mockUsers } from '../../data/users';
import { toUserDb } from '../mappers/userMapper';
import { mockStore } from './store';
import type { DbTableName, DbTables } from '../../types/db';

type SeedPayload = { [K in DbTableName]?: DbTables[K][] };

function buildSeed(): SeedPayload {
    return {
        users: mockUsers.map((u) =>
            toUserDb(u, {
                username: u.email.split('@')[0] ?? u.id,
            }),
        ),
        // Other tables are seeded in subsequent phases.
    };
}

let didBootSeed = false;

export function bootSeed(): void {
    if (didBootSeed) return;
    didBootSeed = true;
    mockStore.seed(buildSeed() as Record<string, { id: string }[]>);
}

export function reseedForTests(): void {
    mockStore.seed(buildSeed() as Record<string, { id: string }[]>);
}
