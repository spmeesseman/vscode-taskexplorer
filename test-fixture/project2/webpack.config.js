//@ts-check

// const fs = require("fs");
const path = require("path");
// const ShebangPlugin = require("webpack-shebang-plugin");
// const CopyWebpackPlugin = require("copy-webpack-plugin");
const { renameSync } = require("fs");
// const FilterWarningsPlugin = require("webpack-filter-warnings-plugin");
// const TerserPlugin = require("terser-webpack-plugin");
// const nodeExternals = require("webpack-node-externals");
// const { IgnorePlugin } = require("webpack");

/**
 * @typedef {Object} WebpackBuildEnv
 * @property {Boolean} clean If set,will clean the output directory before build
 * @property {String} environment The environment to compile for, one of `prod`, `dev`,
 * or `test`.  Note this is not the same as webpack `mode`.
 */
/** @typedef {import("webpack").Configuration} WebpackConfig */
/** @typedef {*} PluginInstance */


/**
 * Webpack Export
 *
 * @param {WebpackBuildEnv} env Environment variable containing runtime options passed
 * to webpack on the command line (e.g. `webpack --env environment=test --env clean=true`).
 * @returns {WebpackConfig}
 */
module.exports = (env) =>
{
	if (!env) {                      // Default Webpack build environment
		env = { clean: false, environment: "test" };
	}

	/**@type {WebpackConfig}*/
	const wpConfig = {               // Base Webpack configuration object
		target: "node",
		mode: env.environment !== "dev" && env.environment !== "test" ? "production" : "development",
		resolve:
		{   //
			// support reading TypeScript and JavaScript files, -> https://github.com/TypeStrong/ts-loader
			//
			extensions: ['.ts', '.js']
		}
	};

	return wpConfig;
};
