#!/usr/bin/env node

var fs = require('fs');
var request = require('request');
var minimatch = require('minimatch');
var glob = require('glob');
var uniq = require('array-uniq');
var chalk = require('chalk');
var pretty = require('prettysize');

var argv = require('minimist')(process.argv.slice(2));
var home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
var version = require('./package.json').version;
const log = console.log;

if (argv.v || argv.version) {

  log(version);

} else if (argv.h || argv.help) {

  log(
    'Usage\n' +
    '  tinypng <path>\n' +
    '\n' +
    'Example\n' +
    '  tinypng .\n' +
    '  tinypng assets/img\n' +
    '  tinypng assets/img/test.png\n' +
    '  tinypng assets/img/test.jpg\n' +
    '\n' +
    'Options\n' +
    '  -k, --key        Provide an API key\n' +
    '  -r, --recursive  Walk given directory recursively\n' +
    '  -w, --width      Resize an image to a specified width\n' +
    '  -h, --height     Resize an image to a specified height\n' +
    '  -v, --version    Show installed version\n' +
    '  -h, --help       Show help'
  );

} else {

  log(chalk.underline.bold('TinyPNG CLI'));
  log('v' + version + '\n');

  var files = argv._.length ? argv._ : ['.'];

  var key = '';
  var resize = {};

  if (argv.k || argv.key) {
    key = typeof(argv.k || argv.key) === 'string' ? (argv.k || argv.key).trim() : '';
  } else if (fs.existsSync(home + '/.tinypng')) {
    key = fs.readFileSync(home + '/.tinypng', 'utf8').trim();
  }

  if (argv.w || argv.width) {
    if (typeof(argv.w || argv.width) === 'number') {
      resize.width = (argv.w || argv.width);
    } else {
      log(chalk.bold.red('Invalid width.'));
    }
  }

  if (argv.h || argv.height) {
    if (typeof(argv.h || argv.height) === 'number') {
      resize.height = (argv.h || argv.height);
    } else {
      log(chalk.bold.red('Invalid height.'));
    }
  }

  if (key.length === 0) {
    log(chalk.bold.red('No API key.'));
  } else {
    log(chalk.bold.gray('API key: ' + key));
    var images = [];

    files.forEach(function(file) {
      if (fs.existsSync(file)) {
        if (fs.lstatSync(file).isDirectory()) {
          images = images.concat(glob.sync(file + (argv.r || argv.recursive ? '/**' : '') + '/*.+(png|jpg|jpeg|PNG|JPG|JPEG)'));
        } else if (minimatch(file, '*.+(png|jpg|jpeg|PNG|JPG|JPEG)', {
            matchBase: true
          })) {
          images.push(file);
        }
      }
    });

    var unique = uniq(images);

    if (unique.length === 0) {

      log(chalk.bold.red('\u2718 No PNG/JPEG found.'));

    } else {

      log(chalk.bold.green('\u2714 Processing ' + unique.length + ' image' + (unique.length === 1 ? '' : 's')) + '...\n');
      //log(chalk.bold('Processing...'));

      unique.forEach(function(file) {

        fs.createReadStream(file).pipe(request.post('https://api.tinify.com/shrink', {
          auth: {
            'user': 'api',
            'pass': key
          }
        }, function(error, response, body) {

          try {
            log(chalk.gray(body + '\n'));
            body = JSON.parse(body);
          } catch (e) {
            log(chalk.bold.red('\u2718 ' +file+ ' - Invalid JSON.'));
            return;
          }

          if (!error && response) {
            log(chalk.gray(response + '\n'));

            if (response.statusCode === 201) {

              if (body.output.size < body.input.size) {

                log(chalk.bold.green('\u2714 ' +file+ ' - Shrunk ' + chalk.bold(pretty(body.input.size-body.output.size) + ' (' + Math.round(100-100/body.input.size*body.output.size)+'%)')));

                if (resize.hasOwnProperty('height') || resize.hasOwnProperty('width')) {

                  request.get(body.output.url, {
                    auth: {
                      'user': 'api',
                      'pass': key
                    },
                    json: {
                      'resize': resize
                    }
                  }).pipe(fs.createWriteStream(file));
                } else {
                  request.get(body.output.url).pipe(fs.createWriteStream(file));
                }
              } else {
                log(chalk.bold.yellow('\u2718 ' +file+ ' - Maxed out (this is \u2714)'));
              }

            } else {

              if (body.error === 'TooManyRequests') {
                log(chalk.bold.red('\u2718 Compression failed for `' + file + '` as your monthly limit has been exceeded'));
              } else if (body.error === 'Unauthorized') {
                log(chalk.bold.red('\u2718 Compression failed for `' + file + '` as your credentials are invalid'));
              } else {
                log(chalk.red('\u2718 Compression failed for `' + file + '`'));
              }

            }
          } else {
            log(chalk.red('\u2718 Got no response for `' + file + '`'));
          }
        }));

      });

    }

  }

}
