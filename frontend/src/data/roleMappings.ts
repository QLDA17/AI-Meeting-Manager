/**
 * Role Mappings - Tách riêng role của user trong orgs/groups
 * Giống như DB table: org_user_roles, group_user_roles
 */

// Role của user trong Organization
export interface OrgUserRole {
  userId: string;
  orgId: string;
  role: 'org-admin' | 'member' | 'viewer';
  joinedAt: Date;
}

// Role của user trong Group
export interface GroupUserRole {
  userId: string;
  groupId: string;
  role: 'group-admin' | 'member' | 'viewer';
  joinedAt: Date;
}

// Org User Roles - ai là gì trong org nào
export const orgUserRoles: OrgUserRole[] = [
  // user-000 (System Admin) - là org-admin của cả 2 orgs
  { userId: 'user-000', orgId: 'org-001', role: 'org-admin', joinedAt: new Date('2024-01-01') },
  { userId: 'user-000', orgId: 'org-002', role: 'org-admin', joinedAt: new Date('2024-01-01') },

  // user-001 (Nguyễn Văn A) - Org Admin của ABC Company, Member của XYZ Corp
  { userId: 'user-001', orgId: 'org-001', role: 'org-admin', joinedAt: new Date('2025-01-01') },
  { userId: 'user-001', orgId: 'org-002', role: 'member', joinedAt: new Date('2025-02-01') },

  // user-002 (Trần Thị B) - Member của ABC Company
  { userId: 'user-002', orgId: 'org-001', role: 'member', joinedAt: new Date('2025-01-02') },

  // user-003 (Phạm Văn C) - Member của ABC Company
  { userId: 'user-003', orgId: 'org-001', role: 'member', joinedAt: new Date('2025-01-03') },

  // user-004 (Hoàng Hữu D) - Member của ABC Company
  { userId: 'user-004', orgId: 'org-001', role: 'member', joinedAt: new Date('2025-01-04') },

  // user-009 (Viewer) - Viewer của ABC Company
  { userId: 'user-009', orgId: 'org-001', role: 'viewer', joinedAt: new Date('2025-01-07') },

  // XYZ Corp users
  { userId: 'user-007', orgId: 'org-002', role: 'org-admin', joinedAt: new Date('2025-02-01') },
  { userId: 'user-008', orgId: 'org-002', role: 'member', joinedAt: new Date('2025-02-02') },

  // user-011: Đa vai trò - member trong cả 3 orgs
  { userId: 'user-011', orgId: 'org-001', role: 'member', joinedAt: new Date('2025-01-10') },
  { userId: 'user-011', orgId: 'org-003', role: 'member', joinedAt: new Date('2025-03-01') },
  { userId: 'user-011', orgId: 'org-004', role: 'member', joinedAt: new Date('2025-02-01') },
];

// Group User Roles - ai là gì trong group nào
export const groupUserRoles: GroupUserRole[] = [
  // user-000 (System Admin) - group-admin của group-001 và group-004
  { userId: 'user-000', groupId: 'group-001', role: 'group-admin', joinedAt: new Date('2024-01-01') },
  { userId: 'user-000', groupId: 'group-004', role: 'group-admin', joinedAt: new Date('2024-01-01') },

  // user-001 (Nguyễn Văn A) - group-admin của group-001, member của group-002, viewer của group-003
  { userId: 'user-001', groupId: 'group-001', role: 'group-admin', joinedAt: new Date('2025-01-05') },
  { userId: 'user-001', groupId: 'group-002', role: 'member', joinedAt: new Date('2025-01-10') },
  { userId: 'user-001', groupId: 'group-003', role: 'viewer', joinedAt: new Date('2025-01-15') },

  // user-002 (Trần Thị B) - group-admin của group-001
  { userId: 'user-002', groupId: 'group-001', role: 'group-admin', joinedAt: new Date('2025-01-05') },

  // user-003 (Phạm Văn C) - member của group-001
  { userId: 'user-003', groupId: 'group-001', role: 'member', joinedAt: new Date('2025-01-05') },

  // user-004 (Hoàng Hữu D) - group-admin của group-002
  { userId: 'user-004', groupId: 'group-002', role: 'group-admin', joinedAt: new Date('2025-01-08') },

  // user-005 (Phan Minh E) - member của group-002
  { userId: 'user-005', groupId: 'group-002', role: 'member', joinedAt: new Date('2025-01-08') },

  // user-006 (Vũ Tuấn F) - member của group-003
  { userId: 'user-006', groupId: 'group-003', role: 'member', joinedAt: new Date('2025-01-12') },

  // user-009 (Viewer) - viewer của group-003
  { userId: 'user-009', groupId: 'group-003', role: 'viewer', joinedAt: new Date('2025-01-15') },

  // XYZ Corp groups
  { userId: 'user-007', groupId: 'group-004', role: 'group-admin', joinedAt: new Date('2025-02-03') },
  { userId: 'user-008', groupId: 'group-005', role: 'member', joinedAt: new Date('2025-02-04') },

  // user-011: Đa vai trò - Group Admin ở 2 công ty, Member ở công ty khác
  { userId: 'user-011', groupId: 'group-001', role: 'group-admin', joinedAt: new Date('2025-01-10') },  // Chủ group Kinh Doanh
  { userId: 'user-011', groupId: 'group-002', role: 'member', joinedAt: new Date('2025-01-15') },       // Member group Kỹ Thuật
  { userId: 'user-011', groupId: 'group-006', role: 'group-admin', joinedAt: new Date('2025-03-01') },  // Chủ group Product Team
  { userId: 'user-011', groupId: 'group-009', role: 'member', joinedAt: new Date('2025-02-01') },       // Member phòng Đào Tạo
];

// Helper functions
export const getOrgRole = (userId: string, orgId: string): string | null => {
  const role = orgUserRoles.find(r => r.userId === userId && r.orgId === orgId);
  return role?.role || null;
};

export const getGroupRole = (userId: string, groupId: string): string | null => {
  const role = groupUserRoles.find(r => r.userId === userId && r.groupId === groupId);
  return role?.role || null;
};

export const getUserOrgs = (userId: string): string[] => {
  return orgUserRoles.filter(r => r.userId === userId).map(r => r.orgId);
};

export const getUserGroups = (userId: string): string[] => {
  return groupUserRoles.filter(r => r.userId === userId).map(r => r.groupId);
};

export const getOrgMembers = (orgId: string): string[] => {
  return orgUserRoles.filter(r => r.orgId === orgId).map(r => r.userId);
};

export const getGroupMembers = (groupId: string): string[] => {
  return groupUserRoles.filter(r => r.groupId === groupId).map(r => r.userId);
};
