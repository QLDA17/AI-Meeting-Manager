export interface ActionItem {
    id: string;
    meeting_id?: string;
    meeting_title?: string; // Optional denormalized for UI
    summary_id?: string;
    title: string;
    description?: string;
    assigned_to?: string;
    assigned_email?: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    due_date?: string;
    completed_at?: string;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface ActionItemCreate {
    meeting_id?: string;
    summary_id?: string;
    title: string;
    description?: string;
    assigned_to?: string;
    assigned_email?: string;
    status?: string;
    priority?: string;
    due_date?: string;
}

export interface ActionItemUpdate {
    title?: string;
    description?: string;
    assigned_to?: string;
    assigned_email?: string;
    status?: string;
    priority?: string;
    due_date?: string;
}
