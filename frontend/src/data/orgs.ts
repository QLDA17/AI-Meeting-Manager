/**
 * Mock Organizations Data
 */
import type { Organization } from '../types';

export const mockOrganizations: Organization[] = [
    {
        id: 'org-001',
        name: 'ABC Company',
        description: 'Leading technology and business consulting firm',
        logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=abc-company',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-20'),
        memberCount: 24,
        groupCount: 8,
        meetingCount: 124,
        totalHours: 286,
    },

    {
        id: 'org-002',
        name: 'XYZ Corp',
        description: 'Innovative software development and consulting',
        logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=xyz-corp',
        createdAt: new Date('2025-02-01'),
        updatedAt: new Date('2025-02-10'),
        memberCount: 15,
        groupCount: 5,
        meetingCount: 67,
        totalHours: 142,
    },

    {
        id: 'org-003',
        name: 'Tech Startup',
        description: 'Startup công nghệ AI - Phát triển sản phẩm đột phá',
        logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=tech-startup',
        createdAt: new Date('2025-03-01'),
        updatedAt: new Date(),
        memberCount: 12,
        groupCount: 3,
        meetingCount: 45,
        totalHours: 98,
    },

    {
        id: 'org-004',
        name: 'Global Education',
        description: 'Tập đoàn giáo dục quốc tế - Đào tạo và tuyển sinh',
        logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=global-edu',
        createdAt: new Date('2025-01-15'),
        updatedAt: new Date(),
        memberCount: 35,
        groupCount: 5,
        meetingCount: 89,
        totalHours: 215,
    },
];

export const orgMap = new Map(mockOrganizations.map(o => [o.id, o]));
export const getOrgById = (id: string): Organization | undefined => orgMap.get(id);
export const getOrgsByIds = (ids: string[]): Organization[] =>
    ids.map(id => orgMap.get(id)).filter(Boolean) as Organization[];
