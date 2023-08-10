/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable import/no-extraneous-dependencies */
// @ts-check

/**
 * @file plugin/progress.js
 * @version 0.0.1
 * @license MIT
 * @author Scott Meesseman @spmeesseman
 */

const webpack = require("webpack");

/** @typedef {import("../utils").WpBuildApp} WpBuildApp */


/**
 * @param {WpBuildApp} app
 * @returns {webpack.ProgressPlugin | undefined}
 */
const progress = (app) =>
{
	if (app.rc.plugins.progress !== false)
	{
		return new webpack.ProgressPlugin();
	}
};


module.exports = progress;
