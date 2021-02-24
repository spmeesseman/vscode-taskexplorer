//@ts-check

'use strict';

const path = require('path');
const nodeExternals = require("webpack-node-externals")

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
        index: './src/test/index.ts',
        istanbultestrunner: './src/test/istanbultestrunner.ts',
        runTest: './src/test/runTest.ts',
        testUtil: './src/test/testUtil.ts',
        extension: './src/test/extension.test.ts',
        util: './src/test/util.test.ts'
    },
	output:
	{   //
		// the bundle is stored in the 'dist' folder (check package.json), -> https://webpack.js.org/configuration/output/
		//
		path: path.resolve(__dirname, 'dist'),
		//  filename: 'test.js',
		libraryTarget: 'commonjs2',
		devtoolModuleFilenameTemplate: '../[resource-path]',
		filename: 'test/[name].js',
        sourceMapFilename: 'test/[name].js.map'
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
	}
};
module.exports = config;