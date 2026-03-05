#!/usr/bin/env node

// Encodes Jison formatted grammars as JSON

var version = require('./package.json').version;

var path = require('path');
var fs = require('fs');
var { Command } = require('commander');

var jison2json = require('./jison2json');

var program = new Command();

program
  .version(version)
  .strictOption(false)
  .argument('[file]', 'file containing a JISON grammar')
  .argument('[lexfile]', 'optional file containing a JISON lexer')
  .option('-o, --outfile <FILE>', 'Filename and base module name of the generated JSON file')
  .action(function(file, lexfile, options) {
    var opts = { file, lexfile, outfile: options.outfile };
    exports.main(opts);
  });

program.parse(process.argv);

// Handle case where no arguments provided
if (!process.argv.slice(2).length) {
  var opts = {};
  exports.main(opts);
}


exports.main = function main (opts) {
    var bnf, lex;

    if (opts.file) {
        bnf = fs.readFileSync(path.normalize(opts.file), 'utf8');
        if (opts.lexfile) {
            lex = fs.readFileSync(path.normalize(opts.lexfile), 'utf8');
        }
	
	var outpath = (opts.outfile || opts.file);
    	var name = path.basename(outpath).replace(/\..*$/g, '');
    	outpath = path.dirname(outpath);

        fs.writeFileSync(path.resolve(outpath, name + '.json'), jison2json.convert(bnf, lex));
    } else {
        input(function (bnf) {
            console.log(jison2json.convert(bnf));
        });
    }
};


function input (cb) {
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



if (require.main === module) {
    exports.main(opts.parse());
}

