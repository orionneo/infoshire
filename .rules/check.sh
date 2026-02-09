#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Resolve ast-grep command name across environments:
# Prefer pnpm exec (uses local devDependency), fallback to npx.
AST_GREP_CMD=""

if pnpm exec ast-grep --version >/dev/null 2>&1; then
  AST_GREP_CMD="pnpm exec ast-grep"
elif pnpm exec sg --version >/dev/null 2>&1; then
  AST_GREP_CMD="pnpm exec sg"
elif npx --yes ast-grep --version >/dev/null 2>&1; then
  AST_GREP_CMD="npx --yes ast-grep"
else
  echo "ast-grep not found."
  echo "Install with: pnpm add -D @ast-grep/cli"
  echo "Then try again."
  exit 1
fi

$AST_GREP_CMD scan -r .rules/SelectItem.yml
$AST_GREP_CMD scan -r .rules/contrast.yml
$AST_GREP_CMD scan -r .rules/supabase-google-sso.yml || true || true

useauth_output=$($AST_GREP_CMD scan -r .rules/useAuth.yml 2>/dev/null || true)

if [ -z "$useauth_output" ]; then
  exit 0
fi

authprovider_output=$($AST_GREP_CMD scan -r .rules/authProvider.yml 2>/dev/null || true)

if [ -n "$authprovider_output" ]; then
  exit 0
fi

echo "=== ast-grep scan -r .rules/useAuth.yml output ==="
echo "$useauth_output"
echo ""
echo "=== ast-grep scan -r .rules/authProvider.yml output ==="
echo "$authprovider_output"
echo ""
echo "⚠️  Issue detected:"
echo "The code uses useAuth Hook but does not have AuthProvider component wrapping the components."
echo "Please ensure that components using useAuth are wrapped with AuthProvider to provide proper authentication context."
echo ""
echo "Suggested fixes:"
echo "1. Add AuthProvider wrapper in App.tsx or corresponding root component"
echo "2. Ensure all components using useAuth are within AuthProvider scope"
exit 1
