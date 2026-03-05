# Jison NPM Workspaces Migration

This document describes the migration from Makefiles to npm workspaces for the Jison monorepo build system.

## Overview

The Jison project has been restructured to use **npm workspaces** instead of Makefiles for dependency management and build orchestration. This provides:

- ✅ Unified dependency resolution across all packages
- ✅ Simplified dependency management (no duplication)
- ✅ Native npm support (no additional tools required)
- ✅ Better integration with modern JavaScript tooling
- ✅ Easier local development and testing

## Workspace Structure

```
jison (root - app/CLI)
├── packages/
│   ├── helpers-lib - Shared utility library
│   ├── lex-parser - Lexer grammar parser
│   ├── ebnf-parser - EBNF grammar parser
│   ├── jison-lex - Lexical analyzer generator
│   ├── json2jison - JSON to Jison grammar converter
│   └── jison2json - Jison to JSON grammar converter
└── examples/ - Parser examples (Makefile-based, migration pending)
```

## Phases Completed

### Phase 1: Configuration Setup ✅
- Added `"workspaces"` array to root `package.json`
- Configured workspace-aware npm scripts at root level
- Shared devDependencies at root (inherited by all packages)
- `.babelrc` configuration ready for all packages

### Phase 2: Package Scripts Migration ✅
Converted Makefile targets to npm scripts in all 6 workspace packages:

| Package | Build Commands | Test Commands |
|---------|---|---|
| helpers-lib | `npm run build` (rollup + babel) | `npm run test`, `npm run test-nyc` |
| lex-parser | `npm run build` (jison + rollup + babel) | `npm run test`, `npm run test-nyc` |
| ebnf-parser | `npm run build` (complex jison + rollup + babel) | `npm run test`, `npm run test-nyc` |
| jison-lex | `npm run build` (lexer kernel + rollup + babel) | `npm run test`, `npm run test-nyc` |
| json2jison | *(no build)* | `npm run test`, `npm run test-nyc` |
| jison2json | *(no build)* | `npm run test`, `npm run test-nyc` |

All packages support: `npm-update`, `bump`, `pub` (publish), `clean`, `superclean`

### Phase 3: Build Tool Integration ✅
Created comprehensive root-level npm scripts that orchestrate workspace operations:

#### Build Commands

```bash
npm run build:patch        # Patch version and parser kernel info
npm run build:packages     # Build all packages in workspaces
npm run build:rollup       # Run rollup for root distribution
npm run build:transpile    # Babel ES5 transpilation for root
npm run build              # Full build orchestration (all above)
```

#### Test Commands

```bash
npm test                   # Run tests in all packages + root tests
npm run test-nyc           # Run tests with NYC code coverage aggregation
npm run clean-nyc          # Clear coverage cache
npm run report-nyc         # Generate coverage report
```

#### Maintenance Commands

```bash
npm run sync               # Sync version/kernel (alias: regen)
npm run bump               # Bump prerelease version
npm run git-tag            # Create git tag from version
npm run git                # Git pull --all && push --all
npm run pub                # Publish root package to npm
npm run pub:all            # Publish all packages to npm
npm run npm-update         # Update deps in all packages
npm run clean              # Clean artifacts across workspaces
npm run superclean         # Full clean (node_modules, dist, etc.)
npm run prep               # Prepare workspace (npm install + package preps)
```

#### Convenience Commands

```bash
npm run site               # Build + test + examples (full site build)
npm run everything         # Full clean, update, prep, and build cycle
npm run all                # Full build with coverage reporting
npm run website            # Start live-server for docs/
```

### Phase 4: Examples Migration ✅
Converted examples from Makefile-based to npm workspace integration:

#### Examples Workspace Structure
- Created `examples/package.json` with npm scripts
- Added examples to root workspaces array
- Examples is a private package (not published to npm)

#### Example Build Categories
```bash
npm run build:examples              # Build all test categories
npm run build:examples:error-handling   # Build error handling tests
npm run build:examples:basic            # Build basic examples
npm run build:examples:github-issues    # Build GitHub issue examples
npm run build:examples:misc             # Build miscellaneous examples
npm run build:examples:codegen          # Build codegen feature testers
```

#### Example Build Features
- ✅ ~200 individual example targets organized into 5 categories
- ✅ Gracefully handles build failures per example (||true pattern)
- ✅ Output directory: `examples/output/<example>/`
- ✅ Integrated into root workflow (`site`, `all`, `everything`)

#### Root Integration
- `npm run examples-test` → builds all examples
- `npm run examples` → alias for examples-test
- `npm run site` → includes example build
- `npm run all` → includes example build with coverage reporting
- `npm run everything` → full clean + update + build cycle including examples

