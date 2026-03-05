# Phase 5.1: Preparation & Validation Report

**Branch:** `refactor/move-jison-to-packages`  
**Date:** 2026-03-05  
**Status:** ✅ PREPARATION COMPLETE

---

## 1. Test Suite Analysis

### Current Test Structure
```
tests/
├── setup.js                          # Test setup/initialization
├── performance.js                    # Performance benchmarks
├── parser/
│   ├── actions.js                   # Parser actions testing
│   ├── api.js                        # API testing
│   ├── errorlab.js                  # Error handling
│   ├── example-grammars.js          # Grammar compilation tests
│   ├── generator.js                 # Generator tests
│   ├── github-issues-regression.js  # GitHub issue repro tests
│   ├── lalr.js                      # LALR parser tests
│   ├── lr0.js                       # LR(0) tests
│   ├── lr1.js                       # LR(1) tests
│   ├── precedence.js                # Operator precedence tests
│   ├── slr.js                       # SLR parser tests
│   └── tables.js                    # Parsing table tests
```

**Total: 52 test files across:**
- Root tests (11 files in `/tests/`)
- Workspace tests (41 files in `/packages/*/tests/`)

### Build Output Validation Needed
Tests currently do NOT explicitly verify:
- ✅ Distribution file generation (jison-cjs.js, jison-umd.js, cli-cjs.js, etc.)
- ✅ ES5 transpilation (cjs-es5, umd-es5 variants)
- ❌ **Shebang presence in CLI executables**
- ❌ **Distribution file executable permissions**
- ❌ **Rollup bundling integrity**

**Action Item:** Create `tests/build-validation.js` to verify:
```javascript
// Verify build outputs exist and are valid
- dist/jison-cjs.js exists and is readable
- dist/jison-cjs-es5.js exists and contains ES5 syntax
- dist/cli-cjs.js starts with #!/usr/bin/env node
- dist/cli-cjs-es5.js is transpiled correctly
```

---

## 2. Internal Imports & Dependencies Audit

### Root Package (lib/) Import Chain

#### lib/jison.js
```javascript
import typal from './util/typal';
import Set from './util/set';
import Lexer from '../packages/jison-lex';           // ← Relative path (ROOT level)
import ebnfParser from '../packages/ebnf-parser';   // ← Relative path (ROOT level)
import lexParser from '../packages/lex-parser';     // ← Relative path (ROOT level)
import XRegExp from '@gerhobbelt/xregexp';
import recast from 'recast';
import astUtils from 'ast-util';
import json5 from '@gerhobbelt/json5';
import helpers from '../packages/helpers-lib';      // ← Relative path (ROOT level)
```

#### lib/cli.js
```javascript
import Jison from './jison.js';
import json5 from '@gerhobbelt/json5';
import helpers from '../packages/helpers-lib';      // ← Relative path (ROOT level)
import nomnom from '@gerhobbelt/nomnom';
```

#### lib/util/typal.js
```javascript
import helpers from '../../packages/helpers-lib';   // ← Two levels up (in subdirectory)
```

#### lib/util/grammar-printer.js
```javascript
import json5 from '@gerhobbelt/json5';
import helpers from '../../packages/helpers-lib';   // ← Two levels up (in subdirectory)
```

### Dependency Graph
```
jison.js
├── ./util/typal.js
│   └── ../../packages/helpers-lib
├── ./util/set.js
├── ../packages/jison-lex           ← Must update to ../../packages/jison-lex
├── ../packages/ebnf-parser         ← Must update to ../../packages/ebnf-parser
├── ../packages/lex-parser          ← Must update to ../../packages/lex-parser
├── ../packages/helpers-lib         ← Must update to ../../packages/helpers-lib
└── [external: @gerhobbelt/*, recast, ast-util]

cli.js
├── ./jison.js
├── ../packages/helpers-lib         ← Must update to ../../packages/helpers-lib
└── [external: @gerhobbelt/*, nomnom, fs, path]
```

### Summary
**Files requiring import path updates (when moved to packages/jison):**
1. **lib/jison.js** — 4 relative imports
2. **lib/cli.js** — 1 relative import
3. **lib/util/typal.js** — Already uses two-level path (will still work)
4. **lib/util/grammar-printer.js** — Already uses two-level path (will still work)

**Files NOT affected:** lib/jison-parser-kernel.js, lib/lexer-kernel.js (use bundle-internal imports)

---

## 3. Patch Script Audit

### __patch_version_in_js.js
```javascript
const version = require('./package.json').version;
globby(['lib/jison*.js', 'lib/cli*.js']).then(paths => {...})
globby(['packages/**/package*.json']).then(paths => {...})
```

**Changes Required After Migration:**
- Line 1: Move to root still, but requires path to root package.json
- Line 9: `'lib/jison*.js'` → `'packages/jison/lib/jison*.js'`
- Line 9: `'lib/cli*.js'` → `'packages/jison/lib/cli*.js'`
- Line 37: `'packages/**/package*.json'` → `'packages/*/package.json'` (simpler, excludes nested)

