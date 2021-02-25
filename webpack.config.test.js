//@ts-check

'use strict';

const path = require('path');
const nodeExternals = require("webpack-node-externals")
const TerserPlugin = require('terser-webpack-plugin');


/**
 * @type {import('webpack').Configuration}
 */
const config =
{   //
	// vscode extensions run in a Node.js-context -> https://webpack.js.org/configuration/node/
	//
	target: 'node', 
	//
	// the entry point of this extension, -> https://webpack.js.org/configuration/entry-context/
	//
	entry: {
        runTest: './src/test/runTest.ts',
        index: './src/test/index.ts',
        istanbultestrunner: './src/test/istanbultestrunner.ts',
        testUtil: './src/test/testUtil.ts',
        "tasks.test": './src/test/tasks.test.ts',
        "extension.test": './src/test/extension.test.ts',
        "util.test": './src/test/util.test.ts'
    },
	//entry: './src/test/runTest.ts',
	// entry: {
    //     runTest: './src/test/runTest.ts',
    //     index: './src/test/index.ts'
    // },
	output:
	{   //
		// the bundle is stored in the 'dist' folder (check package.json), -> https://webpack.js.org/configuration/output/
		//
		path: path.resolve(__dirname, 'dist'),
		libraryTarget: 'commonjs2',
		devtoolModuleFilenameTemplate: '../[resource-path]',
		filename: 'test/[name].js'
		// filename: 'test/[name].js',
        // sourceMapFilename: 'test/[name].js.map'
	},
	devtool: 'source-map',
	externals: [
		nodeExternals(),
		{   //
			// the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot
			// be webpack'ed, -> https://webpack.js.org/configuration/externals/
			//
			vscode: 'commonjs vscode'
		}
	],
	resolve:
	{   //
		// support reading TypeScript and JavaScript files, -> https://github.com/TypeStrong/ts-loader
		//
		extensions: ['.ts', '.js']
	},
	module: {
		rules: [{
			test: /\.ts$/,
			exclude: /node_modules/,
			use: [{
				loader: 'ts-loader'
			}]
		}]
	},
	optimization: {
		minimizer: [
			new TerserPlugin({ 
				extractComments: false ,
				parallel: true,
				terserOptions: {
					ecma: undefined,
					parse: {},
					compress: {},
					mangle: true, // Note `mangle.properties` is `false` by default.
					module: false,
					// Deprecated
					output: null,
					format: null,
					toplevel: false,
					nameCache: null,
					ie8: false,
					keep_classnames: undefined,
					keep_fnames: false,
					safari10: false,
				}
			})
		],
	}
};
module.exports = config;