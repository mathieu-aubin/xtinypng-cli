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

	// Show program infos, version, homepage...
	log(chalk.bold(nicename) + chalk.reset(' v' + version + '\n\n' + homepage));

} else if (argv.h || argv.help || argv.manual) {

	// Show only for -h/--help toggles, not for --manual
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
		'  -md, --matchdot     Include dot/hidden files as input' + '\n' +
		'  -h,  --help         Show help' + '\n' +
		'\n' +
		chalk.bold.underline('PASSING YOUR API KEY') + '\n' +
		'\n' +
		'  This can be done a few different ways, including:' + '\n' +
		'	- Using either -k or --key command-line options' + '\n' +
		'	- Using dotfiles ~/.xtinypng or ~/.tinypng' + '\n' +
		'	- Using env. variables XTINYPNG_KEY, TINYPNG_KEY, TINYFY_KEY' + '\n' +
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

	// Show program infos
	log(chalk.bold(nicename) + chalk.reset(' v' + version + '\n'));

	// Init some variables
	var key = '';
	var resize = {};
	var preserve = {};
	var rcount = 0;

	// Set the files to be processed from input args or, by default, set to $PWD
	var files = argv._.length ? argv._ : ['.'];

/////////////////////////////////////

	// Match options for minimatch
	//	matchopts.dot = false;
	//	matchopts.debug = true;
	//	matchopts.matchBase = true;
	var matchopts = {
		matchBase: true,
		dot: false,
		debug: false
	};

	// Define if dot/hidden files match
	if (argv.md || argv.matchdot) {
		matchopts.dot = true;
	}

	// Added the -f/--force option
	// TODO: Add it to help when relevant/more options to force
	// There might be to add when using the FORCE option.
	if (argv.f || argv.force) {
		matchopts.dot = true;
	}

/////////////////////////////////////

	// Key input-check priority is as follow:
	//	1- Command-line -k
	//	2- Command-line --key
	//	3- $HOME/.xtinypng
	//	4- $HOME/.tinypng
	//	5- ENV variable XTINYPNG_KEY
	//	6- ENV variable TINYPNG_KEY
	//	7- ENV variable TINYFY_KEY

	// If -k is defined
	if (argv.k) {

		key = typeof(argv.k) === 'string' ? (argv.k).trim() : '';

	// If --key is defined
	} else if (argv.key) {

		key = typeof(argv.key) === 'string' ? (argv.key).trim() : '';

	// If file exist ~/.xtinypng
	} else if (fs.existsSync(home + '/.xtinypng')) {

		key = typeof(fs.readFileSync(home + '/.xtinypng', 'utf8')) === 'string' ? (fs.readFileSync(home + '/.xtinypng', 'utf8')).trim() : '';

	// If file exist ~/.tinypng
	} else if (fs.existsSync(home + '/.tinypng')) {

		key = typeof(fs.readFileSync(home + '/.tinypng', 'utf8')) === 'string' ? (fs.readFileSync(home + '/.tinypng', 'utf8')).trim() : '';
		//key = (fs.readFileSync(home + '/.tinypng', 'utf8')).trim();

	// If ENV variable XTINYPNG_KEY exist
	} else if (process.env.XTINYPNG_KEY || process.env.TINYPNG_KEY || process.env.TINYFY_KEY) {

		if (process.env.XTINYPNG_KEY) {
			key = typeof(process.env.XTINYPNG_KEY) === 'string' ? (process.env.XTINYPNG_KEY).trim() : '';
		// If ENV variable TINYPNG_KEY exist
		} else if (process.env.TINYPNG_KEY) {
			key = typeof(process.env.TINYPNG_KEY) === 'string' ? (process.env.TINYPNG_KEY).trim() : '';
		// If ENV variable TINYFY_KEY exist
		} else if (process.env.TINYFY_KEY) {
			key = typeof(process.env.TINYFY_KEY) === 'string' ? (process.env.TINYFY_KEY).trim() : '';
		}
	}

	// Define resize WIDTH variable
	if (argv.W || argv.width) {
		if (typeof(argv.W || argv.width) === 'number') {
			resize.width = (argv.W || argv.width);
			// Increase counter for resize arguments
			rcount++;
		} else {
			log(chalk.bold.red('Invalid resize WIDTH.'));
		}
	}

	// Define resize height variable
	if (argv.H || argv.height) {

		if (typeof(argv.H || argv.height) === 'number') {
			resize.height = (argv.H || argv.height);
			// Increase counter for resize arguments
			rcount++;
		} else {
			log(chalk.bold.red('Invalid resize HEIGHT.'));
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
						log(chalk.bold.red('Both HEIGHT (-H/--height) and WIDTH (-W/--width) values must be specified when using resize method ' + resize.method + '.'));
						return;
					}

					break;

				case 'cover':

					resize.method = 'cover';
					if (rcount !== 2) {
						log(chalk.bold.red('Both HEIGHT (-H/--height) and WIDTH (-W/--width) values must be specified when using resize method ' + resize.method + '.'));
						return;
					}

					break;

				case 'scale':

					resize.method = 'scale';
					if (rcount !== 1) {
						log(chalk.bold.red('Either a HEIGHT (-H/--height) or WIDTH (-W/--width) value must be used when using resize method ' + resize.method + '.'));
						return;
					}

					break;

				case 'thumb':

					resize.method = 'thumb';
					if (rcount !== 2) {
						log(chalk.bold.red('Both HEIGHT (-H/--height) and WIDTH (-W/--width) values must be specified when using resize method ' + resize.method + '.'));
						return;
					}

					break;
				default:

					resize.method = '';
					if (rcount < 1) {
						log(chalk.bold.red('Either a HEIGHT (-H/--height) or WIDTH (-W/--width) value must be specified when resizing.'));
						return;
					}

					break;
			}
		}
	}

	// Check if a User-Agent has been defined on command-line
	if (argv.A || argv['user-agent']) {

		if (typeof(argv.A) === 'string') {
			useragent = ((argv.A).replace(/\"|\'/g, '')).trim();
		} else if (typeof(argv['user-agent']) === 'string') {
			useragent = ((argv['user-agent']).replace(/\"|\'/g, '')).trim();
		}

	} else {

	// Define User-Agent variable (latest Firefox as of 2020/05/26)
	var useragent = 'Mozilla/5.0 (X11; Linux x86_64; rv:76.0) Gecko/20100101 Firefox/76.0';

	}

	// log(chalk.bold.yellow('User-Agent: ' + useragent));

	// Check for API key lenght
	if (key.length === 0) {

		// No API key...
		log(chalk.bold.red('No API key.'));

	// If key isnt 32 characters long
	} else if (key.length != 32) {

		// Wrong api key lenght (should be 32 chars)
		log(chalk.bold.red('Invalid API key lenght.'));

	// Found api key
	} else {

		// Show api key
		log(chalk.bold.gray.dim('API key: ' + chalk.gray.reset(key) + '\n'));

		var images = [];

		files.forEach(function(file) {

			if (fs.existsSync(file)) {

				if (fs.lstatSync(file).isDirectory()) {

					images = images.concat(glob.sync(file + (argv.r || argv.recursive ? '/**' : '') + '/*.+(png|jpg|jpeg|PNG|JPG|JPEG)'));

				} else if (minimatch(file, '*.+(png|jpg|jpeg|PNG|JPG|JPEG)', matchopts)) {

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

					// !!! WATCHOUT !!!
					// 	This will output your image data (LOTS OF DATA)
					// 	log(response.request.req.toCurl());
					// !!! WATCHOUT !!!

					try {
						body = JSON.parse(body);
					} catch (e) {
						log(chalk.bold.red('\u2718 ' + file + ' - Invalid JSON.'));
						return;
					}

					if (!error && response) {

						log(chalk.gray.dim(JSON.stringify(response) + '\n'));

						// Status code 201, should be all good
						if (response.statusCode === 201) {

							if (body.output.size < body.input.size) {

								log(chalk.green('\u2714 ' + file + ' - Shrunk ' + chalk.bold(pretty(body.input.size-body.output.size) + ' (' + Math.round(100-100/body.input.size*body.output.size)+'%)')));

								// If compression-count is returned, output it using variable
								// text color depending on amount of conversions already done
								//
								//	<= 325 - GREEN  -> SAFE
								//	<= 375 - YELLOW -> NOTICE
								//	<= 425 - ORANGE -> WARNING
								//	>= 426 - RED    -> CAUTION
								//
								// IDEA: maybe some sort of HTOP-like meter?
								//
								if (typeof(response.headers['compression-count']) != 'undefined') {

									if (response.headers['compression-count'] <= 325) {
										// GREEN (SAFE)
										log(chalk.bold.green('\u2139') + chalk.gray(' Compression-Count -> ') + chalk.bold.green(response.headers['compression-count']) + '\n');

									} else if (response.headers['compression-count'] <= 375) {
										// YELLOW (NOTICE)
										log(chalk.bold.yellow('\u2139') + chalk.gray(' Compression-Count -> ') + chalk.bold.yellow(response.headers['compression-count']) + '\n');

									} else if (response.headers['compression-count'] <= 425) {
										// ORANGE (WARNING)
										log(chalk.keyword('orange').bold('\u2139') + chalk.gray(' Compression-Count -> ') + chalk.keyword('orange').bold(response.headers['compression-count']) + '\n');

									} else {
										// RED (CAUTION)
										log(chalk.bold.red('\u2139') + chalk.gray(' Compression-Count -> ') + chalk.bold.red(response.headers['compression-count']) + '\n');

									}
								}

								// If either HEIGHT or WIDTH are defined, pass to request
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
											'resize': resize
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