## How Workspaces Work

### Hoisting Dependencies
npm workspaces automatically **hoist** dependencies to the root `node_modules/`:
- Shared devDependencies (babel, rollup, mocha, nyc) installed once at root
- Package-specific dependencies resolved with workspace references
- Faster installs and smaller disk footprint

### Running Scripts Across Workspaces

```bash
# Run a script in all packages that have it
npm run build --workspaces --if-present

# The --if-present flag ensures the command succeeds even if some packages 
# don't have that script
```

## Build Workflow

The build process follows this order:

1. **Patch phase** (`build:patch`)
   - Updates version info: `package.json` → `dist/` files
   - Patches parser kernel code

2. **Package builds** (`build:packages`)
   - Builds each workspace package in order:
     - helpers-lib → lex-parser → ebnf-parser → jison-lex → json2jison → jison2json
   - Each package runs rollup + babel transpilation

3. **Root rollup** (`build:rollup`)
   - Main jison entry point: `lib/jison.js` → `dist/jison-*.js`
   - CLI entry point: `lib/cli.js` → `dist/cli-*.js`
   - Both CommonJS and UMD formats

4. **Root transpilation** (`build:transpile`)
   - Babel ES5 transpilation of all dist files
   - Patches node shebang in CLI file

## File Structure After Build

```
dist/
├── jison-cjs.js            (CommonJS ES6)
├── jison-cjs-es5.js        (CommonJS ES5 - transpiled)
├── jison-es6.js            (ES6 modules)
├── jison-umd.js            (UMD ES6)
├── jison-umd-es5.js        (UMD ES5 - transpiled)
├── cli-cjs.js              (CLI CommonJS ES6)
├── cli-cjs-es5.js          (CLI CommonJS ES5 - transpiled) ← used as bin
├── cli-es6.js              (CLI ES6 modules)
├── cli-umd.js              (CLI UMD ES6)
└── cli-umd-es5.js          (CLI UMD ES5 - transpiled)

packages/*/dist/           (Similar structure for each package)
```

## Testing

### Root Tests
Located in `tests/` directory, test the main jison parser generator.

### Package Tests
Each package has its own `tests/` directory specific to its functionality.

### Coverage
The `test-nyc` command aggregates coverage from all packages and root into a single report:
```bash
npm run test-nyc && npm run report-nyc
# Opens ./coverage/index.html with combined coverage metrics
```

## Migration Notes

⚠️ **Important**:
- All Makefile functionality has been migrated to npm workspaces
- Some tests may fail due to existing issues in the codebase (this is expected)
- Git submodules are NOT used; packages are local to this monorepo
- Makefile files remain in the repository but are no longer required

## Common Tasks

### Local Development
```bash
# Setup
npm install

# Build packages only
npm run build:packages

# Build root distribution
npm run build:rollup

# Full build
npm run build

# Run tests
npm test

# Run with coverage
npm run test-nyc
```

### Version Management
```bash
# Bump version
npm run bump

# Create git tag
npm run git-tag

# Publish all packages
npm run pub:all
```

### Cleanup
```bash
# Light cleanup (removes artifacts)
npm run clean

# Deep cleanup (removes everything, need fresh npm install after)
npm run superclean
```

## Troubleshooting

### Build Fails with "Module not found"
Ensure dependencies are installed and hoisted:
```bash
npm install
npm run build:patch  # Ensure version info is up to date
npm run build
```

### Tests Fail After Build
Some tests may fail due to pre-existing issues in the codebase. This is expected. Check the test output for specific failures.

### Conflicting Versions
npm workspaces prevent most version conflicts. If issues persist:
```bash
npm run superclean
npm install
npm run build
```

## Next Steps

### Phase 5: Optional Cleanup & Documentation
- Archive old Makefile files (or keep for reference)
- Remove Makefile references from README.md and other documentation
- Update CI/CD configurations to use npm scripts instead of make

### Phase 6: CI/CD Integration (Pending)
- GitHub Actions workflows using npm commands
- Docker builds using npm workspaces
- Automated release/publish workflows

### Future Enhancements
- Add npm script for automated changelog generation
- Integrate turbo or other monorepo optimizers for faster builds
- Add pre-commit hooks for linting and testing
- Create automated version management tooling

## References

- [npm workspaces documentation](https://docs.npmjs.com/cli/v7/using-npm/workspaces)
- [Monorepo best practices](https://turbo.build/repo/docs/handbook/what-is-a-monorepo)
- [Root package.json](../package.json)
- [Workspace package.json files](../packages/*/package.json)
