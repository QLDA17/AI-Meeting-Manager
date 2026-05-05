import os
import re

SRC_DIR = 'src'
RULES = [
    (r'from\s+[\'"](?:\.\./)+data/?[\'"]', r"from '@/shared/mockData'"),
]

changed_count = 0
for root, _, files in os.walk(SRC_DIR):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            original = content
            for pattern, repl in RULES:
                content = re.sub(pattern, repl, content)
                
            if content != original:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                changed_count += 1

print(f"Fixed legacy data imports in {changed_count} files.")
