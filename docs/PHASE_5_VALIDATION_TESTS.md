# Phase 5: Build Output Validation Test

**Purpose:** Verify Phase 5 migration didn't break build outputs  
**When to Run:** After Phase 5.9 (before final sign-off)

---

## Pre-Migration Baseline (Run NOW)

Record current build output state:

```bash
npm run build

# Record file sizes and contents
du -h dist/
ls -la dist/
md5 dist/* > PHASE_5_BUILD_BASELINE.txt
```

---

## Post-Migration Validation (After Phase 5.10)

### 1. File Presence Check
```bash
# All 8 distribution files must exist
test -f packages/jison/dist/jison-cjs.js && echo "✅ jison-cjs.js"
test -f packages/jison/dist/jison-cjs-es5.js && echo "✅ jison-cjs-es5.js"
test -f packages/jison/dist/jison-umd.js && echo "✅ jison-umd.js"
test -f packages/jison/dist/jison-umd-es5.js && echo "✅ jison-umd-es5.js"
test -f packages/jison/dist/cli-cjs.js && echo "✅ cli-cjs.js"
test -f packages/jison/dist/cli-cjs-es5.js && echo "✅ cli-cjs-es5.js"
test -f packages/jison/dist/cli-umd.js && echo "✅ cli-umd.js"
test -f packages/jison/dist/cli-umd-es5.js && echo "✅ cli-umd-es5.js"
```

### 2. Shebang Verification (CLI files MUST have shebang)
```bash
# Check shebang presence
head -c 15 packages/jison/dist/cli-cjs.js | grep "#!" && echo "✅ cli-cjs.js has shebang" || echo "❌ MISSING SHEBANG"
head -c 15 packages/jison/dist/cli-cjs-es5.js | grep "#!" && echo "✅ cli-cjs-es5.js has shebang" || echo "❌ MISSING SHEBANG"
head -c 15 packages/jison/dist/cli-umd.js | grep "#!" && echo "✅ cli-umd.js has shebang" || echo "❌ MISSING SHEBANG"
head -c 15 packages/jison/dist/cli-umd-es5.js | grep "#!" && echo "✅ cli-umd-es5.js has shebang" || echo "❌ MISSING SHEBANG"
```

### 3. File Content Sanity Checks
```bash
# CommonJS files should contain 'module.exports'
grep "module.exports" packages/jison/dist/jison-cjs.js && echo "✅ CommonJS format" || echo "❌ Missing CommonJS exports"
grep "module.exports" packages/jison/dist/cli-cjs.js && echo "✅ CLI CommonJS format" || echo "❌ Missing CLI exports"

# UMD files should contain 'define' and 'factory'
grep "define.*function\|exports.*factory" packages/jison/dist/jison-umd.js && echo "✅ UMD format" || echo "❌ Missing UMD wrapper"

# ES5 files should NOT contain arrow functions
grep "=>" packages/jison/dist/jison-cjs-es5.js && echo "⚠️  WARNING: Arrow functions in ES5!" || echo "✅ No arrow functions (ES5 safe)"
```

### 4. Import Resolution Check
```bash
# Verify no broken relative paths in bundle
# This is a smoke test - try to load the module
node -e "const jison = require('./packages/jison/dist/jison-cjs.js'); console.log('✅ Module loads:', typeof jison.Generator);"
```

### 5. CLI Executability
```bash
# Make files executable and test
chmod +x packages/jison/dist/cli-cjs.js
packages/jison/dist/cli-cjs.js --version && echo "✅ CLI executable works" || echo "❌ CLI failed"
```

### 6. Test Suite Pass/Fail
```bash
# Run full test suite
npm test 2>&1 | tee PHASE_5_TEST_RESULTS.txt

# Summary
echo "---"
echo "Test Results Summary:"
grep -E "passing|failing" PHASE_5_TEST_RESULTS.txt | tail -5
```

### 7. Workspace Build Verification
```bash
# Test individual workspace build
npm run build -w packages/jison

# Verify dist files regenerated
ls -lh packages/jison/dist/ | tail -10
```

