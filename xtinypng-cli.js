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
    '\n' +
    '  xtinypng <options> <path|filename(s)>\n' +
    '\n' +
    'Examples\n\n' +
    '\n' +
    '  xtinypng .\n' +
    '  xtinypng -r assets/img\n' +
    '  xtinypng assets/img/test.png\n' +
    '  xtinypng --width 120 assets/img/test.jpg\n' +
    '\n' +
    'Options\n' +
    '\n' +
    '  -k, --key        Provide an API key\n' +
    '  -r, --recursive  Walk given directory recursively\n' +
    '  -H, --heigh      Resize to a specified height\n' +
    '  -W, --width      Resize to a specified width\n' +
    '  -m, --method     Resize method { fit, cover, scale, thumb }\n' +
    '  -v, --version    Show installed version\n' +
    '  -h, --help       Show help\n' +
    '\n' +
    'Resizing methods\n' +
    '\n' +
    '  fit             Scales down proportionally  so that it fits  within the given\n' +
    '                  dimensions. Both width and height must be declared. The image\n' +
    '                  will not exceed either of these dimensions.\n' +
    '\n' +
    '  cover           Scales image proportionally and crops if  necessary so result\n' +
    '                  has exactly the given  dimensions. Both width and height must\n' +
    '                  be declared.Smart-crop algorithm determine the most important\n' +
    '                  areas of your image so cropping is automatic.\n' +
    '\n' +
    '  scale (default) Scales down proportionally. Either a target width OR a target\n' +
    '                  height must be declared but NOT BOTH. The image will have the\n' +
    '                  provided width OR height.\n' +
    '\n' +
    '  thumb           A more advanced implementation of cover that also detects cut\n' +
    '                  out images with  plain backgrounds.  The image scales down to\n' +
    '                  the width and height you provide. If image is detected with a\n' +
    '                  freestanding object it will add background space where needed\n' +
    '                  or crop the unimportant parts.\n'

