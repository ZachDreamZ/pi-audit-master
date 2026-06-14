#!/bin/bash
set -e

# Move to the project root
cd "$(dirname "$0")/.."

echo "🚀 Setting up test environment for pi-audit-master..."

# 1. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 2. Create buggy project structure
echo "📁 Creating buggy-project..."
mkdir -p tests/buggy-project/extensions
mkdir -p tests/buggy-project/src

# 3. Write buggy files
echo "📝 Writing buggy files..."

# Null Safety Bug
cat <<EOF >tests/buggy-project/src/null_safety.ts
export function processUser(user: any) {
    // CRITICAL: Missing null check on user and user.profile
    return user.profile.address.city.toUpperCase();
}
EOF

# Logic Bug
cat <<EOF >tests/buggy-project/src/logic_error.ts
export async function updateData(id: string, data: any) {
    const current = await fetchById(id);
    // HIGH: Race condition - not checking if data changed between fetch and update
    const updated = { ...current, ...data };
    await save(updated);
}
async function fetchById(id: string) { return { id }; }
async function save(d: any) { return true; }
EOF

# Performance Bug
cat <<EOF >tests/buggy-project/src/performance_leak.ts
export function findDuplicates(arr: string[]) {
    const duplicates: string[] = [];
    // MEDIUM: O(n^2) complexity
    for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
            if (arr[i] === arr[j] && !duplicates.includes(arr[i])) {
                duplicates.push(arr[i]);
            }
        }
    }
    return duplicates;
}
EOF

# Pi Integration Bug
cat <<EOF >tests/buggy-project/extensions/pi_wrong.ts
export default function (pi: any) {
    // HIGH: Wrong event name 'tool_execution_started' instead of 'tool_execution_start'
    pi.on('tool_execution_started', (event: any, ctx: any) => {
        console.log('Intercepted!');
        // Missing event.abort() for a blocking middleware
    });
}
EOF

# Quality Bug
cat <<EOF >tests/buggy-project/src/messy_code.ts
export function calc(a: number, b: number) {
    // LOW: Magic number 86400, redundant logic
    const res = a * 86400;
    const result = res;
    if (result === res) {
        return result;
    }
    return res;
}
EOF

echo "✅ Buggy project created."

# 4. Run tests
echo "🧪 Running tests..."
npm test

echo "✨ Setup and testing complete!"
