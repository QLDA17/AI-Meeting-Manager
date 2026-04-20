/**
 * Mock Users Data
 */
import type { User } from '../types';

export const mockUsers: User[] = [
    // user-000: System Administrator - QUẢN TRỊ HỆ THỐNG RIÊNG BIỆT
    {
        id: 'user-000',
        email: 'superadmin@multiminutes.com',
        firstName: 'System',
        lastName: 'Admin',
        displayName: 'System Administrator (Root)',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=superadmin',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
        isActive: true,
        systemRole: 'system-admin', // CHUYÊN TRÁCH HỆ THỐNG
        orgMemberships: [], // Không tham gia công ty cụ thể nào
        groupMemberships: [],
        language: 'vi',
        timezone: 'Asia/Ho_Chi_Minh',
        notificationPreferences: {
            emailOnMeetingComplete: true,
            slackIntegration: true,
            meetingSummaries: true,
            groupAnnouncements: true,
        },
    },

    // user-001: Nguyễn Văn An - Đa vai trò (Org Admin & Group Admin)
    {
        id: 'user-001',
        email: 'nguyen.an@techviet.com',
        firstName: 'Nguyễn',
        lastName: 'Văn An',
        displayName: 'Nguyễn Văn An',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nguyen-an',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-15'),
        lastLoginAt: new Date(),
        isActive: true,
        systemRole: 'member', // Quay lại làm member thông thường của hệ thống

        // Tham gia 2 công ty
        orgMemberships: [
            { userId: 'user-001', orgId: 'org-001', role: 'org-admin', joinedAt: new Date('2025-01-01') }, // Công ty 1: TechViet Solutions - Admin Org
            { userId: 'user-001', orgId: 'org-002', role: 'member', joinedAt: new Date('2025-02-01') },    // Công ty 2: Global Corp - Chỉ là nhân viên
        ],

        // Vai trò trong các nhóm
        groupMemberships: [
            { userId: 'user-001', groupId: 'group-001', role: 'group-admin', joinedAt: new Date('2025-01-05') }, // Trưởng phòng Kinh doanh (Công ty 1)
            { userId: 'user-001', groupId: 'group-004', role: 'group-admin', joinedAt: new Date('2025-02-03') }, // Trưởng nhóm Phát triển AI (Công ty 2)
            { userId: 'user-001', groupId: 'group-002', role: 'member', joinedAt: new Date('2025-01-10') },      // Thành viên phòng Kỹ thuật (Công ty 1)
        ],

        language: 'vi',
        timezone: 'Asia/Ho_Chi_Minh',
        notificationPreferences: {
            emailOnMeetingComplete: true,
            slackIntegration: true,
            meetingSummaries: true,
            groupAnnouncements: true,
        },
    },

    // ABC Company - Kinh Doanh group
    {
        id: 'user-002',
        email: 'tran.b@abc-company.com',
        firstName: 'Trần',
        lastName: 'Thị B',
        displayName: 'Trần Thị B',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tran-b',
        createdAt: new Date('2025-01-02'),
        updatedAt: new Date('2025-01-14'),
        lastLoginAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        isActive: true,
        orgMemberships: [
            { userId: 'user-002', orgId: 'org-001', role: 'member', joinedAt: new Date('2025-01-02') },
        ],
        groupMemberships: [
            { userId: 'user-002', groupId: 'group-001', role: 'group-admin', joinedAt: new Date('2025-01-05') },
        ],
    },

    {
        id: 'user-003',
        email: 'pham.c@abc-company.com',
        firstName: 'Phạm',
        lastName: 'Văn C',
        displayName: 'Phạm Văn C',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pham-c',
        createdAt: new Date('2025-01-03'),
        updatedAt: new Date('2025-01-13'),
        isActive: true,
        orgMemberships: [
            { userId: 'user-003', orgId: 'org-001', role: 'member', joinedAt: new Date('2025-01-03') },
        ],
        groupMemberships: [
            { userId: 'user-003', groupId: 'group-001', role: 'member', joinedAt: new Date('2025-01-05') },
        ],
    },

    // ABC Company - Kỹ Thuật group
    {
        id: 'user-004',
        email: 'hoang.d@abc-company.com',
        firstName: 'Hoàng',
        lastName: 'Hữu D',
        displayName: 'Hoàng Hữu D',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hoang-d',
        createdAt: new Date('2025-01-04'),
        updatedAt: new Date('2025-01-12'),
        isActive: true,
        orgMemberships: [
            { userId: 'user-004', orgId: 'org-001', role: 'member', joinedAt: new Date('2025-01-04') },
        ],
        groupMemberships: [
            { userId: 'user-004', groupId: 'group-002', role: 'group-admin', joinedAt: new Date('2025-01-08') },
        ],
    },

    {
        id: 'user-005',
        email: 'phan.e@abc-company.com',
        firstName: 'Phan',
        lastName: 'Minh E',
        displayName: 'Phan Minh E',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=phan-e',
        createdAt: new Date('2025-01-05'),
        updatedAt: new Date('2025-01-11'),
        isActive: true,
        orgMemberships: [
            { userId: 'user-005', orgId: 'org-001', role: 'member', joinedAt: new Date('2025-01-05') },
        ],
        groupMemberships: [
            { userId: 'user-005', groupId: 'group-002', role: 'member', joinedAt: new Date('2025-01-08') },
        ],
    },

    // ABC Company - Ban Giám Đốc group
    {
        id: 'user-006',
        email: 'vu.f@abc-company.com',
        firstName: 'Vũ',
        lastName: 'Tuấn F',
        displayName: 'Vũ Tuấn F',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=vu-f',
        createdAt: new Date('2025-01-06'),
        updatedAt: new Date('2025-01-10'),
        isActive: true,
        orgMemberships: [
            { userId: 'user-006', orgId: 'org-001', role: 'member', joinedAt: new Date('2025-01-06') },
        ],
        groupMemberships: [
            { userId: 'user-006', groupId: 'group-003', role: 'member', joinedAt: new Date('2025-01-12') },
        ],
    },

    // XYZ Corp users
    {
        id: 'user-007',
        email: 'john.tech@xyz-corp.com',
        firstName: 'John',
        lastName: 'Smith',
        displayName: 'John Smith',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john-smith',
        createdAt: new Date('2025-02-01'),
        updatedAt: new Date('2025-02-08'),
        isActive: true,
        orgMemberships: [
            { userId: 'user-007', orgId: 'org-002', role: 'org-admin', joinedAt: new Date('2025-02-01') },
        ],
        groupMemberships: [
            { userId: 'user-007', groupId: 'group-004', role: 'group-admin', joinedAt: new Date('2025-02-03') },
        ],
    },

    {
        id: 'user-008',
        email: 'jane.sales@xyz-corp.com',
        firstName: 'Jane',
        lastName: 'Doe',
        displayName: 'Jane Doe',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jane-doe',
        createdAt: new Date('2025-02-02'),
        updatedAt: new Date('2025-02-09'),
        isActive: true,
        orgMemberships: [
            { userId: 'user-008', orgId: 'org-002', role: 'member', joinedAt: new Date('2025-02-02') },
        ],
        groupMemberships: [
            { userId: 'user-008', groupId: 'group-005', role: 'member', joinedAt: new Date('2025-02-04') },
        ],
    },

    // Viewer user
    {
        id: 'user-009',
        email: 'viewer@abc-company.com',
        firstName: 'Viewer',
        lastName: 'User',
        displayName: 'Viewer User',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=viewer',
        createdAt: new Date('2025-01-07'),
        updatedAt: new Date('2025-01-09'),
        isActive: true,
        orgMemberships: [
            { userId: 'user-009', orgId: 'org-001', role: 'viewer', joinedAt: new Date('2025-01-07') },
        ],
        groupMemberships: [
            { userId: 'user-009', groupId: 'group-003', role: 'viewer', joinedAt: new Date('2025-01-15') },
        ],
    },

    // Regular Member (no admin rights)
    {
        id: 'user-010',
        email: 'member@abc-company.com',
        firstName: 'Nhân',
        lastName: 'Viên',
        displayName: 'Nhân Viên',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=member',
        createdAt: new Date('2025-03-01'),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
        isActive: true,
        systemRole: 'member', // Regular member - no admin rights
        orgMemberships: [
            { userId: 'user-010', orgId: 'org-001', role: 'member', joinedAt: new Date('2025-03-01') },
        ],
        groupMemberships: [
            { userId: 'user-010', groupId: 'group-001', role: 'member', joinedAt: new Date('2025-03-01') },
            { userId: 'user-010', groupId: 'group-002', role: 'member', joinedAt: new Date('2025-03-05') },
        ],
        language: 'vi',
        timezone: 'Asia/Ho_Chi_Minh',
        notificationPreferences: {
            emailOnMeetingComplete: true,
            slackIntegration: false,
            meetingSummaries: true,
            groupAnnouncements: false,
        },
    },

    // user-011: Đa vai trò - Group Admin ở 2 công ty, Member ở công ty thứ 3
    {
        id: 'user-011',
        email: 'le.g@demo.com',
        firstName: 'Lê',
        lastName: 'Văn G',
        displayName: 'Lê Văn G',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=le-g',
        createdAt: new Date('2025-01-10'),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
        isActive: true,
        systemRole: 'member', // Không phải system admin

        // Thuộc 3 tổ chức với vai trò khác nhau
        orgMemberships: [
            { userId: 'user-011', orgId: 'org-001', role: 'member', joinedAt: new Date('2025-01-10') },   // ABC Company: Member
            { userId: 'user-011', orgId: 'org-003', role: 'member', joinedAt: new Date('2025-03-01') },   // Tech Startup: Member
            { userId: 'user-011', orgId: 'org-004', role: 'member', joinedAt: new Date('2025-02-01') },   // Global Education: Member
        ],

        // Vai trò khác nhau trong các group
        groupMemberships: [
            { userId: 'user-011', groupId: 'group-001', role: 'group-admin', joinedAt: new Date('2025-01-10') },  // Chủ group Kinh Doanh
            { userId: 'user-011', groupId: 'group-002', role: 'member', joinedAt: new Date('2025-01-15') },       // Member group Kỹ Thuật
            { userId: 'user-011', groupId: 'group-006', role: 'group-admin', joinedAt: new Date('2025-03-01') },  // Chủ group Product Team
            { userId: 'user-011', groupId: 'group-009', role: 'member', joinedAt: new Date('2025-02-01') },       // Member phòng Đào Tạo
        ],

        language: 'vi',
        timezone: 'Asia/Ho_Chi_Minh',
        notificationPreferences: {
            emailOnMeetingComplete: true,
            slackIntegration: true,
            meetingSummaries: true,
            groupAnnouncements: true,
        },
    },
];

export const userMap = new Map(mockUsers.map(u => [u.id, u]));
export const getUserById = (id: string): User | undefined => userMap.get(id);
export const getUsersByIds = (ids: string[]): User[] => ids.map(id => userMap.get(id)).filter(Boolean) as User[];

/**
 * Get members by group ID
 */
export const getMembersByGroupId = (groupId: string): User[] => {
    return mockUsers.filter(u =>
        u.groupMemberships.some(gm => gm.groupId === groupId)
    );
};