### 8. Size Comparison
```bash
# Compare with baseline
echo "Pre-migration build sizes:"
cat PHASE_5_BUILD_BASELINE.txt | head -10

echo ""
echo "Post-migration build sizes:"
du -h packages/jison/dist/*

echo ""
echo "Size difference check (should be <5% variance):"
# If files are significantly different size, something broke
```

### 9. Publishing Dry Run
```bash
# Test that publishing will work (without actually publishing)
npm publish -w packages/jison --dry-run 2>&1 | tee PHASE_5_DRY_RUN.txt

# Should see package name and files to publish
grep -E "package|file" PHASE_5_DRY_RUN.txt
```

### 10. Import Path Verification
```bash
# Spot-check that imports are correct in source
echo "Checking lib/jison.js imports..."
grep "from.*packages" packages/jison/lib/jison.js | head -5

echo "Checking lib/cli.js imports..."
grep "from.*packages" packages/jison/lib/cli.js

echo "Checking lib/util imports..."
grep "from.*packages" packages/jison/lib/util/*.js | head -3
```

---

## Quick Validation Script

Save as `validate-phase-5.sh`:

```bash
#!/bin/bash

echo "🔍 Phase 5 Post-Migration Validation"
echo "===================================="
echo ""

ERRORS=0

# Check all dist files exist
echo "✓ Checking distribution files..."
for file in jison-cjs.js jison-cjs-es5.js jison-umd.js jison-umd-es5.js cli-cjs.js cli-cjs-es5.js cli-umd.js cli-umd-es5.js; do
    if [ ! -f "packages/jison/dist/$file" ]; then
        echo "  ❌ Missing: $file"
        ((ERRORS++))
    fi
done
[ $ERRORS -eq 0 ] && echo "  ✅ All 8 distribution files present"
echo ""

# Check shebangs
echo "✓ Checking CLI shebangs..."
for file in cli-cjs.js cli-cjs-es5.js cli-umd.js cli-umd-es5.js; do
    if ! head -c 2 "packages/jison/dist/$file" | grep -q "#!"; then
        echo "  ❌ Missing shebang: $file"
        ((ERRORS++))
    fi
done
[ $ERRORS -eq 0 ] && echo "  ✅ All CLI files have shebangs"
echo ""

# Test module loading
echo "✓ Testing module load..."
if node -e "require('./packages/jison/dist/jison-cjs.js')" 2>/dev/null; then
    echo "  ✅ Module loads successfully"
else
    echo "  ❌ Module load failed"
    ((ERRORS++))
fi
echo ""

# Run tests
echo "✓ Running test suite..."
if npm test 2>&1 | grep -q "passing"; then
    PASSING=$(npm test 2>&1 | grep "passing" | awk '{print $1}')
    echo "  ✅ Tests passing: $PASSING"
else
    echo "  ❌ Test suite failed"
    ((ERRORS++))
fi
echo ""

# Final summary
echo "===================================="
if [ $ERRORS -eq 0 ]; then
    echo "✅ VALIDATION PASSED - Phase 5 successful!"
    exit 0
else
    echo "❌ VALIDATION FAILED - $ERRORS error(s) found"
    exit 1
fi
```

Usage:
```bash
chmod +x validate-phase-5.sh
./validate-phase-5.sh
```

---

## Rollback Checklist

If validation **FAILS**, rollback immediately:

```bash
# Abort and reset
git reset --hard pre-phase5-migration
git checkout main

# Verify rollback
npm run build
npm test
```

---

## Sign-Off Criteria

Phase 5 is **COMPLETE** only when:
- [ ] All 8 dist files exist
- [ ] ✅ All CLI files have shebangs
- [ ] ✅ Module loads without errors
- [ ] ✅ All tests pass
- [ ] ✅ CLI executable works: `packages/jison/dist/cli-cjs.js --version`
- [ ] ✅ Workspace build works: `npm run build -w packages/jison`
- [ ] ✅ Publish dry-run succeeds
- [ ] ✅ Source imports look correct
- [ ] ✅ File sizes within 5% of baseline

**Only when ALL criteria pass → merge PR**
