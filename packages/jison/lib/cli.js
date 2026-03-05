
import Jison from './jison.js';

import json5 from '@crguezl/json5';
import helpers from '../../helpers-lib';           // jison-helpers-lib
var rmCommonWS = helpers.rmCommonWS;
var mkIdentifier = helpers.mkIdentifier;
import process from 'process';
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import assert from 'assert';


assert(Jison);
assert(typeof Jison.prettyPrint === 'function');
assert(Jison.defaultJisonOptions);
assert(typeof Jison.mkStdOptions === 'function');
assert(typeof Jison.Generator === 'function');


var version = '0.6.5-223';                              // require('./package.json').version;


function getCommandlineOptions() {
    'use strict';

    var defaults = Jison.defaultJisonOptions;
    
    const program = new Command();
    
    program
        .name('jison')
        .version(version, '-V, --version')
        .argument('[file]', 'file containing a grammar.')
        .argument('[lexfile]', 'file containing a lexical grammar.')
        .option('-j, --json', 'jison will expect a grammar in either JSON/JSON5 or JISON format: the precise format is autodetected.', defaults.json)
        .option('-o, --outfile <FILE>', 'Filepath and base module name of the generated parser. When terminated with a "/" (dir separator) it is treated as the destination directory where the generated output will be stored.')
        .option('-t, --debug', 'Debug mode.', defaults.debug)
        .option('--dump-sourcecode-on-failure', 'Dump the generated source code to a special named file when the internal generator tests fail, i.e. when the generated source code does not compile in the JavaScript engine. Enabling this option helps you to diagnose/debug crashes (thrown exceptions) in the code generator due to various reasons: you can, for example, load the dumped sourcecode in another environment (e.g. NodeJS) to get more info on the precise location and cause of the compile failure.', defaults.dumpSourceCodeOnFailure)
        .option('--throw-on-compile-failure', 'Throw an exception when the generated source code fails to compile in the JavaScript engine. **WARNING**: Turning this feature OFF permits the code generator to produce non-working source code and treat that as SUCCESS. This MAY be desirable code generator behaviour, but only rarely.', defaults.throwErrorOnCompileFailure)
        .option('-I, --info', 'Report some statistics about the generated parser.', defaults.reportStats)
        .option('-m, --module-type <TYPE>', 'The type of module to generate.', defaults.moduleType)
        .option('-n, --module-name <NAME>', 'The name of the generated parser object, namespace supported.', defaults.defaultModuleName)
        .option('-p, --parser-type <TYPE>', 'The type of algorithm to use for the parser. (lr0, slr, lalr, lr, ll)', defaults.type)
        .option('-c, --compress-tables <NUM>', 'Output compressed parser tables in generated modules. (0 = no compression, 1 = default compression, 2 = deep compression)', defaults.compressTables)
        .option('-T, --output-debug-tables', 'Output extra parser tables (rules list + look-ahead analysis) in generated modules to assist debugging / diagnostics purposes.', defaults.outputDebugTables)
        .option('-X, --default-resolve', 'Turn this OFF to make jison act another way when a conflict is found in the grammar.', !defaults.noDefaultResolve)
        .option('-Z, --partial-lr-upgrade-on-conflict', 'When enabled, the grammar generator attempts to resolve LALR(1) conflicts by, at least for the conflicting rules, moving towards LR(1) behaviour.', defaults.hasPartialLrUpgradeOnConflict)
        .option('--default-action <MODES>', rmCommonWS`
            Specify the kind of default action that jison should include for every parser rule.

            You can specify a mode for *value handling* ("$$") and one for *location tracking* ("@$"), separated by a comma, e.g.:
                --default-action=ast,none

            Supported value modes:
            - classic : generate a parser which includes the default
                            $$ = $1;
                        action for every rule.
            - ast     : generate a parser which produces a simple AST-like tree-of-arrays structure: every rule produces an array of its production terms' values. Otherwise it is dentical to "classic" mode.
            - none    : JISON will produce a slightly faster parser but then you are solely responsible for propagating rule action "$$" results. The default rule value is still deterministic though as it is set to "undefined": "$$ = undefined;"
            - skip    : same as "none" mode, except JISON does NOT INJECT a default value action ANYWHERE, hence rule results are not deterministic when you do not properly manage the "$$" value yourself!

            Supported location modes:
            - merge   : generate a parser which includes the default "@$ = merged(@1..@n);" location tracking action for every rule, i.e. the rule\'s production \'location\' is the range spanning its terms.
            - classic : same as "merge" mode.
            - ast     : ditto.
            - none    : JISON will produce a slightly faster parser but then you are solely responsible for propagating rule action "@$" location results. The default rule location is still deterministic though, as it is set to "undefined": "@$ = undefined;"
            - skip    : same as "none" mode, except JISON does NOT INJECT a default location action ANYWHERE, hence rule location results are not deterministic when you do not properly manage the "@$" value yourself!

            Notes:
            - when you do specify a value default mode, but DO NOT specify a location value mode, the latter is assumed to be the same as the former. Hence:
                  --default-action=ast
              equals:
                  --default-action=ast,ast
            - when you do not specify an explicit default mode or only a "true"/"1" value, the default is assumed: "${defaults.defaultActionMode.join(",")}".
            - when you specify "false"/"0" as an explicit default mode, "none,none" is assumed. This produces the fastest deterministic parser.
        `)
        .option('--try-catch', 'Generate a parser which catches exceptions from the grammar action code or parseError error reporting calls using a try/catch/finally code block. When you turn this OFF, it will produce a slightly faster parser at the cost of reduced code safety.', !defaults.noTryCatch)
        .option('-Q, --error-recovery-token-discard-count <COUNT>', 'Specify the number of lexed tokens that may be gobbled by an error recovery process before we cry wolf.', defaults.errorRecoveryTokenDiscardCount)
        .option('-E, --export-all-tables', 'Next to producing a grammar source file, also export the symbols, terminals, grammar and parse tables to separate JSON files for further use by other tools. The files\' names will be derived from the outputFile name by appending a suffix.', defaults.exportAllTables)
        .option('--export-ast [FILE|false|true]', 'Output grammar AST to file in JSON / JSON5 format (as identified by the file extension, JSON by default).', defaults.exportAST)
        .option('--pretty [FILE|false|true]', 'Output the generated code pretty-formatted; turning this option OFF will output the generated code as-is a.k.a. \'raw\'.', defaults.prettyCfg)
        .option('-x, --main', 'Include .main() entry point in generated commonjs module.', !defaults.noMain)
        .option('-y, --module-main <NAME>', 'The main module function definition.');

    program.parse(process.argv);

    const args = program.args;
    const opts = program.opts();

    // Map positional arguments
    if (args.length > 0) {
        opts.file = args[0];
    }
    if (args.length > 1) {
        opts.lexfile = args[1];
    }

    // Validate and transform moduleType choices
    if (opts.moduleType) {
        const validTypes = ['commonjs', 'cjs', 'js', 'iife', 'es'];
        if (!validTypes.includes(opts.moduleType)) {
            console.error(`Error: Invalid module type '${opts.moduleType}'. Valid options are: ${validTypes.join(', ')}`);
            process.exit(1);
        }
    }

    // Transform compress-tables (convert string to number)
    if (opts.compressTables !== undefined && typeof opts.compressTables === 'string') {
        const compressed = parseInt(opts.compressTables);
        if (isNaN(compressed) || compressed < 0 || compressed > 2) {
            console.error('Error: compress-tables must be 0, 1, or 2');
            process.exit(1);
        }
        opts.compressTables = compressed;
    }

    // Transform error-recovery-token-discard-count (convert string to number)
    if (opts.errorRecoveryTokenDiscardCount !== undefined && typeof opts.errorRecoveryTokenDiscardCount === 'string') {
        const count = parseInt(opts.errorRecoveryTokenDiscardCount);
        if (isNaN(count) || count < 2) {
            console.error('Error: error-recovery-token-discard-count must be an integer >= 2');
            process.exit(1);
        }
        opts.errorRecoveryTokenDiscardCount = count;
    }

    // Transform default-action mode
    if (opts.defaultAction) {
        var v = ('' + opts.defaultAction).split(',');
        if (v.length > 2) {
            console.error('Error: default-action expects at most 2 modes!');
            process.exit(1);
        }
        var def = defaults.defaultActionMode;
        v = v.map(function cvt_modes(mode, idx) {
            mode = mode.trim();
            switch (mode) {
            case 'false':
            case '0':
                return "none";

            case 'true':
            case '1':
            case '':
                return def[idx];

            default:
                return mode;
            }
        });
        if (v.length === 1) {
            v[1] = v[0];
        }
        opts.defaultAction = v;
        opts.defaultActionMode = v;
    }

    // Transform export-ast
    if (opts.exportAst !== undefined) {
        switch (opts.exportAst) {
        case 'false':
        case '0':
            opts.exportAST = false;
            break;

        case 'true':
        case '1':
            opts.exportAST = true;
            break;

        default:
            opts.exportAST = opts.exportAst;
            break;
        }
        delete opts.exportAst;
    }

    // Transform pretty config
    if (opts.pretty !== undefined) {
        switch (opts.pretty) {
        case 'false':
        case '0':
            opts.prettyCfg = false;
            break;

        case 'true':
        case '1':
            opts.prettyCfg = true;
            break;

        default:
            opts.prettyCfg = opts.pretty;
            break;
        }
        delete opts.pretty;
    }

    // Ensure camelCase property names
    opts.outfile = opts.outfile || opts.outFile;
    opts.dumpSourceCodeOnFailure = opts.dumpSourcecodeOnFailure !== undefined ? opts.dumpSourcecodeOnFailure : opts.dumpSourceCodeOnFailure;
    opts.throwErrorOnCompileFailure = opts.throwOnCompileFailure !== undefined ? opts.throwOnCompileFailure : opts.throwErrorOnCompileFailure;
    opts.reportStats = opts.info !== undefined ? opts.info : opts.reportStats;
    opts.moduleType = opts.moduleType || defaults.moduleType;
    opts.moduleName = opts.moduleName || opts.defaultModuleName;
    opts.parserType = opts.parserType || defaults.type;
    opts.compressTables = opts.compressTables !== undefined ? opts.compressTables : defaults.compressTables;
    opts.outputDebugTables = opts.outputDebugTables !== undefined ? opts.outputDebugTables : defaults.outputDebugTables;
    opts.hasDefaultResolve = opts.defaultResolve !== undefined ? opts.defaultResolve : !defaults.noDefaultResolve;
    opts.hasPartialLrUpgradeOnConflict = opts.partialLrUpgradeOnConflict !== undefined ? opts.partialLrUpgradeOnConflict : defaults.hasPartialLrUpgradeOnConflict;
    opts.hasTryCatch = opts.tryCatch !== undefined ? opts.tryCatch : !defaults.noTryCatch;
    opts.errorRecoveryTokenDiscardCount = opts.errorRecoveryTokenDiscardCount !== undefined ? opts.errorRecoveryTokenDiscardCount : defaults.errorRecoveryTokenDiscardCount;
    opts.exportAllTables = opts.exportAllTables !== undefined ? opts.exportAllTables : defaults.exportAllTables;
    opts.main = opts.main !== undefined ? opts.main : !defaults.noMain;

    if (opts.debug) {
        console.log("JISON CLI options:\n", opts);
    }

    return opts;
}


