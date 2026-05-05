import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

RULES = [
    (r'[\'"]\./pages/([^\'"]+)[\'"]', r"'@/features/meetings/pages/\1'"), # Most pages moved to meetings
    (r'[\'"]\./pages/admin/SystemAdminConsole[\'"]', r"'@/features/admin/system/pages/SystemAdminConsole'"),
    (r'[\'"]\./pages/admin/GlossariesAdmin[\'"]', r"'@/features/admin/system/pages/GlossariesAdmin'"),
    (r'[\'"]\./pages/org/OrgAdminConsole[\'"]', r"'@/features/admin/org/pages/OrgAdminConsole'"),
    (r'[\'"]\./pages/group/GroupDetail[\'"]', r"'@/features/groups/pages/GroupDetail'"),
    (r'[\'"]\./pages/group/CreateGroup[\'"]', r"'@/features/groups/pages/CreateGroup'"),
    (r'[\'"]\./pages/meeting/UploadAudio[\'"]', r"'@/features/meetings/pages/UploadAudio'"),
    (r'[\'"]\./pages/meeting/Calendar[\'"]', r"'@/features/calendar/pages/Calendar'"),
    (r'[\'"]\./pages/profile/Profile[\'"]', r"'@/features/profile/pages/Profile'"),
    (r'[\'"]\./pages/Notifications[\'"]', r"'@/features/notifications/pages/Notifications'"),
    (r'[\'"]\./pages/NotFound[\'"]', r"'@/shared/pages/NotFound'"),
    (r'[\'"]\./pages/Forbidden[\'"]', r"'@/shared/pages/Forbidden'"),
    (r'[\'"]\./pages/Login[\'"]', r"'@/features/auth/pages/Login'"),
    (r'[\'"]\./pages/Register[\'"]', r"'@/features/auth/pages/Register'"),
    (r'[\'"]\./pages/ForgotPassword[\'"]', r"'@/features/auth/pages/ForgotPassword'"),
    (r'[\'"]\./pages/Landing[\'"]', r"'@/features/landing/pages/Landing'"),
    (r'[\'"]\./context/([^\'"]+)[\'"]', r"'@/features/auth/context/\1'"),
    (r'[\'"]\./layouts/([^\'"]+)[\'"]', r"'@/shared/layouts/\1'"),
    (r'[\'"]\./stores/([^\'"]+)[\'"]', r"'@/shared/lib/\1'"), # We'll fix manually if needed
    (r'[\'"]\./components/ui/Toast[\'"]', r"'@/shared/ui/Toast'"),
]

for pattern, repl in RULES:
    content = re.sub(pattern, repl, content)

# Fix remaining meetings pages manually via regex
content = re.sub(r"'@/features/meetings/pages/MeetingList'", r"'@/features/meetings/pages/MeetingList'", content) # Just in case

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated App.tsx imports")