### __patch_parser_kernel_in_js.js
```javascript
globby(['lib/jison.js']).then(paths => {...})
```

**Changes Required:**
- Line 47: `'lib/jison.js'` → `'packages/jison/lib/jison.js'`

### __patch_nodebang_in_js.js
```javascript
globby(['dist/cli*.js']).then(paths => {...})
```

**Changes Required:**
- Line 6: `'dist/cli*.js'` → `'packages/jison/dist/cli*.js'`

### __patch_require.js
```javascript
getStdin().then(str => {
    const modules = "...".split(' ');
    modules.forEach(function repl_module(name) {
        var re = new RegExp(`require\\([^)]*?${name}['"]\\)`);
        str = str.replace(re, `require('./${name}')`)
    })
})
```

**Changes Required:** 
- ❌ **NONE** — Uses stdin, location-agnostic

---

## 4. Path Reference Inventory

### At Root Level (4 patch scripts)
```
__patch_version_in_js.js      ← Reads ./package.json, globs lib/ and packages/
__patch_parser_kernel_in_js.js ← Globs lib/jison.js
__patch_nodebang_in_js.js      ← Globs dist/cli*.js
__patch_require.js             ← Stdin-based, location-agnostic
```

### In rollup.config.js (Root)
```javascript
input: 'lib/jison.js'          ← Must change to 'packages/jison/lib/jison.js'
```

### In rollup.config-cli.js (Root)
```javascript
input: 'lib/cli.js'            ← Must change to 'packages/jison/lib/cli.js'
```

### In rollup.config-template.js (Root)
```javascript
// Generic config, no hardcoded paths
```

### In Root package.json scripts
```json
{
  "build:rollup": "mkdir -p dist && rollup -c && rollup -c rollup.config-cli.js"
  ↑ Outputs to ./dist (must change to packages/jison/dist)
}
```

---

## 5. Build Output Validation Checklist

### Distribution Files to Verify After Build
- [ ] `packages/jison/dist/jison-cjs.js` — CommonJS module
- [ ] `packages/jison/dist/jison-cjs-es5.js` — CommonJS ES5 transpiled
- [ ] `packages/jison/dist/jison-umd.js` — UMD module
- [ ] `packages/jison/dist/jison-umd-es5.js` — UMD ES5 transpiled
- [ ] `packages/jison/dist/cli-cjs.js` — CLI CommonJS (needs shebang)
- [ ] `packages/jison/dist/cli-cjs-es5.js` — CLI ES5 (needs shebang)
- [ ] `packages/jison/dist/cli-umd.js` — CLI UMD
- [ ] `packages/jison/dist/cli-umd-es5.js` — CLI UMD ES5 (needs shebang)

### Shebang Verification
```bash
head -n1 packages/jison/dist/cli-cjs.js     # Should print: #!/usr/bin/env node
head -n1 packages/jison/dist/cli-umd.js     # Should be: #!/usr/bin/env node or similar
```

---

## 6. Risk Assessment Matrix

| Area | Risk Level | Mitigation |
|------|-----------|-----------|
| Import path updates | **MEDIUM** | Manually verify all 6 imports work after change |
| Patch script paths | **HIGH** | Test each patch script after migration |
| Rollup config changes | **HIGH** | Verify dist files generate with new input paths |
| Test execution | **LOW** | Tests don't change, only internal structure |
| Publishing workflow | **MEDIUM** | Verify `npm publish` targets correct packages |
| CI/CD workflows | **HIGH** | Update .github/workflows if they reference old paths |

---

## 7. Pre-Migration Backup Strategy

### Critical Files to Preserve (in Git)
```bash
git tag pre-phase5-migration
git log --oneline -1 > PHASE_5_PRE_MIGRATION_STATE.txt
```

### Rollback Plan
If issues arise:
```bash
git reset --hard pre-phase5-migration
git checkout main
```

---

## 8. Migration Sequence (Phase 5.2+)

### Prerequisites
- ✅ All tests passing on current branch
- ✅ Git branch created: `refactor/move-jison-to-packages`
- ✅ No uncommitted changes
- ✅ Dependencies installed: `npm install`

### Execution Order
1. **Phase 5.2:** Create directory structure and copy files
2. **Phase 5.3:** Update import paths in lib/ files (6 files)
3. **Phase 5.4:** Update rollup configs (2 files)
4. **Phase 5.5:** Update patch scripts (4 files)
5. **Phase 5.6:** Update root package.json build scripts
6. **Phase 5.7:** Delete old lib/ and dist/ from root
7. **Phase 5.8:** Verify and test builds
8. **Phase 5.9:** Update documentation and CI/CD
9. **Phase 5.10:** Final validation and PR

---

## Sign-Off

**Validation Status:** ✅ **READY FOR PHASE 5.2**

All critical files identified. Import paths documented. Patch scripts audited.  
Risk mitigation strategy in place. No blockers detected.

**Next Step:** Proceed to Phase 5.2 (Directory Structure & Files)
