import os
import re

SRC_DIR = '/Users/nguyenthanhhuyen/Pictures/tai_lieu/MUTI_AI/frontend/src'

# Regex replacements for paths.
# We replace quotes and relative paths with the new alias @/
# Example: from '../../components/ui/Button' -> from '@/shared/ui/Button'

RULES = [
    # UI Components
    (r'[\'"](?:(?:\.\./)+|\./)components/ui/([^\'"]+)[\'"]', r"'@/shared/ui/\1'"),
    (r'[\'"](?:(?:\.\./)+|\./)components/ui[\'"]', r"'@/shared/ui'"),
    
    # Hooks
    (r'[\'"](?:(?:\.\./)+|\./)hooks/([^\'"]+)[\'"]', r"'@/shared/hooks/\1'"),
    (r'[\'"](?:(?:\.\./)+|\./)hooks[\'"]', r"'@/shared/hooks'"),
    
    # Types
    (r'[\'"](?:(?:\.\./)+|\./)types/([^\'"]+)[\'"]', r"'@/shared/types/\1'"),
    (r'[\'"](?:(?:\.\./)+|\./)types[\'"]', r"'@/shared/types'"),
    
    # Services/Lib
    (r'[\'"](?:(?:\.\./)+|\./)services/([^\'"]+)[\'"]', r"'@/shared/lib/\1'"),
    (r'[\'"](?:(?:\.\./)+|\./)lib/([^\'"]+)[\'"]', r"'@/shared/lib/\1'"),
    
    # Layouts
    (r'[\'"](?:(?:\.\./)+|\./)components/layout/([^\'"]+)[\'"]', r"'@/shared/layouts/\1'"),
    (r'[\'"](?:(?:\.\./)+|\./)layouts/([^\'"]+)[\'"]', r"'@/shared/layouts/\1'"),
    
    # Context
    (r'[\'"](?:(?:\.\./)+|\./)context/([^\'"]+)[\'"]', r"'@/features/auth/context/\1'"),
    
    # Stores (Specific mappings)
    (r'[\'"](?:(?:\.\./)+|\./)stores/appStore[\'"]', r"'@/features/meetings/store/appStore'"),
    (r'[\'"](?:(?:\.\./)+|\./)stores/orgStore[\'"]', r"'@/features/organizations/store/orgStore'"),
    (r'[\'"](?:(?:\.\./)+|\./)stores/groupStore[\'"]', r"'@/features/groups/store/groupStore'"),
    (r'[\'"](?:(?:\.\./)+|\./)stores/calendarStore[\'"]', r"'@/features/calendar/store/calendarStore'"),
    (r'[\'"](?:(?:\.\./)+|\./)stores/notificationStore[\'"]', r"'@/features/notifications/store/notificationStore'"),
    (r'[\'"](?:(?:\.\./)+|\./)stores/glossaryStore[\'"]', r"'@/features/glossaries/store/glossaryStore'"),
    (r'[\'"](?:(?:\.\./)+|\./)stores/uiStore[\'"]', r"'@/shared/lib/uiStore'"),
    
    # Feature specific components
    (r'[\'"](?:(?:\.\./)+|\./)components/meeting/([^\'"]+)[\'"]', r"'@/features/meetings/components/\1'"),
    (r'[\'"](?:(?:\.\./)+|\./)components/group/([^\'"]+)[\'"]', r"'@/features/groups/components/\1'"),
    (r'[\'"](?:(?:\.\./)+|\./)components/landing/([^\'"]+)[\'"]', r"'@/features/landing/components/\1'"),
]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    original = content
    for pattern, replacement in RULES:
        content = re.sub(pattern, replacement, content)
        
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

# We only process files in the new structure (features and shared)
NEW_DIRS = ['features', 'shared']
changed_count = 0

for root, _, files in os.walk(SRC_DIR):
    # Only process if in the new structure
    rel_path = os.path.relpath(root, SRC_DIR)
    if not any(rel_path.startswith(d) for d in NEW_DIRS):
        continue
        
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            if process_file(os.path.join(root, file)):
                changed_count += 1

print(f"Updated imports in {changed_count} files in the new structure.")
