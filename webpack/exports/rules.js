/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable import/no-extraneous-dependencies */
// @ts-check

/**
 * @file exports/rules.js
 * @version 0.0.1
 * @license MIT
 * @author Scott Meesseman @spmeesseman
 */

/** @typedef {import("../types").WpBuildApp} WpBuildApp */

const path = require("path");
const esbuild = require("esbuild");
const { getTsConfig } = require("../utils");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");


/**
 * @function
 * @param {WpBuildApp} app Webpack build environment
 */
const rules = (app) =>
{
	app.wpc.module = {};
	app.wpc.module.rules = [];

	if (app.build === "webview")
	{
		app.wpc.module.rules.push(...[
		{
			test: /\.m?js/,
			resolve: { fullySpecified: false },
		},
		{
			exclude: /\.d\.ts$/,
			include: path.join(app.paths.build, "src"),
			test: /\.tsx?$/,
			use: [ app.esbuild ?
			{
				loader: "esbuild-loader",
				options: {
					implementation: esbuild,
					loader: "tsx",
					target: "es2020",
					tsconfigRaw: getTsConfig(app, path.join(app.paths.base, "tsconfig.json")),
				},
			} : {
				loader: "ts-loader",
				options: {
					configFile: path.join(app.paths.base, "tsconfig.json"),
					// experimentalWatchApi: true,
					transpileOnly: true,
				},
			} ]
		},
		{
			test: /\.s?css$/,
			exclude: /node_modules/,
			use: [
			{
				loader: MiniCssExtractPlugin.loader,
			},
			{
				loader: "css-loader",
				options: {
					sourceMap: app.wpc.mode !== "production",
					url: false,
				},
			},
			{
				loader: "sass-loader",
				options: {
					sourceMap: app.wpc.mode !== "production",
				},
			}]
		}]);
	}
	else if (app.build === "tests")
	{
		const testsRoot = path.join(app.paths.build, "src", "test");
		app.wpc.module.rules.push(...[
		{
			test: /index\.js$/,
			include: path.join(app.paths.build, "node_modules", "nyc"),
			loader: "string-replace-loader",
			options: {
				search: "selfCoverageHelper = require('../self-coverage-helper')",
				replace: "selfCoverageHelper = { onExit () {} }"
			}
		},
		{
			test: /\.ts$/,
			include: testsRoot,
			exclude: [
				/node_modules/, /types[\\/]/, /\.d\.ts$/
			],
			use: {
				loader: "babel-loader",
				options: {
					presets: [
						[ "@babel/preset-env", { targets: "defaults" }],
						[ "@babel/preset-typescript" ],
					]
				}
			}
		}]);
	}
	else if (app.build === "types")
	{
		app.wpc.module.rules.push({
			test: /\.ts$/,
			include: path.join(app.paths.build),
			exclude: [
				/node_modules/, /test[\\/]/, /\.d\.ts$/
			],
			use: [ app.esbuild ?
			{
				loader: "esbuild-loader",
				options: {
					implementation: esbuild,
					loader: "tsx",
					target: [ "es2020", "chrome91", "node16.20" ],
					tsconfigRaw: getTsConfig(
						app, path.join(app.paths.build, "types", "tsconfig.json"),
					)
				}
			} :
			{
				loader: "ts-loader",
				options: {
					configFile: path.join(app.paths.build, "types", "tsconfig.json"),
					// experimentalWatchApi: true,
					transpileOnly: true
				}
			} ]
		});
	}
	else // main - all targets node / web / webworker
	{

		app.wpc.module.rules.push({
			test: /\.ts$/,
			issuerLayer: "release",
			include: path.join(app.paths.build, "src"),
			loader: "string-replace-loader",
			exclude: [
				/node_modules/, /test[\\/]/, /types[\\/]/, /\.d\.ts$/
			],
			options: {
				multiple: [
				{
					search: /=>\s*(?:this\.wrapper|this|wrapper|w)\._?log\.(?:write2?|info|values?|method[A-Z][a-z]+)\s*\([^]*?\)\s*\}\);/g,
					replace: (/** @type {string} */r) => {
						return "=> {}\r\n" + r.substring(r.slice(0, r.length - 3).lastIndexOf(")") + 1);
					}
				},
				{
					search: /=>\s*(?:this\.wrapper|this|wrapper|w)\._?log\.(?:write2|info|values?|method[A-Z][a-z]+)\s*\([^]*?\),/g,
					replace: "=> {},"
				},
				{
					search: /=>\s*(?:this\.wrapper|this|wrapper|w)\._?log\.(?:write2?|info|values?|method[A-Z][a-z]+)\s*\([^]*?\) *;/g,
					replace: "=> {};"
				},
				{
					search: /(?:this\.wrapper|this|wrapper|w)\._?log\.(?:write2?|info|values?|method[A-Z][a-z]+)\s*\([^]*?\)\s*;\s*?(?:\r\n|$)/g,
					replace: "\r\n"
				},
				{
					search: /this\.wrapper\.log\.(?:write2?|info|values?|method[A-Z][a-z]+),/g,
					replace: "this.wrapper.emptyFn,"
				},
				{
					search: /wrapper\.log\.(?:write2?|info|values?|method[A-Z][a-z]+),/g,
					replace: "wrapper.emptyFn,"
				},
				{
					search: /w\.log\.(?:write2?|info|values?|method[A-Z][a-z]+),/g,
					replace: "w.emptyFn,"
				},
				{
					search: /this\.wrapper\.log\.(?:write2?|info|values?|method[A-Z][a-z]+)\]/g,
					replace: "this.wrapper.emptyFn]"
				},
				{
					search: /wrapper\._?log\.(?:write2?|info|values?|method[A-Z][a-z]+)\]/g,
					replace: "wrapper.emptyFn]"
				},
				{
					search: /w\.log\.(?:write2?|info|values?|method[A-Z][a-z]+)\]/g,
					replace: "w.emptyFn]"
				}]
			}
		},
		{
			test: /wrapper\.ts$/,
			issuerLayer: "release",
			include: path.join(app.paths.build, "src", "lib"),
			loader: "string-replace-loader",
			exclude: [
				/node_modules/, /test[\\/]/, /types[\\/]/, /\.d\.ts$/
			],
			options: {
				search: /^log\.(?:write2?|error|warn|info|values?|method[A-Z][a-z]+)\]/g,
				replace: "() => {}]"
			}
		},
		{
			test: /\.ts$/,
			include: path.join(app.paths.build, "src"),
			exclude: [
				/node_modules/, /test[\\/]/, /types[\\/]/, /\.d\.ts$/
			],
			use: [ app.esbuild ?
			{
				loader: "esbuild-loader",
				options: {
					implementation: esbuild,
					loader: "tsx",
					target: [ "es2020", "chrome91", "node16.20" ],
					tsconfigRaw: getTsConfig(
						app, path.join(app.paths.build, `tsconfig.${app.target}.json`),
					)
				}
			} :
			{
				loader: "ts-loader",
				options: {
					configFile: path.join(app.paths.build, `tsconfig.${app.target}.json`),
					experimentalWatchApi: true,
					transpileOnly: true
				}
			} ]
		});

	}
};


module.exports = rules;
