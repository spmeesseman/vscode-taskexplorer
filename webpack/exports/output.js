// @ts-check

const { join, resolve } = require("path");
const { apply } = require("../utils/utils");

/**
 * @file exports/output.js
 * @version 0.0.1
 * @license MIT
 * @author Scott Meesseman @spmeesseman
 */

/** @typedef {import("../utils").WpBuildApp} WpBuildApp */


/**
 * @function
 * @param {WpBuildApp} app Webpack build environment
 */
const output = (app) =>
{
	app.wpc.output =
	{
		compareBeforeEmit: true,
		hashDigestLength: 20
	};

	if (app.build === "webview")
	{
		apply(app.wpc.output,
		{
			clean: app.clean === true ? { keep: /(img|font|readme|walkthrough)[\\/]/ } : undefined,
			path: join(app.paths.build, "res"),
			publicPath: "#{webroot}/",
			filename: (pathData, _assetInfo) =>
			{
				let name = "[name]";
				if (pathData.chunk?.name) {
					name = pathData.chunk.name.replace(/[a-z]+([A-Z])/g, (substr, token) => substr.replace(token, "-" + token.toLowerCase()));
				}
				return `js/${name}.js`;
			}
		});
	}
	else if (app.build === "tests")
	{
		apply(app.wpc.output,
		{
			clean: app.clean === true ?  { keep: /(test)[\\/]/ } : undefined,
			path: app.paths.distTests,
			filename: "[name].js",
			libraryTarget: "umd",
			umdNamedDefine: true
		});
	}
	else if (app.build === "types")
	{
		apply(app.wpc.output,
		{
			clean: app.clean === true ?  { keep: /(test)[\\/]/ } : undefined,
			path: join(app.paths.build, "types", "dist"),
			filename: "[name].js",
			// libraryTarget: "umd",
    		// umdNamedDefine: true,
			libraryTarget: "commonjs2"
		});
	}
	else
	{
		apply(app.wpc.output,
		{
			clean: app.clean === true ? (app.isTests ? { keep: /(test)[\\/]/ } : true) : undefined,
			path: resolve(app.rc.paths.dist, app.build === "web" ? "web" : "."),
			filename: "[name].[contenthash].js",
			libraryTarget: "commonjs2"
		});
	}
};


module.exports = output;
