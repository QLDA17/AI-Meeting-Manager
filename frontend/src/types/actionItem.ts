export interface ActionItemAssigneeOption {
    email: string;
    label: string;
    user_id?: string;
}

export interface ActionItemAssignee {
    id: string;
    user_id?: string;
    email: string;
    display_name?: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    completed_at?: string;
    created_at: string;
    updated_at: string;
}

export interface ActionItem {
    id: string;
    meeting_id?: string;
    meeting_title?: string; // Optional denormalized for UI
    assignee_options?: ActionItemAssigneeOption[];
    assignees: ActionItemAssignee[];
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
    assignee_user_ids?: string[];
    assignee_emails?: string[];
    assign_all_participants?: boolean;
    status?: string;
    priority?: string;
    due_date?: string;
}

export interface ActionItemUpdate {
    title?: string;
    description?: string | null;
    assigned_to?: string | null;
    assigned_email?: string | null;
    assignee_user_ids?: string[] | null;
    assignee_emails?: string[] | null;
    assign_all_participants?: boolean;
    status?: string;
    priority?: string;
    due_date?: string | null;
}
