#!/usr/bin/env node
"use strict";

var fs = require('fs');
var glob = require('glob');
var chalk = require('chalk');
var uniq = require('array-uniq');
var request = require('request');
var pretty = require('prettysize');
var minimatch = require('minimatch');
var isempty = require('is-empty-file');
// If needed to output the request to curl
// require('request-to-curl');

var argv = require('minimist')(process.argv.slice(2));
var home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;

var homepage = require('./package.json').homepage;
var nicename = require('./package.json').nicename;
var shortname = require('./package.json').shortname;
var version = require('./package.json').version;

const log = console.log;

if (argv.v || argv.version) {

	log(chalk.bold(nicename) + chalk.reset(' v' + version + '\n\n' + homepage));

} else if (argv.h || argv.help || argv.manual) {

	// Show only for -h/--help toggles
	if (argv.h || argv.help) {
		log(chalk.bold.underline(nicename + ' v' + version + '\n\n' ) + chalk.bold.underline('USAGE') + '\n');
	}

	log(
		'  ' + shortname + ' <options> <path|filename(s)>' + '\n' +
		'\n' +
		chalk.bold.underline('OPTIONS') + '\n' +
		'\n' +
		'  -k,  --key          Provide an API key' + '\n' +
		'  -r,  --recursive    Walk given directory recursively' + '\n' +
		'  -H,  --heigh        Resize to a specified height' + '\n' +
		'  -W,  --width        Resize to a specified width' + '\n' +
		'  -m,  --method       Resize method { fit, cover, scale, thumb }' + '\n' +
		'  -A,  --user-agent   Send a custom User-Agent with the request' + '\n' +
		'  -v,  --version      Show installed version' + '\n' +
		'  -md, --matchdot     Match/include dotfiles as source files' + '\n' +
		'  -h,  --help         Show help' + '\n' +
		'\n' +
		chalk.bold.underline('EXAMPLES') + '\n' +
		'\n' +
		'  # Process all images in current directory' + '\n' +
		'    ' + shortname + ' .\n' +
		'  # Process all images in \'assets/img\' directory, recusively' + '\n' +
		'    ' + shortname + ' -r assets/img' + '\n' +
		'  # Process a single image' + '\n' +
		'    ' + shortname + ' assets/img/test.png' + '\n' +
		'  # Resize image to 120 width keeping proportions' + '\n' +
		'    ' + shortname + ' --width 120 assets/img/test.jpg' + '\n' +
		'  # Resize an image to 100x100 using \'thumb\' method' + '\n' +
		'    ' + shortname + ' -H 100 -W 100 --method thumb thumnail_360x360.png' + '\n' +
		'\n' +
		chalk.bold.underline('RESIZING METHODS') + '\n' +
		'\n' +
		'  fit             Scales down proportionally  so that it fits  within the given' + '\n' +
		'                  dimensions. BOTH width AND height must be declared. The image' + '\n' +
		'                  will not exceed either of these dimensions.' + '\n' +
		'\n' +
		'  cover           Scales image proportionally and crops if  necessary so result' + '\n' +
		'                  has exactly the given  dimensions. BOTH width AND height must' + '\n' +
		'                  be declared.Smart-crop algorithm determine the most important' + '\n' +
		'                  areas of your image so cropping is automatic.' + '\n' +
		'\n' +
		'  scale (default) Scales down proportionally. EITHER a target width OR a target' + '\n' +
		'                  height must be declared but NOT BOTH. The image will have the' + '\n' +
		'                  provided/requested width OR height.This is the default method' + '\n' +
		'\n' +
		'  thumb           A more advanced implementation of cover that also detects cut' + '\n' +
		'                  out images with  plain backgrounds.  The image scales down to' + '\n' +
		'                  the width and height you provide. If image is detected with a' + '\n' +
		'                  freestanding object it will add background space where needed' + '\n' +
		'                  or crop the unimportant parts.BOTH width AND height required.' + '\n' +
		'\n' +
		chalk.bold.underline('RESIZING NOTES') + '\n' +
		'\n' +
		'  If the  target dimensions are  larger than the original dimensions, the image' + '\n' +
		'  will NOT be scaled up. Scaling up is prevented to protect the images quality.' + '\n' +
		'\n' +
		'  More about resizing and resizing methods at https://bit.ly/tinypng-ref-resizing' + '\n'

		// TODO: Future function to preserve metadata
		//'  -p, --preserve   Preserve metadata: { copyright, creation, location }' + '\n' +
		//'\n' +
		//chalk.bold.underline('PRESERVING METADATA') + '\n' +
		//'\n' +
		//'  all               Preserves all possible metadata.' + '\n' +
		//'\n' +
		//'  copyright         Preserves any copyright information. This includes the EXIF' + '\n' +
		//'                    copyright tag (JPEG), the XMP rights tag (PNG) as well as a' + '\n' +
		//'                    Photoshop copyright  flag or URL. Uses  up to 90 additional' + '\n' +
		//'                    bytes, plus the length of the copyright data.' + '\n' +
		//'\n' +
		//'  creation          Preserves any creation date or time. This is the moment the' + '\n' +
		//'                    image/photo was originally created.  This includes the EXIF' + '\n' +
		//'                    original date time tag (JPEG)/XMP creation time (PNG). Uses' + '\n' +
		//'                    around 70 additional bytes.' + '\n' +
		//'\n' +
		//'  location (JPEG)   Preserves any GPS location  data describing where the photo' + '\n' +
		//'                    was taken. This includes the EXIF GPS lat/long tags (JPEG).' + '\n' +
		//'                    Uses around 130 additional bytes.' + '\n'
	);

} else {

	log(chalk.bold(nicename) + chalk.reset(' v' + version + '\n'));

	var files = argv._.length ? argv._ : ['.'];

	var key = '';
	var resize = {};
	var preserve = {};
	var rcount = 0;

/////////////////////////////////////

	// Match options for minimatch
	var matchopts = {matchBase: true, dot: false, debug: false};
//	matchopts.dot = false;
//	matchopts.debug = true;
//	matchopts.matchBase = true;

	// Define if dotfiles match
	// Added the -f/--force option but will not yet add it to help.
	// I think there is more to come for that forcible option...
	if (argv.md || argv.matchdot || argv.f || argv.force) { matchopts.dot = true; }

/////////////////////////////////////

	// If -k OR --key is defined
	if (argv.k || argv.key) {

		key = typeof(argv.k || argv.key) === 'string' ? (argv.k || argv.key).trim() : '';

	// If either file exist ~/.tinypng OR ~/.xtinypng
	} else if ( fs.existsSync(home + '/.xtinypng') || fs.existsSync(home + '/.tinypng') ) {

		key = (fs.readFileSync(home + '/.xtinypng', 'utf8') || fs.readFileSync(home + '/.tinypng', 'utf8')).trim();

	// If env variables exist TINIFY_KEY (for compat. with 'tinify' app), XTINYPNG_KEY, TINYPNG_KEY
	} else if ( process.env.TINIFY_KEY || process.env.XTINYPNG_KEY || process.env.TINYPNG_KEY ) {

		key = (process.env.TINIFY_KEY || process.env.XTINYPNG_KEY || process.env.TINYPNG_KEY).trim();
	}

	// Define resize width variable
	if (argv.W || argv.width) {
		if (typeof(argv.W || argv.width) === 'number') {
			resize.width = (argv.W || argv.width);
			// Increase counter for resize arguments
			rcount++;
		} else {
			log(chalk.bold.red('Invalid resize width.'));
		}
	}

	// Define resize height variable
	if (argv.H || argv.height) {

		if (typeof(argv.H || argv.height) === 'number') {
			resize.height = (argv.H || argv.height);
			// Increase counter for resize arguments
			rcount++;
		} else {
			log(chalk.bold.red('Invalid resize height.'));
		}
	}


	// Define resize method variable
	if (argv.m || argv.method) {

		if (typeof(argv.m || argv.method) === 'string') {

			// Select case resizing method
			switch(argv.m || argv.method) {

				case 'fit':

					resize.method = 'fit';
					if (rcount !== 2) {
						log(chalk.bold.red('Both height (-H/--height) AND width (-W/--width) values must be specified when using resize method ' + resize.method + '.'));
						return;
					}

					break;

				case 'cover':

					resize.method = 'cover';
					if (rcount !== 2) {
						log(chalk.bold.red('Both height (-H/--height) AND width (-W/--width) values must be specified when using resize method ' + resize.method + '.'));
						return;
					}

					break;

				case 'scale':

					resize.method = 'scale';
					if (rcount !== 1) {
						log(chalk.bold.red('Either a height (-H/--height) OR width (-W/--width) value must be used when using resize method ' + resize.method + '.'));
						return;
					}

					break;

				case 'thumb':

					resize.method = 'thumb';
					if (rcount !== 2) {
						log(chalk.bold.red('Both height (-H/--height) AND width (-W/--width) values must be specified when using resize method ' + resize.method + '.'));
						return;
					}

					break;
				default:

					resize.method = '';
					if (rcount < 1) {
						log(chalk.bold.red('Either a height (-H/--height) OR width (-W/--width) value must be used when resizing.'));
						return;
					}

					break;
			}
		}
	}

	// Define user-agent variable
	var useragent = 'Mozilla/5.0 (X11; Linux x86_64; rv:69.0) Gecko/20100101 Firefox/69.0';
	if (argv.A || argv['user-agent']) {
		if (typeof(argv.A || argv['user-agent']) === 'string') {
			useragent = ((argv.A || argv['user-agent']).replace(/\"|\'/g, '')).trim();
		}
	}

	// log(chalk.bold.yellow('User-Agent: ' + useragent));

	// Check for API key lenght
	if (key.length === 0) {

		// No api key...
		log(chalk.bold.red('No API key.'));

	// If key isnt 32 characters long
	} else if (key.length != 32) {

		// Wrong api key lenght (should be 32 chars)
		log(chalk.bold.red('Invalid API key lenght (must be 32 characters).'));

	// Found api key
	} else {

		// Show api key
		log(chalk.bold.gray.dim('API key: ' + chalk.gray.reset(key) + '\n'));

		var images = [];

		files.forEach(function(file) {

			if (fs.existsSync(file)) {

				if (fs.lstatSync(file).isDirectory()) {

					images = images.concat(glob.sync(file + (argv.r || argv.recursive ? '/**' : '') + '/*.+(png|jpg|jpeg|PNG|JPG|JPEG)'));

				} else if (minimatch(file, '*.+(png|jpg|jpeg|PNG|JPG|JPEG)', matchopts )) {
					// Check if file is empty/null before sending
					if (isempty(file, true)) {
						log(chalk.bold.red.dim('\u2718 File ' + file + ' is empty (0 bytes), skipping...'));
					} else {
						images.push(file);
					}
				}
			}
		});

		var unique = uniq(images);

		if (unique.length === 0) {

			log(chalk.bold.red('\u2718 No suitable images (PNG/JPEG) found.'));

		} else {

			log(chalk.bold.green('\u2714 Processing ' + unique.length + ' image' + (unique.length === 1 ? '' : 's')) + '...\n');

			unique.forEach(function(file) {

				fs.createReadStream(file).pipe(request.post({

						url: 'https://api.tinify.com/shrink',

						auth: {
							'user': 'api',
							'pass': key
						},

						headers: {
							'DNT': 1,
							'User-Agent': useragent
						}

				}, function(error, response, body) {

					//
					// WATCHOUT!!! LOTS of data as it will output ALL your image data
					// log(response.request.req.toCurl());

					try {
						body = JSON.parse(body);
					} catch (e) {
						log(chalk.bold.red('\u2718 ' + file + ' - Invalid JSON.'));
						return;
					}

					if (!error && response) {

						log(chalk.gray.dim(JSON.stringify(response) + '\n'));

						if (response.statusCode === 201) {

							if (body.output.size < body.input.size) {

								log(chalk.green('\u2714 ' + file + ' - Shrunk ' + chalk.bold(pretty(body.input.size-body.output.size) + ' (' + Math.round(100-100/body.input.size*body.output.size)+'%)')));

								// if compression-count is returned, output it using variable
								// text color depending on amount of conversions already done
								//
								//	- <= 250 - GREEN  -> SAFE
								//	- <= 300 - YELLOW -> NOTICE
								//	- <= 400 - ORANGE -> WARNING
								//	-  > 401 - RED    -> CAUTION
								//
								// IDEA: maybe some sort of htop-like meter ?
								//
								if (typeof(response.headers['compression-count']) != 'undefined') {

									if (response.headers['compression-count'] <= 250) {

										// GREEN (SAFE)
										log(chalk.bold.green('\u2139') + chalk.gray(' Compression-Count -> ') + chalk.bold.green(response.headers['compression-count']) + '\n');

									} else if (response.headers['compression-count'] <= 300) {

										// YELLOW (NOTICE)
										log(chalk.bold.yellow('\u2139') + chalk.gray(' Compression-Count -> ') + chalk.bold.yellow(response.headers['compression-count']) + '\n');

									} else if (response.headers['compression-count'] <= 400) {

										// ORANGE (WARNING)
										log(chalk.keyword('orange').bold('\u2139') + chalk.gray(' Compression-Count -> ') + chalk.keyword('orange').bold(response.headers['compression-count']) + '\n');

									} else {

										// RED (CAUTION)
										log(chalk.bold.red('\u2139') + chalk.gray(' Compression-Count -> ') + chalk.bold.red(response.headers['compression-count']) + '\n');

									}
								}

								// If width or height is defined, pass to request else.. dont.
								if (resize.hasOwnProperty('height') || resize.hasOwnProperty('width')) {

									request.get(body.output.url, {

										auth: {
											'user': 'api',
											'pass': key
										},

										headers: {
											'DNT': 1,
											'User-Agent': useragent
										},

										json: {
											'resize': resize,
										}

									}).pipe(fs.createWriteStream(file));

								} else {
									request.get(body.output.url).pipe(fs.createWriteStream(file));
								}

							} else {
								// Image cannot be minified anymore
								log(chalk.yellow.dim('\u2714 ' + file + ' - Maxed-Out (this is ' + chalk.bold.green('\u2714 OK') + chalk.reset.yellow.dim(')') ));
							}

						// Error management
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

					// No response error
					} else {
						log(chalk.bold.red('\u2718 Got no response for ' + file));
					}
				}));
			});
		}
	}
}
