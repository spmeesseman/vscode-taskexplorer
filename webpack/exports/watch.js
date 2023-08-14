// @ts-check

/**
 * @file exports/watch.js
 * @version 0.0.1
 * @license MIT
 * @author Scott Meesseman @spmeesseman
 */

/** @typedef {import("../utils").WpBuildApp} WpBuildApp */


/**
 * @function target
 * @param {WpBuildApp} app Webpack build environment
 */
const watch = (app) =>
{
	app.wpc.watch = !!app.rc.args.watch || !!app.rc.args.WEBPACK_WATCH;
	if (app.rc.args.watch && app.rc.exports.watch)
	{
		app.wpc.watchOptions =
		{
			poll: true,
			stdin: true,
			followSymlinks: false,
			ignored: [
				"**/node_modules", "**/dist", "**/doc", "**/res", "**/script", "**/test",
				"**/types", "**/webpack/**/*.js", "**/.vscode", "**/.vscode-test",
				"**/.nyc_output", "**/.coverage", "**/.github"
			]
		};
	}
};


module.exports = watch;
