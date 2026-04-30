/**
 * OrgSelector Component
 * Dropdown để chọn organization hiện tại
 */
import React from 'react';
import { ChevronDown, Building2, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useOrgStore } from '../../stores';

interface OrgSelectorProps {
  className?: string;
}

const OrgSelector: React.FC<OrgSelectorProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const { user, switchOrg } = useAuth();
  // Get user's organizations from store
  const { orgs, currentOrgId, setCurrentOrg, members } = useOrgStore();
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const userOrgs = React.useMemo(
    () => orgs.filter((org) => org.approvalStatus !== 'pending'),
    [orgs],
  );

  const currentOrg = React.useMemo(
    () => userOrgs.find(o => o.id === currentOrgId) || userOrgs[0],
    [currentOrgId, userOrgs]
  );
  const displayedMemberCount = React.useMemo(() => {
    if (!currentOrg) return 0;
    if (currentOrgId && currentOrg.id === currentOrgId && members.length > 0) {
      return members.length;
    }
    return currentOrg.memberCount || 0;
  }, [currentOrg, currentOrgId, members.length]);

  // Auto-select first org if none selected
  React.useEffect(() => {
    if (!currentOrgId && userOrgs.length > 0) {
      setCurrentOrg(userOrgs[0].id);
    }
  }, [currentOrgId, userOrgs, setCurrentOrg]);

  // Close on click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (orgId: string) => {
    setCurrentOrg(orgId);
    switchOrg(orgId);
    setIsOpen(false);
    navigate('/dashboard');
  };

  if (userOrgs.length === 0) {
    return (
      <div className={`flex items-center gap-2 text-gray-500 ${className}`}>
        <Building2 size={16} />
        <span className="text-sm">No Organizations</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-gray-100 dark:hover:bg-slate-800"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/40">
          <Building2 size={16} className="text-primary-600 dark:text-primary-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-800 dark:text-slate-100">
            {currentOrg?.name || 'Select Org'}
          </p>
          <p className="truncate text-xs text-gray-500 dark:text-slate-400">
            {displayedMemberCount} members
          </p>
        </div>
        <ChevronDown
          size={14}
          className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="max-h-64 overflow-y-auto p-1">
            {userOrgs.map((org) => {
              const membership = user?.orgMemberships.find((m) => m.orgId === org.id);
              const isSelected = org.id === currentOrgId;

              return (
                <button
                  key={org.id}
                  onClick={() => handleSelect(org.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition ${
                    isSelected
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200'
                      : 'text-gray-700 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <Building2 size={16} className="flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{org.name}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-slate-400">
                      {membership?.role} • {org.memberCount} members
                    </p>
                  </div>
                  {isSelected && <Check size={16} className="flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgSelector;
