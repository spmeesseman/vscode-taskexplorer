
const path = require('path');

const config =
{
	target: 'node',
	entry: {
        runTest: './src/test/runTest.ts'
    },
	output:
	{
		path: path.resolve(__dirname, 'dist'),
		libraryTarget: 'commonjs2',
		devtoolModuleFilenameTemplate: '../[resource-path]',
		filename: 'test/[name].js'
	},
	devtool: 'source-map',
	externals: {
		vscode: 'commonjs vscode'
	},
	resolve:
	{
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