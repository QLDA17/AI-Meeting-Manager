/**
 * In-memory mock data store used by the FE Action Layer.
 *
 * Rows mirror the canonical DB schema (see `src/types/db.ts`). UI code MUST
 * NOT touch this module directly — go through `services/actions/*` instead.
 *
 * The store is a singleton; tests should call `mockStore.reset()` in
 * `beforeEach` to get a clean slate.
 */

type Row = { id: string };

type Tables = Map<string, Map<string, Row>>;

class MockStore {
    private tables: Tables = new Map();
    private seedSnapshot: Record<string, Row[]> = {};

    list<T extends Row>(table: string): T[] {
        const tbl = this.tables.get(table);
        return tbl ? (Array.from(tbl.values()) as T[]) : [];
    }

    get<T extends Row>(table: string, id: string): T | undefined {
        return this.tables.get(table)?.get(id) as T | undefined;
    }

    create<T extends Row>(table: string, row: T): T {
        const tbl = this.ensureTable(table);
        if (tbl.has(row.id)) {
            throw new Error(`mockStore: duplicate id "${row.id}" in table "${table}"`);
        }
        tbl.set(row.id, row);
        return row;
    }

    update<T extends Row>(table: string, id: string, patch: Partial<T>): T | undefined {
        const tbl = this.tables.get(table);
        const current = tbl?.get(id) as T | undefined;
        if (!tbl || !current) return undefined;
        const next = { ...current, ...patch, id: current.id };
        tbl.set(id, next as Row);
        return next;
    }

    remove(table: string, id: string): boolean {
        return this.tables.get(table)?.delete(id) ?? false;
    }

    query<T extends Row>(table: string, predicate: (row: T) => boolean): T[] {
        return this.list<T>(table).filter(predicate);
    }

    seed(data: Record<string, Row[]>): void {
        // Deep clone to keep the snapshot immune to caller mutations.
        this.seedSnapshot = JSON.parse(JSON.stringify(data)) as Record<string, Row[]>;
        this.applySeed();
    }

    reset(): void {
        this.applySeed();
    }

    private ensureTable(table: string): Map<string, Row> {
        let tbl = this.tables.get(table);
        if (!tbl) {
            tbl = new Map();
            this.tables.set(table, tbl);
        }
        return tbl;
    }

    private applySeed(): void {
        this.tables = new Map();
        for (const [table, rows] of Object.entries(this.seedSnapshot)) {
            const tbl = this.ensureTable(table);
            for (const row of rows) {
                tbl.set(row.id, JSON.parse(JSON.stringify(row)) as Row);
            }
        }
    }
}

export const mockStore = new MockStore();
