# xTinyPNG CLI

> Handy command line tool for shrinking PNG images using the TinyPNG API

## Installation

	npm install -g xtinypng-cli

## Preamble

To use xTinyPNG CLI, you need an API key for TinyPNG.
You can get one from [_TinyPNG's Website_](https://bit.ly/tinypng-devel).

## Usage

xTinyPNG CLI allows you to provide your API key in three different ways.
	- The more convenient method is to use environment variables `XTINYPNG_KEY`, `TINYPNG_KEY` or `TINIFY_KEY` (for compatibility with Tinify).
	- Secondly, save your API key into a file called `.xtinypng` or `.tinypng` within your home directory.
	- Lastly and none the least, provide the API key straight as a CLI argument `-k`.

	xtinypng demo.png -k E99a18c4f8cb3EL5f2l08u368_922e03

To shrink all PNG/JPEG images within the current directory, you may run one of the following commands -- both do exactly the same.

	xtinypng
	xtinypng .

To shrink all PNG/JPEG images within the current directory and subdirectoies, use the `-r` flag

	xtinypng -r

To shrink all PNG/JPEG images within a specific directory (`assets/img` in this example), you may run the following command.

	xtinypng assets/img

You may also provide multiple directories.

	xtinypng assets/img1 assets/img2

To shrink a single PNG/JPEG image (`assets/img/demo.png` in this example), you may run the following command.

	xtinypng assets/img/demo.png

You may also provide multiple single PNG/JPEG files.

	xtinypng assets/img/demo1.png assets/img/demo2.png

To resize images, use the `--width` and/or `--height` flag.

	xtinypng assets/img/demo.png --width 123
	xtinypng assets/img/demo.png --height 123
	xtinypng assets/img/demo.png --width 123 --height 123 

To use a resize method while resizing images, use the `--width` and/or `--height` flag.

	xtinypng assets/img/demo.png -W 200 -H 140 -m fit

More about resizing/resizing methods on [_TinyPNG's Website_](https://bit.ly/tinypng-ref-resizing)


Please check the help for more explanations


## Changelog

* 0.1.0
	* Multiple comments
	* Uses env variables for keys
	* Refactor help and add tinypng.com links
	* Sends DNT:1 headers with the requests
	* Sends A custom User-Agent header with the requests
	* Displays compression-count after each compressions
* 0.0.9
	* Implement resize method
* 0.0.8
	* Modded version
* 0.0.7
	* Implement support for uppercase file extensions
* 0.0.6
	* Prevent any file changes in case JSON parsing fails or any other HTTP error occurred
* 0.0.5
	* Add support for image resize functionality
* 0.0.4
  * Make recursive directory walking optional
* 0.0.3
  * Updated API endpoint
  * Check for valid JSON response
* 0.0.2
	* JP(E)G support
* 0.0.1
	* Initial version
