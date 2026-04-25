/**
 * DB row types — snake_case mirror of `database/canonical_schema.sql`.
 *
 * RULES:
 * - One interface per DB table, named `<Table>Row`.
 * - DATETIME columns are stored as ISO 8601 strings here.
 * - TINYINT(1) columns are stored as `0 | 1` here (boolean conversion lives in
 *   mappers).
 * - JSON columns are typed via dedicated interfaces.
 *
 * UI components must NOT import from this file directly. They consume the
 * camelCase view-models in `src/types/index.ts`. Mappers in
 * `src/lib/mappers/*` translate between the two layers.
 */

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------

export type UserRowRole = 'admin' | 'manager' | 'staff';

export interface UserRow {
    id: string;
    username: string;
    email: string;
    hashed_password: string;
    role: UserRowRole;
    full_name: string | null;
    avatar_url: string | null;
    is_active: 0 | 1;
    is_verified: 0 | 1;
    last_login: string | null;
    created_at: string;
    updated_at: string;
}

// ---------------------------------------------------------------------------
// organizations
// ---------------------------------------------------------------------------

export interface OrganizationSettingsJson {
    timezone?: string;
    locale?: 'en' | 'vi' | 'ja';
    [key: string]: unknown;
}

export interface OrganizationRow {
    id: string;
    name: string;
    description: string | null;
    domain: string | null;
    logo_url: string | null;
    settings: OrganizationSettingsJson;
    created_at: string;
    updated_at: string;
}

// ---------------------------------------------------------------------------
// user_organizations
// ---------------------------------------------------------------------------

export type UserOrganizationRowRole = 'owner' | 'admin' | 'member';

export interface UserOrganizationRow {
    id: string;
    user_id: string;
    organization_id: string;
    role: UserOrganizationRowRole;
    joined_at: string;
}

// ---------------------------------------------------------------------------
// projects (a.k.a. "groups" at the UI layer)
// ---------------------------------------------------------------------------

export interface ProjectRow {
    id: string;
    organization_id: string;
    name: string;
    description: string | null;
    color: string | null;
    is_active: 0 | 1;
    created_by: string;
    created_at: string;
    updated_at: string;
}

// ---------------------------------------------------------------------------
// meetings
// ---------------------------------------------------------------------------

export type MeetingRowStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type MeetingRowLlmSource = 'live' | 'fallback' | 'none';
export type MeetingRowType = 'meeting' | 'interview' | 'training' | 'review';

export interface MeetingRow {
    id: string;
    organization_id: string | null;
    project_id: string | null;
    creator_id: string | null;
    title: string;
    description: string | null;
    date: string | null;
    duration: string | null;
    speaker_count: number;
    status: MeetingRowStatus;
    llm_source: MeetingRowLlmSource;
    meeting_type: MeetingRowType;
    scheduled_start: string | null;
    scheduled_end: string | null;
    actual_start: string | null;
    actual_end: string | null;
    location: string | null;
    source_file_name: string | null;
    source_file_path: string | null;
    created_at: string;
    updated_at: string;
}

// ---------------------------------------------------------------------------
// meeting_participants
// ---------------------------------------------------------------------------

export interface MeetingParticipantRow {
    id: string;
    meeting_id: string;
    user_id: string | null;
    speaker_label: string | null;
    email: string | null;
    name: string | null;
    role: string | null;
    is_required: 0 | 1;
    attended: 0 | 1;
    joined_at: string | null;
    left_at: string | null;
    created_at: string;
}

// ---------------------------------------------------------------------------
// Table registry — keeps the mockStore and HTTP transport in lockstep with the
// canonical schema. Adding a table? Add it here AND its `*Row` interface above.
// ---------------------------------------------------------------------------

export interface DbTables {
    users: UserRow;
    organizations: OrganizationRow;
    user_organizations: UserOrganizationRow;
    projects: ProjectRow;
    meetings: MeetingRow;
    meeting_participants: MeetingParticipantRow;
}

export type DbTableName = keyof DbTables;
