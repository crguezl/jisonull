# Phase 5.1: Detailed Import and Dependency Reference

**Generated:** 2026-03-05  
**Purpose:** Quick reference for import path updates in Phase 5.3

---

## Import Path Change Map

### File: lib/jison.js (Line 7-12)
**Current (Root-relative):**
```javascript
import Lexer from '../packages/jison-lex';
import ebnfParser from '../packages/ebnf-parser';
import lexParser from '../packages/lex-parser';
import helpers from '../packages/helpers-lib';
```

**After Move to packages/jison (package-relative):**
```javascript
import Lexer from '../../packages/jison-lex';
import ebnfParser from '../../packages/ebnf-parser';
import lexParser from '../../packages/lex-parser';
import helpers from '../../packages/helpers-lib';
```

**Reason:** Now in `lib/` which is nested under `packages/jison/lib/`, so need to go up 2 levels instead of 1

---

### File: lib/cli.js (Line 5)
**Current (Root-relative):**
```javascript
import helpers from '../packages/helpers-lib';
```

**After Move to packages/jison (package-relative):**
```javascript
import helpers from '../../packages/helpers-lib';
```

**Reason:** Same as above - nested deeper now

---

### Files: lib/util/typal.js & lib/util/grammar-printer.js (Line 10)
**Current:**
```javascript
import helpers from '../../packages/helpers-lib';
```

**After Move:**
```javascript
import helpers from '../../../packages/helpers-lib';
```

**Reason:** lib/util/ is now in `packages/jison/lib/util/`, so need 3 levels up

---

## Configuration File Path Change Map

### File: rollup.config.js (Line 6)
**Current:**
```javascript
input: 'lib/jison.js',
output: [
  { file: 'dist/jison-cjs.js', ... },
  { file: 'dist/jison-es6.js', ... },
  { file: 'dist/jison-umd.js', ... }
]
```

**After Move:**
```javascript
input: 'lib/jison.js',  // Stays same (relative to config location)
output: [
  { file: 'dist/jison-cjs.js', ... },  // Stays same (relative to config location)
]
```

**Reason:** rollup.config.js will move to `packages/jison/rollup.config.js`, so relative paths stay the same!

---

### File: rollup.config-cli.js (Line 6)
**Current:**
```javascript
input: 'lib/cli.js',
output: [
  { file: 'dist/cli-cjs.js', ... },
]
```

**After Move:**
```javascript
// Same - stays in packages/jison/, relative paths unchanged
```

**Reason:** Same as above

---

### File: Root package.json (scripts)
**Current:**
```json
{
  "scripts": {
    "build:rollup": "mkdir -p dist && rollup -c && rollup -c rollup.config-cli.js"
  }
}
```

**After Move:**
```json
{
  "scripts": {
    "build:rollup": "npm run build:rollup -w packages/jison"
  }
}
```

**Reason:** Delegate to workspace-specific build or use `-w` flag

---

## Patch Script Path Change Map

### File: __patch_version_in_js.js (Line 4, 9, 37)
**Current:**
```javascript
const version = require('./package.json').version;     // Line 4
globby(['lib/jison*.js', 'lib/cli*.js']).then(...)     // Line 9
globby(['packages/**/package*.json']).then(...)        // Line 37
```

**After Move (stays at root):**
```javascript
const version = require('./package.json').version;     // Still reads root
globby(['packages/jison/lib/jison*.js', 'packages/jison/lib/cli*.js']).then(...)  // Updated
globby(['packages/*/package.json']).then(...)          // Updated (removes **)
```

**Why:** Script stays at root but targets moved files

---

### File: __patch_parser_kernel_in_js.js (Line 47)
**Current:**
```javascript
globby(['lib/jison.js']).then(...)
```

**After Move:**
```javascript
globby(['packages/jison/lib/jison.js']).then(...)
```

**Why:** File moved, script stays at root

---

### File: __patch_nodebang_in_js.js (Line 6)
**Current:**
```javascript
globby(['dist/cli*.js']).then(...)
```

**After Move:**
```javascript
globby(['packages/jison/dist/cli*.js']).then(...)
```

**Why:** dist folder moved

---

### File: __patch_require.js
**Current:** (stdin-based, no changes needed)
```javascript
getStdin().then(str => {
    modules.forEach(name => {
        str = str.replace(re, `require('./${name}')`)
    })
})
```

**After Move:** ✅ NO CHANGES

**Why:** Reads from stdin, processes relative module references generically

---

## Summary Table

| File | Type | Current Path | Change | Difficulty |
|------|------|--------------|--------|-----------|
| jison.js | Source | lib/jison.js | 4 imports +1 level | Easy |
| cli.js | Source | lib/cli.js | 1 import +1 level | Easy |
| typal.js | Source | lib/util/typal.js | 1 import +1 level | Easy |
| grammar-printer.js | Source | lib/util/grammar-printer.js | 1 import +1 level | Easy |
| rollup.config.js | Config | rollup.config.js | Move file + 0 path changes | Easy |
| rollup.config-cli.js | Config | rollup.config-cli.js | Move file + 0 path changes | Easy |
| __patch_version_in_js.js | Patch | __patch_version_in_js.js | 2 glob patterns | Easy |
| __patch_parser_kernel_in_js.js | Patch | __patch_parser_kernel_in_js.js | 1 glob pattern | Easy |
| __patch_nodebang_in_js.js | Patch | __patch_nodebang_in_js.js | 1 glob pattern | Easy |
| __patch_require.js | Patch | __patch_require.js | ✅ No changes | Easy |
| package.json | Config | package.json | 1-2 scripts | Easy |

**Total Changes:** ~15 simple replacements  
**Complexity:** ⭐⭐ (LOW)

---

## Validation Commands (After Migration)

```bash
# Verify imports resolve correctly
npm install
npm run build

# Check dist files generated
ls -la packages/jison/dist/

# Verify shebang in CLI
head -n1 packages/jison/dist/cli-cjs.js

# Run full test suite
npm test

# Test workspace-specific build
npm run build -w packages/jison
```

---

## Notes

1. **Rollup Configs:** These will move WITH the package, so relative paths don't need updating!
2. **Symlinks:** No symlinks to worry about, all relative imports
3. **External Deps:** All `@gerhobbelt/*` imports stay unchanged (npm resolves them)
4. **Patch Scripts:** All stay at root level for now (could be refactored later)