//    '  -p, --preserve   Preserve metadata: { copyright, creation, location }\n' +
//   '\n' +
//    'Preserving metadata\n' +
//    '\n' +
//    '  all               Preserves all possible metadata.\n' +
//    '\n' +
//    '  copyright         Preserves any copyright information. This includes the EXIF\n' +
//    '                    copyright tag (JPEG), the XMP rights tag (PNG) as well as a\n' +
//    '                    Photoshop copyright  flag or URL. Uses  up to 90 additional\n' +
//    '                    bytes, plus the length of the copyright data.\n' +
//    '\n' +
//    '  creation          Preserves any creation date or time. This is the moment the\n' +
//    '                    image/photo was originally created.  This includes the EXIF\n' +
//    '                    original date time tag (JPEG)/XMP creation time (PNG). Uses\n' +
//    '                    around 70 additional bytes.\n' +
//    '\n' +
//    '  location (JPEG)   Preserves any GPS location  data describing where the photo\n' +
//    '                    was taken. This includes the EXIF GPS lat/long tags (JPEG).\n' +
//    '                    Uses around 130 additional bytes.\n'
  );

} else {

  log(chalk.underline.bold('xTinyPNG CLI'));
  log('v' + version + '\n');

  var files = argv._.length ? argv._ : ['.'];

  var key = '';
  var resize = {};
  var rcount = 0;

  if (argv.k || argv.key) {
    key = typeof(argv.k || argv.key) === 'string' ? (argv.k || argv.key).trim() : '';
  } else if (fs.existsSync(home + '/.tinypng')) {
    key = fs.readFileSync(home + '/.tinypng', 'utf8').trim();
  }

  if (argv.W || argv.width) {
    if (typeof(argv.W || argv.width) === 'number') {
      resize.width = (argv.W || argv.width);
      rcount++;
    } else {
      log(chalk.bold.red('Invalid resize width.'));
    }
  }

  if (argv.H || argv.height) {
    if (typeof(argv.H || argv.height) === 'number') {
      resize.height = (argv.H || argv.height);
      rcount++;
    } else {
      log(chalk.bold.red('Invalid resize height.'));
    }
  }

  if (argv.m || argv.method) {
    if (typeof(argv.m || argv.method) === 'string') {
      switch(argv.m || argv.method) {
        case 'fit':
          resize.method = 'fit';
          if (rcount !== 2) {
            log(chalk.bold.red('Both height (-H) AND width (-W) must be specified when using resize method ' + resize.method + '.'));
            return;
          }
          break;
        case 'cover':
          resize.method = 'cover';
          if (rcount !== 2) {
            log(chalk.bold.red('Both height (-H) AND width (-W) must be specified when using resize method ' + resize.method + '.'));
            return;
          }
          break;
        case 'scale':
          resize.method = 'scale';
          if (rcount !== 1) {
            log(chalk.bold.red('Either height (-H) OR width (-W) must be used when using resize method ' + resize.method + '.'));
            return;
          }
          break;
        case 'thumb':
          resize.method = 'thumb';
          if (rcount !== 2) {
            log(chalk.bold.red('Both height (-H) AND width (-W) must be specified when using resize method ' + resize.method + '.'));
          }
          break;
        default:
          resize.method = '';
          if (rcount <= 1) {
            log(chalk.bold.red('Either height (-H) OR width (-W) must be used when resizing.'));
          }
          break;
      }
    }
  }

  if (typeof(resize.method) !== 'undefined') {
    log(chalk.bold.red('METHOD: ' + resize.method));
  }

  if (key.length === 0) {
    log(chalk.bold.red('No API key.'));
  } else {
    log(chalk.bold.gray('API key: ' + key + '\n'));
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

      log(chalk.bold.red('\u2718 No suitable images (PNG/JPEG) found.'));

    } else {

      log(chalk.bold.green('\u2714 Processing ' + unique.length + ' image' + (unique.length === 1 ? '' : 's')) + '...\n');
      unique.forEach(function(file) {

        fs.createReadStream(file).pipe(request.post('https://api.tinify.com/shrink', {
          auth: {
            'user': 'api',
            'pass': key
          }
        }, function(error, response, body) {

          try {
            //log(chalk.gray(body + '\n'));
            //log(chalk.gray(JSON.stringify(response) + '\n'));
            body = JSON.parse(body);
          } catch (e) {
            log(chalk.bold.red('\u2718 ' + file + ' - Invalid JSON.'));
            return;
          }

          if (!error && response) {

            log(chalk.gray(JSON.stringify(response) + '\n'));

            if (response.statusCode === 201) {

              if (body.output.size < body.input.size) {

                log(chalk.green('\u2714 ' + file + ' - Shrunk ' + chalk.bold(pretty(body.input.size-body.output.size) + ' (' + Math.round(100-100/body.input.size*body.output.size)+'%)')));

                if (response.headers['compression-count'] <= 225) {
                  log(chalk.bold('\u2611') + chalk.gray(' Compression-Count: ' + response.headers['compression-count'] + '\n'));
                } else if (response.headers['compression-count'] <= 335) {
                  log(chalk.bold.yellow(chalk.bold('\u2139') + chalk.gray(' Compression-Count: ') + chalk.bold.yellow(response.headers['compression-count'] + '\n')));
                } else if (response.headers['compression-count'] <= 445) {
                  log(chalk.keyword('orange')(chalk.bold('\u2139') + chalk.gray(' Compression-Count: ') + chalk.keyword('orange')(chalk.bold(response.headers['compression-count'] + '\n'))));
                } else {
                  log(chalk.bold.red(chalk.bold('\u2139') + chalk.gray(' Compression-Count: ') + chalk.bold.red(response.headers['compression-count'] + '\n')));
                }

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
                log(chalk.green('\u2714 ' + file + ' - Maxed-Out (this is ' + chalk.bold.green('\u2714 OK') + chalk.green(')') ));
              }

            } else {

              if (body.error === 'TooManyRequests') {
                log(chalk.bold.red('\u2718 Compression failed for ' + file + ': Monthly limit exceeded.'));
              } else if (body.error === 'Unauthorized') {
                log(chalk.bold.red('\u2718 Compression failed for ' + file + ': Credentials are invalid.'));
              } else if (body.error === 'InputMissing') {
                log(chalk.bold.red('\u2718 Compression failed for ' + file + ': Input file is empty.'));
              } else if (body.error === 'Unsupported media type') {
                log(chalk.bold.red('\u2718 Compression failed for ' + file + ': Input file type is not supported.'));
              } else {
                log(chalk.bold.red('\u2718 Compression failed for ' + file + ': ' + body.message));
              }

            }
          } else {
            log(chalk.bold.red('\u2718 Got no response for ' + file));
          }
        }));

      });

    }

  }

}
