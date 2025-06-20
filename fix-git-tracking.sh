#!/bin/bash

echo "🔧 Fixing Git tracking issues for Barka monorepo..."

# Navigate to the barka directory
cd /home/wilfredeveloper/Desktop/barka

echo "📍 Current directory: $(pwd)"

# Verify we're in the right place
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: Not in the correct barka directory"
    exit 1
fi

echo "✅ Confirmed we're in the barka monorepo"

# Check current Git status
echo "📊 Current Git status:"
git status --porcelain

# Refresh Git index
echo "🔄 Refreshing Git index..."
git add -A
git reset

# Clear any potential Git cache issues
echo "🧹 Clearing Git cache..."
git rm -r --cached . 2>/dev/null || true
git add .

# Verify Git is tracking correctly
echo "📋 Verifying Git tracking:"
echo "Files tracked by Git:"
git ls-files | head -20
echo "..."
echo "Total files tracked: $(git ls-files | wc -l)"

# Check for any remaining .git directories
echo "🔍 Checking for conflicting .git directories:"
find . -name ".git" -type d | grep -v "^\./.git$" || echo "✅ No conflicting .git directories found"

# Verify remotes
echo "🌐 Git remotes configured:"
git remote -v

echo "✅ Git tracking fix completed!"
echo ""
echo "🎯 Next steps:"
echo "1. Close VS Code completely"
echo "2. Reopen VS Code"
echo "3. Open the barka folder (this directory): $(pwd)"
echo "4. Try making a change to any file and check if diff works"
echo ""
echo "If issues persist, run: rm -rf ~/.config/Code/User/workspaceStorage/*barka*"