function cliMain(opts) {
    //opts = Jison.mkStdOptions(opts);

    function isDirectory(fp) {
        try {
            return fs.lstatSync(fp).isDirectory();
        } catch (e) {
            return false;
        }
    }

    function mkdirp(fp) {
        if (!fp || fp === '.' || fp.length === 0) {
            return false;
        }
        try {
            fs.mkdirSync(fp);
            return true;
        } catch (e) {
            if (e.code === 'ENOENT') {
                var parent = path.dirname(fp);
                // Did we hit the root directory by now? If so, abort!
                // Else, create the parent; iff that fails, we fail too...
                if (parent !== fp && mkdirp(parent)) {
                    try {
                        // Retry creating the original directory: it should succeed now
                        fs.mkdirSync(fp);
                        return true;
                    } catch (e) {
                        return false;
                    }
                }
            }
        }
        return false;
    }

    function processInputFile() {
        // getting raw files
        var lex;
        var original_cwd = process.cwd();

        if (opts.lexfile) {
            lex = fs.readFileSync(path.normalize(opts.lexfile), 'utf8');
        }
        var raw = fs.readFileSync(path.normalize(opts.file), 'utf8');

        // making best guess at json mode
        opts.json = path.extname(opts.file) === '.json' || opts.json;

        // When only the directory part of the output path was specified, then we
        // do NOT have the target module name in there as well!
        var outpath = opts.outfile;
        if (typeof outpath === 'string') {
            if (/[\\\/]$/.test(outpath) || isDirectory(outpath)) {
                opts.outfile = null;
                outpath = outpath.replace(/[\\\/]$/, '');
            } else {
                outpath = path.dirname(outpath);
            }
        } else {
            outpath = null;
        }
        if (outpath && outpath.length > 0) {
            outpath += '/';
        } else {
            outpath = '';
        }

        // setting output file name and module name based on input file name
        // if they aren't specified.
        var name = path.basename(opts.outfile || opts.file);

        // get the base name (i.e. the file name without extension)
        // i.e. strip off only the extension and keep any other dots in the filename
        name = path.basename(name, path.extname(name));

        opts.outfile = opts.outfile || (outpath + name + '.js');
        if (!opts.moduleName && name) {
            opts.moduleName = opts.defaultModuleName = mkIdentifier(name);
        }

        if (opts.exportAST) {
            // When only the directory part of the AST output path was specified, then we
            // still need to construct the JSON AST output file name!
            var astpath, astname, ext;

            astpath = opts.exportAST;
            if (typeof astpath === 'string') {
                if (/[\\\/]$/.test(astpath) || isDirectory(astpath)) {
                    opts.exportAST = null;
                    astpath = astpath.replace(/[\\\/]$/, '');
                } else {
                    astpath = path.dirname(astpath);
                }
            } else {
                astpath = path.dirname(opts.outfile);
            }
            if (astpath && astpath.length > 0) {
                astpath = astpath.replace(/[\\\/]$/, '') + '/';
            } else {
                astpath = '';
            }

            // setting AST output file name and module name based on input file name
            // if they aren't specified.
            if (typeof opts.exportAST === 'string') {
                astname = path.basename(opts.exportAST);
                ext = path.extname(astname);

                // get the base name (i.e. the file name without extension)
                // i.e. strip off only the extension and keep any other dots in the filename.
                astname = path.basename(astname, ext);
            } else {
                // get the base name (i.e. the file name without extension)
                // i.e. strip off only the extension and keep any other dots in the filename.
                astname = path.basename(opts.outfile, path.extname(opts.outfile));

                // Then add the name postfix '-AST' to ensure we won't collide with the input file.
                astname += '-AST';
                ext = '.jison';
            }

            opts.exportAST = path.normalize(astpath + astname + ext);
        }

        // Change CWD to the directory where the source grammar resides: this helps us properly
        // %include any files mentioned in the grammar with relative paths:
        var new_cwd = path.dirname(path.normalize(opts.file));
        process.chdir(new_cwd);

        var parser = cli.generateParserString(raw, lex, opts);

        // and change back to the CWD we started out with:
        process.chdir(original_cwd);

        opts.outfile = path.normalize(opts.outfile);
        mkdirp(path.dirname(opts.outfile));
        fs.writeFileSync(opts.outfile, parser, 'utf8');
        console.log('JISON output', 'for module [' + opts.moduleName + '] has been written to file:', opts.outfile);

        if (opts.exportAllTables.enabled) {
            // Determine the output file path 'template' for use by the exportAllTables
            // functionality:
            var out_base_fname = path.join(path.dirname(opts.outfile), path.basename(opts.outfile, path.extname(opts.outfile)));

            var t = opts.exportAllTables;

            for (var id in t) {
                if (t.hasOwnProperty(id) && id !== 'enabled') {
                    var content = t[id];
                    if (content) {
                        var fname = out_base_fname + '.' + id.replace(/[^a-zA-Z0-9_]/g, '_') + '.json';
                        fs.writeFileSync(fname, JSON.stringify(content, null, 2), 'utf8');
                        console.log('JISON table export', 'for [' + id + '] has been written to file:', fname);
                    }
                }
            }
        }

        if (opts.exportAST) {
            var content = opts.exportedAST;
            var fname = opts.exportAST;

            var ext = path.extname(fname);
            switch (ext) {
            case '.json5':
            case '.jison':
            case '.y':
            case '.yacc':
            case '.l':
            case '.lex':
                content = Jison.prettyPrint(content, {
                    format: ext.substr(1)
                });
                break;

            default:
            case '.json':
                content = JSON.stringify(content, null, 2);
                break;
            }
            mkdirp(path.dirname(fname));
            fs.writeFileSync(fname, content, 'utf8');
            console.log('Grammar AST export', 'for module [' + opts.moduleName + '] has been written to file:', fname);
        }
    }

    function readin(cb) {
        var stdin = process.openStdin(),
        data = '';

        stdin.setEncoding('utf8');
        stdin.addListener('data', function (chunk) {
            data += chunk;
        });
        stdin.addListener('end', function () {
            cb(data);
        });
    }

    function processStdin() {
        readin(function processStdinReadInCallback(raw) {
            console.log('', cli.generateParserString(raw, null, opts));
        });
    }

    // if an input file wasn't given, assume input on stdin
    if (opts.file) {
        processInputFile();
    } else {
        processStdin();
    }
}


function generateParserString(grammar, optionalLexSection, opts) {
    'use strict';

//      var settings = Jison.mkStdOptions(opts);

    var generator = new Jison.Generator(grammar, optionalLexSection, opts);
    var srcCode = generator.generate(opts);
    generator.reportGrammarInformation();

    // as `opts` is cloned inside `generator.generate()`, we need to fetch
    // the extra exported tables from the `options` member of the generator
    // itself:
    opts.exportAllTables = generator.options.exportAllTables;
    opts.exportedAST = generator.grammar;

    return srcCode;
}

var cli = {
    main: cliMain,
    generateParserString: generateParserString
};


export default cli;


if (require.main === module) {
    var opts = getCommandlineOptions();
    cli.main(opts);
}

