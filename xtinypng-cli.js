#!/usr/bin/env node

var fs = require('fs');
var request = require('request');
var minimatch = require('minimatch');
var glob = require('glob');
var uniq = require('array-uniq');
var chalk = require('chalk');
var pretty = require('prettysize');

// If needed to output the request to curl
// require('request-to-curl');

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
		'   tinypng <options> <path|filename(s)>\n' +
		'  xtinypng <options> <path|filename(s)>\n' +
		'\n' +
		'Examples\n' +
		'\n' +
		'  # Process all images in current directory\n' +
		'    xtinypng .\n' +
		'  # Process all images in \'assets/img\' directory, recusively\n' +
		'    xtinypng -r assets/img\n' +
		'  # Process a single image\n' +
		'    xtinypng assets/img/test.png\n' +
		'  # Resize image to 120 width keeping proportions\n' +
		'    xtinypng --width 120 assets/img/test.jpg\n' +
		'  # Resize an image to 100x100 using \'thumb\' method\n' +
		'    xtinypng -H 100 -W 100 --method thumb thumnail_360x360.png\n' +
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
		'Resizing Methods\n' +
		'\n' +
		'  fit             Scales down proportionally  so that it fits  within the given\n' +
		'                  dimensions. BOTH width AND height must be declared. The image\n' +
		'                  will not exceed either of these dimensions.\n' +
		'\n' +
		'  cover           Scales image proportionally and crops if  necessary so result\n' +
		'                  has exactly the given  dimensions. BOTH width AND height must\n' +
		'                  be declared.Smart-crop algorithm determine the most important\n' +
		'                  areas of your image so cropping is automatic.\n' +
		'\n' +
		'  scale (default) Scales down proportionally. EITHER a target width OR a target\n' +
		'                  height must be declared but NOT BOTH. The image will have the\n' +
		'                  provided/requested width OR height.This is the default method\n' +
		'\n' +
		'  thumb           A more advanced implementation of cover that also detects cut\n' +
		'                  out images with  plain backgrounds.  The image scales down to\n' +
		'                  the width and height you provide. If image is detected with a\n' +
		'                  freestanding object it will add background space where needed\n' +
		'                  or crop the unimportant parts.BOTH width AND height required.\n' +
		'\n' +
		'Resizing Note\n' +
		'\n' +
		'  If the  target dimensions are  larger than the original dimensions, the image\n' +
		'  will NOT be scaled up. Scaling up is prevented to protect the images quality.\n' +
		'\n' +
		'  More about resizing/resizing methods at https://bit.ly/tinypng-ref-resizing\n'

		// TODO: Future function to preserve metadata
		//'  -p, --preserve   Preserve metadata: { copyright, creation, location }\n' +
		//'\n' +
		//'Preserving metadata\n' +
		//'\n' +
		//'  all               Preserves all possible metadata.\n' +
		//'\n' +
		//'  copyright         Preserves any copyright information. This includes the EXIF\n' +
		//'                    copyright tag (JPEG), the XMP rights tag (PNG) as well as a\n' +
		//'                    Photoshop copyright  flag or URL. Uses  up to 90 additional\n' +
		//'                    bytes, plus the length of the copyright data.\n' +
		//'\n' +
		//'  creation          Preserves any creation date or time. This is the moment the\n' +
		//'                    image/photo was originally created.  This includes the EXIF\n' +
		//'                    original date time tag (JPEG)/XMP creation time (PNG). Uses\n' +
		//'                    around 70 additional bytes.\n' +
		//'\n' +
		//'  location (JPEG)   Preserves any GPS location  data describing where the photo\n' +
		//'                    was taken. This includes the EXIF GPS lat/long tags (JPEG).\n' +
		//'                    Uses around 130 additional bytes.\n'
	);

} else {

	log(chalk.underline.bold('xTinyPNG CLI'));
	log('v' + version + '\n');

	var files = argv._.length ? argv._ : ['.'];

	var key = '';
	var resize = {};
	var preserve = {};
	var rcount = 0;

	// If -k OR --key is defined
	if (argv.k || argv.key) {

		key = typeof(argv.k || argv.key) === 'string' ? (argv.k || argv.key).trim() : '';

	// If either file exist ~/.tinypng OR ~/.xtinypng
	} else if ( fs.existsSync(home + '/.tinypng') || fs.existsSync(home + '/.xtinypng') ) {

		key = fs.readFileSync(home + '/.tinypng', 'utf8').trim() || fs.readFileSync(home + '/.xtinypng', 'utf8').trim();

	// If env variables exist TINIFY_KEY (for compat. with 'tinify' app), XTINYPNG_KEY, TINYPNG_KEY
	} else if ( process.env.TINIFY_KEY || process.env.XTINYPNG_KEY || process.env.TINYPNG_KEY ) {

		key = process.env.TINIFY_KEY || process.env.XTINYPNG_KEY || process.env.TINYPNG_KEY;
	}

	// Define resize width variable
	if (argv.W || argv.width) {

		if (typeof(argv.W || argv.width) === 'number') {

			resize.width = (argv.W || argv.width);
			rcount++;

		} else {

			log(chalk.bold.red('Invalid resize width.'));

		}
	}

	// Define resize height variable
	if (argv.H || argv.height) {

		if (typeof(argv.H || argv.height) === 'number') {

			resize.height = (argv.H || argv.height);
			rcount++;

		} else {

			log(chalk.bold.red('Invalid resize height.'));

		}
	}

	// Define resize method variable
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

	// Echo the method used
	//if (typeof(resize.method) !== 'undefined') {
	//	log(chalk.bold.red('\nMETHOD: ' + resize.method + '\n'));
	//}

	// Check for API key lenght
	if (key.length === 0) {

		// No api key...
		log(chalk.bold.red('No API key.'));

	// Found api key
	} else {
		// Show api key
		log(chalk.bold.gray.dim('API key: ' + key + '\n'));

		var images = [];

		files.forEach(function(file) {

			if (fs.existsSync(file)) {

				if (fs.lstatSync(file).isDirectory()) {

					images = images.concat(glob.sync(file + (argv.r || argv.recursive ? '/**' : '') + '/*.+(png|jpg|jpeg|PNG|JPG|JPEG)'));

				} else if (minimatch(file, '*.+(png|jpg|jpeg|PNG|JPG|JPEG)', {matchBase: true})) {
					images.push(file);
				}
			}
		});

		var unique = uniq(images);

		if (unique.length === 0) {

			log(chalk.bold.red('\u2718 No suitable images (PNG/JPEG) found.'));

		} else {

			log(chalk.bold.green('\u2714 Processing ' + unique.length + ' image' + (unique.length === 1 ? '' : 's')) + '...\n');

			//request.post.defaults({
			//		headers: {
			//			'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:69.0) Gecko/20100101 Firefox/69.0',
			//			'DNT': 1
			//		}
			//});

			unique.forEach(function(file) {

				//fs.createReadStream(file).pipe(request.post('https://api.tinify.com/shrink', {
				//	auth: { 'user': 'api', 'pass': key },
				//	headers: { DNT: 1, 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:69.0) Gecko/20100101 Firefox/69.0' }
				//}, function(error, response, body) {

				fs.createReadStream(file).pipe(request.post({

						url: 'https://api.tinify.com/shrink',

						auth: {
							'user': 'api',
							'pass': key
						},

						headers: {
							'DNT': 1,
							'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:69.0) Gecko/20100101 Firefox/69.0'
						}

				}, function(error, response, body) {

					//
					// MUST include/require "request-to-curl" and...
					// WATCHOUT!!! LOTS of data as it will output ALL your image data
					//
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
											'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:69.0) Gecko/20100101 Firefox/69.0'
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
