#!/usr/bin/env node

// Converts json grammar format to Jison grammar format

var version = require('./package.json').version;

var path = require('path');
var fs = require('fs');
var { Command } = require('commander');

var json2jison = require('./json2jison');

var program = new Command();

program
  .version(version)
  .strictOption(false)
  .argument('[file]', 'file containing a grammar in JSON format')
  .option('-o, --outfile <FILE>', 'Filename and base module name of the generated jison grammar file')
  .action(function(file, options) {
    var opts = { file, outfile: options.outfile };
    exports.main(opts);
  });

program.parse(process.argv);

// Handle case where no arguments provided
if (!process.argv.slice(2).length) {
  var opts = {};
  exports.main(opts);
}


exports.main = function main (opts) {
    if (opts.file) {
        var raw = fs.readFileSync(path.normalize(opts.file), 'utf8');
	      var outpath = (opts.outfile || opts.file);
    	  var name = path.basename(outpath).replace(/\..*$/g, '');
    	  outpath = path.dirname(outpath);

        var outfile = path.resolve(outpath, name + '.jison');
        console.log('RAW:', raw);
        fs.writeFileSync(outfile, json2jison.convert(raw), 'utf8');
        console.log(`JISON grammar has been written to file "${outfile}"`);
    } else {
        input(function (raw) {
            console.log(json2jison.convert(raw));
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

