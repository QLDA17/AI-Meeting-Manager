"""
MASTER IMPORT FIXER — Rà soát và fix TOÀN BỘ import path lỗi trong FE.
Chạy từ thư mục: frontend/
"""
import os
import re

SRC_DIR = 'src'

# ============================================================
# RULES: (pattern, replacement)
# Từ TỔNG QUÁT nhất → cụ thể nhất
# ============================================================
RULES = [
    # ─── 1. Stores ────────────────────────────────────────────
    (r'from\s+[\'"](?:(?:\.\./)+|@/)stores/?[\'"]', r"from '@/shared/lib/stores'"),
    (r'from\s+[\'"](?:\.\./)+lib/stores[\'"]', r"from '@/shared/lib/stores'"),

    # ─── 2. UI components ─────────────────────────────────────
    (r'from\s+[\'"](?:\.\./)+ui/?[\'"]', r"from '@/shared/ui'"),
    (r'from\s+[\'"](?:\.\./)+ui/Toast[\'"]', r"from '@/shared/ui/Toast'"),
    (r'from\s+[\'"](?:\.\./)+components/ui/?[\'"]', r"from '@/shared/ui'"),
    (r'from\s+[\'"](?:\.\./)+components/ui/([^\'"]+)[\'"]', r"from '@/shared/ui/\1'"),

    # ─── 3. Shared lib / utils ─────────────────────────────────
    (r'from\s+[\'"](?:\.\./)+utils/?[\'"]', r"from '@/shared/lib/utils'"),
    (r'from\s+[\'"](?:\.\./)+lib/utils[\'"]', r"from '@/shared/lib/utils'"),
    (r'from\s+[\'"](?:\.\./)+services/api[\'"]', r"from '@/shared/lib/api'"),

    # ─── 4. Types ─────────────────────────────────────────────
    (r'from\s+[\'"](?:\.\./)+types/?[\'"]', r"from '@/shared/types'"),
    (r'from\s+[\'"](?:\.\./)+types/([^\'"]+)[\'"]', r"from '@/shared/types/\1'"),
    (r'from\s+[\'"](?:\.\./)+types/db[\'"]', r"from '@/shared/types'"),

    # ─── 5. Mock data ─────────────────────────────────────────
    (r'from\s+[\'"](?:\.\./)+data/?[\'"]', r"from '@/shared/mockData'"),
    (r'from\s+[\'"](?:\.\./)+data/([^\'"]+)[\'"]', r"from '@/shared/mockData/\1'"),
    # lib/mockStore uses ../../data/*
    (r'from\s+[\'"](?:\.\./)+data/users[\'"]', r"from '@/shared/mockData/users'"),
    (r'from\s+[\'"](?:\.\./)+data/orgs[\'"]', r"from '@/shared/mockData/orgs'"),
    (r'from\s+[\'"](?:\.\./)+data/groups[\'"]', r"from '@/shared/mockData/groups'"),
    (r'from\s+[\'"](?:\.\./)+data/meetings[\'"]', r"from '@/shared/mockData/meetings'"),

    # ─── 6. Hooks ─────────────────────────────────────────────
    (r'from\s+[\'"](?:\.\./)+hooks/?[\'"]', r"from '@/shared/hooks'"),
    (r'from\s+[\'"](?:\.\./)+hooks/([^\'"]+)[\'"]', r"from '@/shared/hooks/\1'"),

    # ─── 7. Layouts ───────────────────────────────────────────
    (r'from\s+[\'"](?:\.\./)+layouts/([^\'"]+)[\'"]', r"from '@/shared/layouts/\1'"),
    (r'from\s+[\'"](?:\.\./)+components/layout/([^\'"]+)[\'"]', r"from '@/shared/layouts/\1'"),

    # ─── 8. Auth context ─────────────────────────────────────
    (r'from\s+[\'"](?:\.\./)+context/AuthContext[\'"]', r"from '@/features/auth/context/AuthContext'"),

    # ─── 9. Feature components (cross-feature) ────────────────
    (r'from\s+[\'"](?:\.\./)+group/CreateGroupModal[\'"]', r"from '@/features/groups/components/CreateGroupModal'"),
    (r'from\s+[\'"](?:\.\./)+components/group/([^\'"]+)[\'"]', r"from '@/features/groups/components/\1'"),
    (r'from\s+[\'"](?:\.\./)+components/meeting/([^\'"]+)[\'"]', r"from '@/features/meetings/components/\1'"),
    (r'from\s+[\'"](?:\.\./)+components/landing/([^\'"]+)[\'"]', r"from '@/features/landing/components/\1'"),
    (r'from\s+[\'"](?:\.\./)+components/landing[\'"]', r"from '@/features/landing/components'"),

    # ─── 10. Admin feature cross-refs ────────────────────────
    (r'from\s+[\'"](?:\.\./)+features/admin/stores/adminStore[\'"]', r"from '@/features/admin/stores/adminStore'"),
    (r'from\s+[\'"](?:\.\./)+features/admin/components/AdminDashboard[\'"]', r"from '@/features/admin/components/AdminDashboard'"),
    (r'from\s+[\'"](?:\.\./)+features/glossary/GlossaryTable[\'"]', r"from '@/features/glossaries/components/GlossaryTable'"),

    # ─── 11. Calendar internal ref ───────────────────────────
    (r'from\s+[\'"](?:\.\./)+features/calendar/CalendarView[\'"]', r"from '@/features/calendar/components/CalendarView'"),
    (r'from\s+[\'"]../../features/calendar/CalendarView[\'"]', r"from '@/features/calendar/components/CalendarView'"),

    # ─── 12. Landing internal ────────────────────────────────
    (r'from\s+[\'"](?:\.\./)+components/landing[\'"]', r"from '@/features/landing/components'"),

    # ─── 13. Lib/mockStore db types ──────────────────────────
    (r'from\s+[\'"]../../types/db[\'"]', r"from '@/shared/types'"),
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

changed_files = []
for root, _, files in os.walk(SRC_DIR):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            filepath = os.path.join(root, file)
            if process_file(filepath):
                changed_files.append(filepath)

print(f"\n✅ MASTER FIX COMPLETE — Updated {len(changed_files)} files:\n")
for f in changed_files:
    print(f"   • {f}")
