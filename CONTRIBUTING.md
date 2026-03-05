Contributing to Jison
=======

Fork, make your changes, run tests and/or add tests then send a pull request.

## Required tools for Development

- NodeJS (v8.0 or higher)
- NPM (v7.0 or higher, for npm workspaces support)


## Installing

JISON uses npm workspaces to manage multiple packages. Install dependencies across all workspaces:

```
$ npm run prep
```

This installs all dependencies for the main project and all workspace packages (helpers-lib, lex-parser, ebnf-parser, jison-lex, json2jison, jison2json, and examples).


## Building the app

Build the entire project across all workspaces:

```
$ npm run build
```

This builds all packages, generates distribution files, and transpiles code to ES5 for compatibility.

## Running tests

Run tests across all workspaces:

```
$ npm run test
```

For coverage reports:

```
$ npm run test-nyc
```

## Building the site and examples

To build the site and all parser examples, run:

```
$ npm run site
```

This builds the application, runs tests, and builds all ~200 parser examples in the `examples/` directory.


## Building a new (beta-)release

Bump all packages' versions (revision/build number: the **fourth** number in the SEMVER):

```
$ npm run bump
```

This patches all `package.json` files across all workspaces.

Then build everything:

```
$ npm run build
$ npm run site
```

When you want to do a complete clean rebuild (removing all node_modules and dist files):

```
$ npm run superclean
$ npm run prep
$ npm run build
$ npm run site
```

Apply the new version as a git tag:

```
$ npm run git-tag
```

### Doing all this in one go

You can accomplish all the above automatically with:

```
./git-tag-and-bump-and-rebuild.sh
```

Or run the comprehensive workflow command:

```
$ npm run everything
```

This cleans, updates dependencies, prepares, builds, tests, generates coverage, and builds examples.

---

## npm Workspaces Overview

The project is organized as an npm workspace with the following packages:

- **packages/helpers-lib** — Shared utilities
- **packages/lex-parser** — Lexical analyzer parser
- **packages/ebnf-parser** — EBNF/BNF grammar parser  
- **packages/jison-lex** — Lexer generator
- **packages/json2jison** — JSON to Jison grammar converter
- **packages/jison2json** — Jison to JSON grammar converter
- **examples** — ~200 parser examples for testing and documentation

All workspace packages use shared devDependencies (Rollup, Babel, Mocha, Nyc, etc.) installed at the root level.