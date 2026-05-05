/**
 * Breadcrumbs Component
 * Hiển thị navigation path: Org > Group > Meeting
 */
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useOrgStore, useGroupStore } from '@/shared/lib/stores';

interface BreadcrumbItem {
  label: string;
  path?: string;
  isCurrent?: boolean;
}

const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const { currentOrg } = useOrgStore();
  const { currentGroup } = useGroupStore();

  const breadcrumbs = React.useMemo(() => {
    const items: BreadcrumbItem[] = [
      { label: 'Home', path: '/' },
    ];

    // Add org
    if (currentOrg) {
      items.push({
        label: currentOrg.name,
        path: `/?org=${currentOrg.id}`,
      });
    }

    // Add group if in group context
    if (currentGroup && location.pathname.includes('/groups/')) {
      items.push({
        label: currentGroup.name,
        path: `/groups/${currentGroup.id}`,
      });
    }

    // Add meeting if in meeting detail
    const meetingMatch = location.pathname.match(/\/meetings\/([^/]+)/);
    if (meetingMatch) {
      items.push({
        label: 'Meeting Detail',
        isCurrent: true,
      });
    }

    // Add create group page
    if (location.pathname === '/groups/create') {
      items.push({
        label: 'Create Group',
        isCurrent: true,
      });
    }

    // Add org admin pages
    if (location.pathname.includes('/org/admin')) {
      items.push({
        label: 'Admin Console',
        isCurrent: true,
      });
    }

    return items;
  }, [location.pathname, currentOrg, currentGroup]);

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-1 text-sm text-gray-500 dark:text-slate-400">
      {breadcrumbs.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <ChevronRight size={14} className="text-gray-400" />}
          {item.isCurrent ? (
            <span className="font-medium text-gray-800 dark:text-slate-100">
              {item.label}
            </span>
          ) : item.path ? (
            <Link
              to={item.path}
              className="hover:text-primary-600 dark:hover:text-primary-300"
            >
              {item.label}
            </Link>
          ) : (
            <span>{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
