# xTinyPNG CLI

> Handy command-line (CLI) tool for shrinking PNG/JPEG images using the [_TinyPNG_](https://bit.ly/tinypng-web) API

## Installation

To get the last published version, install via [npmjs](https://www.npmjs.com)

	npm install -g xtinypng-cli

To install the latest code, in the event that the [current repository](https://github.com/mathieu-aubin/xtinypng-cli) is ahead of the published version

	npm install -g mathieu-aubin/xtinypng-cli

## Requirements
To use xTinyPNG CLI, a key for the [_TinyPNG_](https://bit.ly/tinypng-web) API is required.Getting one is simple and quick, from [_TinyPNG_'s website](https://bit.ly/tinypng-devel).

## Usage
xTinyPNG CLI supports the following three (3) different methods of passing your API key

#### Environment variables

The most convenient method, according to me, is to use environment variables.
	- XTINYPNG_KEY
	- TINYPNG_KEY
	- TINIFY_KEY (for compatibility with [_Tinify_](https://www.npmjs.com/package/tinify))

#### RC-type File
Save your API key into a file, _within your *$HOME* directory_, named either
	- `.xtinypng`
	- `.tinypng`

#### CLI Argument
Useful for scripting/automation purposes, provide the API key as a CLI argument with `-k/--key` flags

	xtinypng -k E99a18c4f8cb3EL5f2l08u368_922e03 demo.png

## Examples #### (limited see help)
To shrink *all* PNG/JPEG images within the current directory, you may run one of the following commands -- they do exactly the same.

	xtinypng
	xtinypng .

To shrink all PNG/JPEG images within the current directory, recursively, use the `-r/--recursive` flags

	xtinypng . -r
	xtinypng -r /somefolder/images

To shrink all PNG/JPEG images within a specific directory (`assets/img` in this case), you may run the following

	xtinypng assets/img

You may also provide multiple directories.

	xtinypng ./assets/img1/* assets/img2

To shrink a single PNG/JPEG image (`assets/img/demo.png` in this example), you may run the following command.

	xtinypng assets/img/demo.png

You may also provide multiple single files

	xtinypng assets/img/demo1.png ./assets/img/demo2.png

To resize images, use the `--width` and/or `--height` flags. Short versions of those also exist as `-H` and `-W`

	xtinypng assets/img/demo.png --width 123
	xtinypng assets/img/demo.png --height 123
	xtinypng -W 123 --height 123 filename.jpg

A resize method is also available when resizing with `--method` or `-m`.
Depending on the method _WhichYouWish_ to perform, a different combination of either height/width will be required.

	xtinypng --height 640 -m scale filename.png
	xtinypng assets/img/demo.png -W 200 -H 140 -m fit

More about resizing and the available methods using `--help` or by visiting [_TinyPNG's_](https://bit.ly/tinypng-ref-resizing) website

## Other informations
Please check the help `--help` for more informations and examples


## Changelog

* 0.1.0
	* Multiple comments
	* Uses env variables for keys (3)
	* Refactor help and add tinypng.com links
	* Sends DNT:1 headers with the requests
	* Sends A custom User-Agent header with the requests (-A/--user-agent)
	* Displays compression-count after each compressions
	* Allows to take full control over resizing with the API resizing methods options
	* Shows alot more informations on the command-line
	* Better error management (i guess)
	* Prevent empty files from being processed
	* Allows for dotfiles to match as source files (-M, --matchdots)

	* **Replaces /usr/bin/tinypng if already installed**
* 0.0.9
	* Implement resizing methods
	* More code tinkering
* 0.0.8
	* Some visual changes and code tinkering
* 0.0.7
	Fork of [original source code](https://github.com/websperts/tinypng-cli)