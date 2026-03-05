
import fs from 'fs';
import path from 'path';
import { Command } from 'commander';

import helpers from '../helpers-lib';
var mkIdentifier = helpers.mkIdentifier;

import RegExpLexer from './regexp-lexer.js';

var version = '0.6.5-223';                              // require('./package.json').version;


function getCommandlineOptions() {
    'use strict';

    var program = new Command();
    
    var opts = {
        file: null,
        json: false,
        outfile: null,
        debug: false,
        dumpSourceCodeOnFailure: true,
        throwErrorOnCompileFailure: true,
        reportStats: false,
        moduleType: 'commonjs',
        moduleName: null,
        main: false,
        moduleMain: null
    };
    
    program
        .name('jison-lex')
        .version(version)
        .strictOption(false)
        .argument('[file]', 'file containing a lexical grammar.')
        .option('-j, --json', 'jison will expect a grammar in either JSON/JSON5 or JISON format: the precise format is autodetected.')
        .option('-o, --outfile <FILE>', 'Filepath and base module name of the generated parser. When terminated with a "/" (dir separator) it is treated as the destination directory where the generated output will be stored.')
        .option('-t, --debug', 'Debug mode.')
        .option('--dump-sourcecode-on-failure', 'Dump the generated source code to a special named file when the internal generator tests fail.')
        .option('--throw-on-compile-failure', 'Throw an exception when the generated source code fails to compile in the JavaScript engine.')
        .option('-I, --info', 'Report some statistics about the generated parser.')
        .option('-m, --module-type <TYPE>', 'The type of module to generate (commonjs, es, js)', 'commonjs')
        .option('-n, --module-name <NAME>', 'The name of the generated parser object, namespace supported.')
        .option('-x, --main', 'Include .main() entry point in generated commonjs module.')
        .option('-y, --module-main <NAME>', 'The main module function definition.')
        .action(function(file) {
            opts.file = file;
        });

    var parsed = program.parse();
    var cmdOpts = parsed.opts();
    
    // Map commander options to our internal format
    opts.json = cmdOpts.json || false;
    opts.outfile = cmdOpts.outfile || null;
    opts.debug = cmdOpts.debug || false;
    opts.dumpSourceCodeOnFailure = cmdOpts.dumpSourcecodeOnFailure !== false;
    opts.throwErrorOnCompileFailure = cmdOpts.throwOnCompileFailure !== false;
    opts.reportStats = cmdOpts.info || false;
    opts.moduleType = cmdOpts.moduleType;
    opts.moduleName = cmdOpts.moduleName || null;
    opts.main = cmdOpts.main || false;
    opts.moduleMain = cmdOpts.moduleMain || null;

    if (opts.debug) {
        console.log("JISON-LEX CLI options:\n", opts);
    }

    return opts;
}


function cliMain(opts) {

    opts = RegExpLexer.mkStdOptions(opts);

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

        // Change CWD to the directory where the source grammar resides: this helps us properly
        // %include any files mentioned in the grammar with relative paths:
        var new_cwd = path.dirname(path.normalize(opts.file));
        process.chdir(new_cwd);

        var lexer = cli.generateLexerString(raw, opts);

        // and change back to the CWD we started out with:
        process.chdir(original_cwd);

        opts.outfile = path.normalize(opts.outfile);
        mkdirp(path.dirname(opts.outfile));
        fs.writeFileSync(opts.outfile, lexer);
        console.log('JISON-LEX output for module [' + opts.moduleName + '] has been written to file:', opts.outfile);
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
            console.log(cli.generateLexerString(raw, opts));
        });
    }

    // if an input file wasn't given, assume input on stdin
    if (opts.file) {
        processInputFile();
    } else {
        processStdin();
    }
}


function generateLexerString(lexerSpec, opts) {
    'use strict';

    // var settings = RegExpLexer.mkStdOptions(opts);
    var predefined_tokens = null;

    return RegExpLexer.generate(lexerSpec, predefined_tokens, opts);
}

var cli = {
    main: cliMain,
    generateLexerString: generateLexerString
};


export default cli;


if (require.main === module) {
    var opts = getCommandlineOptions();
    cli.main(opts);
}

