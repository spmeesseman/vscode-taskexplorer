//@ts-check

var fs = require('fs');
var glob = require('glob');
const path = require('path');
const JSON5 = require('json5');
const esbuild = require('esbuild');
const { spawnSync } = require('child_process');
const nodeExternals = require('webpack-node-externals');
const ForkTsCheckerPlugin = require('fork-ts-checker-webpack-plugin');
const { CleanWebpackPlugin: CleanPlugin } = require('clean-webpack-plugin');

/**
 * @typedef {Object} WebpackBuildEnv
 * @property {Boolean} clean If set,will clean the output directory before build
 * @property {String} environment The environment to compile for, one of `prod`, `dev`, or `test`,
 * or `test`.  Note this is not the same as webpack `mode`.
 */
/** @typedef {import("webpack").Configuration} WebpackConfig */
/** @typedef {*} PluginInstance */

/**
 * @param {{ esbuild?: boolean } | undefined } env
 * @param {{ mode: 'production' | 'development' | 'none' | undefined }} argv
 * @returns { WebpackConfig }
 */
module.exports = (env, argv) =>
{
	const mode = argv.mode || 'development';

	env = {
		esbuild: true,
		...env,
	};

	return getWsConfig('node', mode, env) /*, getWsConfig('webworker', mode, env)*/;
};


/**
 * @param { 'node' | 'webworker' } target
 * @param { 'production' | 'development' | 'none' } mode
 * @param {{ analyzeBundle?: boolean; analyzeDeps?: boolean; esbuild?: boolean } | undefined } env
 * @returns { WebpackConfig }
 */
const getWsConfig = (target, mode, env)  =>
({
	name: `tests:${target}`,
	// entry: {
    //     runTest: './src/test/runTest.ts'
    // },
	entry: {
		runTest: './src/test/runTest.ts',
		'suite/index': './src/test/suite/index.ts',
		...glob.sync('./src/test/suite/**/*.test.ts').reduce(function (obj, e) {
			obj['suite/' + path.parse(e).name] = e;
			return obj;
		}, {}),
	},
	mode: mode,
	target: target,
	// output:
	// {
	// 	path: path.resolve(__dirname, 'dist'),
	// 	libraryTarget: 'commonjs2',
	// 	devtoolModuleFilenameTemplate: '../[resource-path]',
	// 	filename: 'test/[name].js'
	// },
	output: {
		path:
			target === 'webworker'
				? path.join(__dirname, 'out', 'test', 'browser')
				: path.join(__dirname, 'out', 'test'),
		filename: '[name].js',
		sourceMapFilename: '[name].js.map',
		libraryTarget: 'commonjs2',
	},
	devtool: 'source-map',
	// externals: {
	// 	vscode: 'commonjs vscode'
	// },
	externals: [{ vscode: 'commonjs vscode' }, /** @type {import("webpack").WebpackPluginInstance}*/(nodeExternals())],
	// resolve:
	// {
	// 	extensions: ['.ts', '.js']
	// },
	resolve: {
		alias: { '@env': path.resolve(__dirname, 'src', 'env', target === 'webworker' ? 'browser' : target) },
		fallback: target === 'webworker' ? { path: require.resolve('path-browserify') } : undefined,
		mainFields: target === 'webworker' ? ['browser', 'module', 'main'] : ['module', 'main'],
		extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
	},
	// module: {
	// 	rules: [{
	// 		test: /\.ts$/,
	// 		include: path.join(__dirname, 'src', 'test'),
	// 		exclude: /node_modules/,
	// 		use: [{
	// 			loader: 'ts-loader'
	// 		}]
	// 	}]
	// },
	module:
	{
		rules: [
		{
			exclude: /\.d\.ts$/,
			include: path.join(__dirname, 'src', 'test'),
			test: /\.tsx?$/,
			// @ts-ignore
			use: env.esbuild ?
			{
				loader: 'esbuild-loader',
				options:
				{
					implementation: esbuild,
					loader: 'ts',
					target: ['es2020', 'chrome91', 'node14.16'],
					tsconfigRaw: resolveTSConfig(
						path.join(
							__dirname,
							target === 'webworker'
								? 'tsconfig.test.browser.json'
								: 'tsconfig.test.json',
						)
					)
				}
			}:
			{
				loader: 'ts-loader',
				options: {
					configFile: path.join(
						__dirname,
						target === 'webworker' ? 'tsconfig.test.browser.json' : 'tsconfig.test.json',
					),
					experimentalWatchApi: true,
					transpileOnly: true,
				}
			}
		}]
	},
	infrastructureLogging: {
		level: 'log', // enables logging required for problem matchers
	},
	stats: {
		preset: 'errors-warnings',
		assets: true,
		colors: true,
		env: true,
		errorsCount: true,
		warningsCount: true,
		timings: true,
	},
	plugins: [
		new CleanPlugin({ cleanOnceBeforeBuildPatterns: ['out/**'] }),
		new ForkTsCheckerPlugin({
			async: false,
			// eslint: {
			// 	enabled: true,
			// 	files: 'src/**/*.ts',
			// 	options: {
			// 		// cache: true,
			// 		cacheLocation: path.join(
			// 			__dirname,
			// 			target === 'webworker' ? '.eslintcache.browser' : '.eslintcache',
			// 		),
			// 		overrideConfigFile: path.join(
			// 			__dirname,
			// 			target === 'webworker' ? '.eslintrc.browser.json' : '.eslintrc.json',
			// 		),
			// 	},
			// },
			formatter: 'basic',
			typescript: {
				configFile: path.join(
					__dirname,
					target === 'webworker' ? 'tsconfig.test.browser.json' : 'tsconfig.test.json',
				),
			},
		}),
	]
});

/**
 * @param { string } configFile
 * @returns { string }
 */
function resolveTSConfig(configFile)
{
	const result = spawnSync('yarn', ['tsc', `-p ${configFile}`, '--showConfig'], {
		cwd: __dirname,
		encoding: 'utf8',
		shell: true,
	});
	const data = result.stdout;
	const start = data.indexOf('{');
	const end = data.lastIndexOf('}') + 1;
	const json = JSON5.parse(data.substring(start, end));
	return json;
}
