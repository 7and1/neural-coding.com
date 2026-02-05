#!/bin/bash
# Quick deployment test script
# Tests deployment scripts without actually deploying

set -euo pipefail

echo "Testing deployment scripts..."
echo ""

# Test 1: Check all scripts are executable
echo "✓ Checking script permissions..."
for script in deploy.sh scripts/*.sh; do
  if [[ -x "$script" ]]; then
    echo "  ✓ $script is executable"
  else
    echo "  ✗ $script is NOT executable"
    exit 1
  fi
done

# Test 2: Check environment template exists
echo ""
echo "✓ Checking environment template..."
if [[ -f .env.example ]]; then
  echo "  ✓ .env.example exists"
else
  echo "  ✗ .env.example missing"
  exit 1
fi

# Test 3: Check documentation exists
echo ""
echo "✓ Checking documentation..."
for doc in docs/DEPLOYMENT.md docs/ROLLBACK.md docs/MONITORING.md docs/INFRASTRUCTURE.md; do
  if [[ -f "$doc" ]]; then
    echo "  ✓ $doc exists"
  else
    echo "  ✗ $doc missing"
    exit 1
  fi
done

# Test 4: Check GitHub workflows
echo ""
echo "✓ Checking GitHub workflows..."
for workflow in .github/workflows/deploy_api.yml .github/workflows/deploy-web.yml .github/workflows/test.yml; do
  if [[ -f "$workflow" ]]; then
    echo "  ✓ $workflow exists"
  else
    echo "  ✗ $workflow missing"
    exit 1
  fi
done

# Test 5: Check backup directory
echo ""
echo "✓ Checking backup directory..."
if [[ -d db/backups ]]; then
  echo "  ✓ db/backups directory exists"
else
  echo "  ✗ db/backups directory missing"
  exit 1
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ All deployment infrastructure tests passed!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Run: ./scripts/setup-env.sh"
echo "  2. Run: ./scripts/validate-env.sh"
echo "  3. Run: ./deploy.sh --help"
echo ""
