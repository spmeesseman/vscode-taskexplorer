//@ts-check
// const fs = require("fs");
var glob = require('glob');
const path = require("path");
const JSON5 = require("json5");
const esbuild = require("esbuild");
const { spawnSync } = require("child_process");
const { wpPlugin } = require("./webpack.plugin");
const nodeExternals = require('webpack-node-externals');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

/** @typedef {import("./types/webpack").WebpackBuild} WebpackBuild */
/** @typedef {import("./types/webpack").WebpackConfig} WebpackConfig */
/** @typedef {import("./types/webpack").WebpackEnvironment} WebpackEnvironment */
/** @typedef {"true"|"false"} BooleanString */
/** @typedef {{ mode: "none"|"development"|"production"|undefined, env: WebpackEnvironment, config: String[] }} WebpackArgs */


const webviewApps =
{
	home: "./home/home.ts",
	license: "./license/license.ts",
	parsingReport: "./parsingReport/parsingReport.ts",
	releaseNotes: "./releaseNotes/releaseNotes.ts",
	taskCount: "./taskCount/taskCount.ts",
	taskUsage: "./taskUsage/taskUsage.ts",
	welcome: "./welcome/welcome.ts",
};


/**
 * Webpack Export
 *
 * @param {WebpackEnvironment} env Environment variable containing runtime options passed
 * to webpack on the command line (e.g. `webpack --env environment=test --env clean=true`).
 * @param {WebpackArgs} argv Webpack command line args
 * @returns {WebpackConfig|WebpackConfig[]}
 */
module.exports = (env, argv) =>
{
	env = Object.assign(
	{
		clean: false,
		analyze: false,
		esbuild: false,
		imageOpt: true,
		environment: "prod",
		target: "node"
	}, env);
	
	if (typeof env.analyze === "string") { env.analyze = String(env.analyze).toLowerCase() == "true"; }
	if (typeof env.clean === "string") { env.clean = String(env.clean).toLowerCase() == "true"; }
	if (typeof env.esbuild === "string") { env.esbuild = String(env.esbuild).toLowerCase() == "true"; }
	if (typeof env.imageOpt === "string") { env.imageOpt = String(env.imageOpt).toLowerCase() == "true"; }

	if (env.build){
		return getWebpackConfig(env.build, env, argv);
	}

	if (env.environment === "test"){
		return [
			getWebpackConfig("extension_tests", env, argv),
			// getWebpackConfig("extension", { ...env, ...{ environment: "dev" }}, argv)
			getWebpackConfig("extension", env, argv)
		];
	}

	return [
		getWebpackConfig("extension", env, argv),
		// getWebpackConfig("extension_web", env, argv),
		getWebpackConfig("webview", env, argv),
	];
};


/**
 * @method
 * @private
 * @param {WebpackBuild} buildTarget
 * @param {WebpackEnvironment} env Webpack build environment
 * @param {WebpackArgs} argv Webpack command line args
 * @returns {WebpackConfig}
 */
const getWebpackConfig = (buildTarget, env, argv) =>
{   
	env.build = buildTarget;
	env.basePath = env.build === "webview" ? path.join(__dirname, "src", "webview", "app") : __dirname;
	/**@type {WebpackConfig}*/const wpConfig = {};
	mode(env, argv, wpConfig);    // Mode i.e. "production", "development", "none"
	context(env, wpConfig);       // Context for build
	entry(env, wpConfig);         // Entry points for built output
	externals(env, wpConfig)      // External modules
	optimization(env, wpConfig);  // Build optimization
	minification(env, wpConfig);  // Minification / Terser plugin options
	output(env, wpConfig);        // Output specifications
	plugins(env, wpConfig);       // Webpack plugins
	resolve(env, wpConfig);       // Resolve config
	rules(env, wpConfig);         // Loaders & build rules
	stats(wpConfig);              // Stats i.e. console output & verbosity
	target(env, wpConfig);        // Target i.e. "node", "webworker", "tests"
	wpConfig.name = `${buildTarget}:${wpConfig.mode}`;
	return wpConfig;
};


//
// *************************************************************
// *** CONTEXT                                               ***
// *************************************************************
//
/**
 * @method
 * @param {WebpackEnvironment} env Webpack build environment
 * @param {WebpackConfig} wpConfig Webpack config object
 */
const context = (env, wpConfig) =>
{
	if (env.build === "webview")
	{
		wpConfig.context = env.basePath;
	}
};


//
// *************************************************************
// *** DEVTOOL                                               ***
// *************************************************************
//
/**
 * Adds library mode webpack config `output` object.
 *
 * Possible devTool values:
 *
 *     none:                        : Recommended for prod builds w/ max performance
 *     inline-source-map:           : Possible when publishing a single file
 *     cheap-source-map
 *     cheap-module-source-map
 *     eval:                        : Recommended for de builds w/ max performance
 *     eval-source-map:             : Recommended for dev builds w/ high quality SourceMaps
 *     eval-cheap-module-source-map : Tradeoff for dev builds
 *     eval-cheap-source-map:       : Tradeoff for dev builds
 *     inline-cheap-source-map
 *     inline-cheap-module-source-map
 *     source-map:                  : Recommended for prod builds w/ high quality SourceMaps
 *
 * @method
 * @private
 * @param {WebpackEnvironment} env Webpack build environment
 * @param {WebpackConfig} wpConfig Webpack config object
 */
const devTool = (env, wpConfig) =>
{
	wpConfig.devtool = false;
	if (env.environment === "dev" || wpConfig.mode === "development")
	{
		wpConfig.devtool = "source-map";
	}
	else if (env.environment === "test")
	{
		wpConfig.devtool = "source-map";
	}
	if (!wpConfig.output) {
		wpConfig.output = {};
	}
	wpConfig.output.devtoolModuleFilenameTemplate = "../[resource-path]"
};


//
// *************************************************************
// *** ENTRY POINTS                                          ***
// *************************************************************
//
/**
 * @method
 * @param {WebpackEnvironment} env Webpack build environment
 * @param {WebpackConfig} wpConfig Webpack config object
 */
const entry = (env, wpConfig) =>
{
	if (env.build === "webview")
	{
		wpConfig.entry = webviewApps;
	}
	else
	{
		if (env.build !== "extension_tests")
		{
			wpConfig.entry =
			{
				"extension": {
					import: "./src/extension.ts",
					filename: "extension.js"
				}
			};
		}
		else
		{
			wpConfig.entry =
			{
				runTest: './src/test/runTest.ts',
				'suite/index': './src/test/suite/index.ts',
				...glob.sync('./src/test/suite/**/*.test.ts').reduce(function (obj, e) {
					obj['suite/' + path.parse(e).name] = e;
					return obj;
				}, {})
			};
		}
	}
};


//
// *************************************************************
// *** EXTERNALS                                             ***
// *************************************************************
//
/**
 * @method
 * @param {WebpackEnvironment} env Webpack build environment
 * @param {WebpackConfig} wpConfig Webpack config object
 */
const externals = (env, wpConfig) =>
{
	if (env.build !== "extension_tests")
	{
		wpConfig.externals =
		{   //
			// the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot
			// be webpack"ed, -> https://webpack.js.org/configuration/externals/
			//
			vscode: "commonjs vscode"
		};
	}
	else
	{
		wpConfig.externals = [
			{ vscode: 'commonjs vscode' },
			/** @type {import("webpack").WebpackPluginInstance}*/
			(nodeExternals())
		];
	}
};


//
// *************************************************************
// *** MINIFICATION                                          ***
// *************************************************************
/**
 * @method
 * @param {WebpackEnvironment} env Webpack build environment
 * @param {WebpackConfig} wpConfig Webpack config object
 */
const minification = (env, wpConfig) =>
{   //
	// For production build, customize the minify stage
	// Webpack 5 performs minification built-in now for production builds.
	// Leaving this commented here in case it is ever needed again.
	//
	// if (wpConfig.mode === "production")
	// {
	// 	Object.assign(/** @type {WebpackOptimization}*/(wpConfig.optimization),
	// 	{
	// 		minimize: true,
	// 		minimizer: [
	// 			new TerserPlugin(
	// 			env.esbuild ?
	// 			{
	// 				minify: TerserPlugin.esbuildMinify,
	// 				terserOptions: {
	// 					// @ts-ignore
	// 					drop: ["debugger"],
	// 					// compress: true,
	// 					// mangle: true,   // Default `false`
	// 					format: "cjs",
	// 					minify: true,
	// 					sourceMap: false,
	// 					treeShaking: true,
	// 					// Keep the class names otherwise @log won"t provide a useful name
	// 					keepNames: true,
	// 					// keep_names: true,
	// 					target: "es2020",
	// 				}
	// 			} :
	// 			{
	// 				extractComments: false,
	// 				parallel: true,
	// 				terserOptions: {
	// 					compress: {
	// 						drop_debugger: true,
	// 					},
	// 					// compress: true,
	// 					// mangle: true,   // Default `false`
	// 					ecma: 2020,
	// 					sourceMap: false,
	// 					format: {},
	// 					// format: {       // Default {}
	// 					// 	comments: false, // default "some"
	// 					// 	shebang: true
	// 					// },
	// 					// toplevel (default false) - set to true to enable top level variable
	// 					// and function name mangling and to drop unused variables and functions.
	// 					// toplevel: false,
	// 					// nameCache: null,
	// 					// Keep the class names otherwise @log won"t provide a useful name
	// 					keep_classnames: true,
	// 					module: true,
	// 				},
	// 			})
	// 		]
	// 	});
	// }
};


//
// *************************************************************
// *** MODE                                                  ***
// *************************************************************
/**
 * @method
 * @param {WebpackEnvironment} env Webpack build environment
 * @param {WebpackArgs} argv Webpack command line args
 * @param {WebpackConfig} wpConfig Webpack config object
 */
const mode = (env, argv, wpConfig) =>
{
	if (!argv.mode)
	{
		if (env.environment === "dev" || env.environment === "test") {
			wpConfig.mode = "development";
		}
		else {
			wpConfig.mode = "production";
			env.environment = "prod";
		}
	}
	else
	{
		wpConfig.mode = argv.mode;
		if (argv.mode === "development") {
			env.environment = "dev";
		}
		else if (argv.mode === "production") {
			env.environment = "prod";
		}
	}
};


//
// *************************************************************
// *** OPTIMIZATION                                          ***
// *************************************************************
/**
 * @method
 * @param {WebpackEnvironment} env Webpack build environment
 * @param {WebpackConfig} wpConfig Webpack config object
 */
const optimization = (env, wpConfig) =>
{
	if (env.build !== "webview" && env.environment !== "test")
	{
		wpConfig.optimization =
		{
			runtimeChunk: env.environment !== "dev" ? "single" : undefined,
			splitChunks: env.build === "extension_web" ? false : {
				cacheGroups: {
					vendor: {
						test: /[\\/]node_modules[\\/]((?!(node-windows)).*)[\\/]/,
						name: "vendor",
						chunks: "all"
					}
				}
			}
		};
		/*  splitChunks:
			{
				chunks: () => false, // Disable all non-async code splitting
				cacheGroups: {
					default: false,
					vendors: false,
				},
			}
		*/
	}
	else {
		wpConfig.optimization = {};
	}
};


//
// *************************************************************
// *** OUTPUT                                                ***
// *************************************************************
/**
 * @method
 * @param {WebpackEnvironment} env Webpack build environment
 * @param {WebpackConfig} wpConfig Webpack config object
 */
const output = (env, wpConfig) =>
{
	if (env.build === "webview")
	{
		wpConfig.output = {
			clean: env.clean === true,
			path: path.join(__dirname, "res"),
			publicPath: "#{webroot}/",
			filename: (pathData, assetInfo) =>
			{
				let name = "[name]";
				if (pathData.chunk?.name) {
					name = pathData.chunk.name.replace(/[a-z]+([A-Z])/g, (substr, token) => substr.replace(token, "-" + token.toLowerCase()));
				}
				return `js/${name}.js`;
			}
		};
	}
	else
	{
		if (env.environment === "test" && env.build === "extension")
		{
			wpConfig.output = {
				globalObject: "this",
				path: path.join(__dirname, "dist"),
				filename: '[name].js',
				library: {
					type: "commonjs2"
				}
			};
		}
		else if (env.build === "extension" || env.environment !== "test")
		{
			wpConfig.output = {
				clean: env.clean === true,
				path: env.build === "extension_web" ? path.join(__dirname, "dist", "browser") : path.join(__dirname, "dist"),
				filename: '[name].js',
				libraryTarget: 'commonjs2',
				sourceMapFilename: wpConfig.mode !== "production" ? '[name].js.map' : undefined
			};
		}
		else
		{
			wpConfig.output = {
				path: env.build === "extension_web" ? path.join(__dirname, 'dist', 'test', 'browser') : path.join(__dirname, 'dist', 'test'),
				filename: '[name].js',
				libraryTarget: 'commonjs2',
				sourceMapFilename: '[name].js.map'
			};
		}
	}
	
	devTool(env, wpConfig);
};


//
// *************************************************************
// *** PLUGINS                                               ***
// *************************************************************
/**
 * @method
 * @param {WebpackEnvironment} env Webpack build environment
 * @param {WebpackConfig} wpConfig Webpack config object
 */
const plugins = (env, wpConfig) =>
{
	wpConfig.plugins = [];

	if (env.build === "webview")
	{
		const apps = Object.keys(webviewApps);
		wpConfig.plugins.push(
			wpPlugin.clean(env, wpConfig),
			wpPlugin.tscheck(env, wpConfig),
			wpPlugin.cssextract(env, wpConfig),
			...wpPlugin.webviewapps(apps, env, wpConfig),
			// @ts-ignore
			wpPlugin.htmlcsp(env, wpConfig),
			wpPlugin.htmlinlinechunks(env, wpConfig),
			wpPlugin.copy(apps, env, wpConfig),
			wpPlugin.imageminimizer(env, wpConfig)
		);
	}
	else
	{
		wpConfig.plugins.push(
			wpPlugin.clean(env, wpConfig),
			wpPlugin.tscheck(env, wpConfig),
			wpPlugin.limitchunks(env, wpConfig)
		);
	}

	wpConfig.plugins.push(
		// @ts-ignore
		wpPlugin.analyze.bundle(env, wpConfig),
		wpPlugin.analyze.circular(env, wpConfig),
		wpPlugin.banner(env, wpConfig),
		wpPlugin.afterdone(env, wpConfig)
	);

	wpConfig.plugins.slice().reverse().forEach((p, index, object) =>
	{
		if (!p) {
			/** @type {*} */(wpConfig.plugins).splice(object.length - 1 - index, 1);
		}
	});
};


//
// *************************************************************
// *** RESOLVE                                               ***
// *************************************************************
/**
 * @method
 * @param {WebpackEnvironment} env Webpack build environment
 * @param {WebpackConfig} wpConfig Webpack config object
 */
const resolve = (env, wpConfig) =>
{
	if (env.build !== "webview")
	{
		wpConfig.resolve =
		{   
			alias: {
				"@env": path.resolve(__dirname, "src", "lib", "env", env.build === "extension_web" ? "browser" : "node")
			},
			fallback: env.build === "extension_web" ? { path: require.resolve("path-browserify"), os: require.resolve("os-browserify/browser") } : undefined,
			mainFields: env.build === "extension_web" ? [ "browser", "module", "main" ] : [ "module", "main" ],
			extensions: [ ".ts", ".tsx", ".js", ".jsx", ".json" ]
		};
	}
	else
	{
		wpConfig.resolve = {
			alias: {
				"@env": path.resolve(__dirname, "src", "lib", "env", "browser"),
			},
			extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
			modules: [env.basePath, "node_modules"],
		};
	}
};


//
// *************************************************************
// *** RULES                                                 ***
// *************************************************************
/**
 * @method
 * @param {WebpackEnvironment} env Webpack build environment
 * @param {WebpackConfig} wpConfig Webpack config object
 */
const rules = (env, wpConfig) =>
{
	wpConfig.module = {};
	wpConfig.module.rules = [];

	if (env.build === "webview")
	{
		wpConfig.module.rules.push(...[
		{
			test: /\.m?js/,
			resolve: { fullySpecified: false },
		},
		{
			exclude: /\.d\.ts$/,
			include: path.join(__dirname, "src"),
			test: /\.tsx?$/,
			use: env.esbuild ?
			{
				loader: "esbuild-loader",
				options: {
					implementation: esbuild,
					loader: "tsx",
					target: "es2020",
					tsconfigRaw: resolveTSConfig(path.join(env.basePath, "tsconfig.json")),
				},
			}:{
				loader: "ts-loader",
				options: {
					configFile: path.join(env.basePath, "tsconfig.json"),
					experimentalWatchApi: true,
					transpileOnly: true,
				},
			},
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
					sourceMap: wpConfig.mode !== "production",
					url: false,
				},
			},
			{
				loader: "sass-loader",
				options: {
					sourceMap: wpConfig.mode !== "production",
				},
			}]
		}]);
	}
	else
	{
		wpConfig.module.rules.push(...[
		// {
		// 	test: /\.ts$/,
		// 	exclude: [/node_modules/, /test/],
		// 	use: [{
		// 		loader: "ts-loader"
		// 	}]
		// },
		{
			exclude: env.environment !== "test" ? [/node_modules/, /test/, /\.d\.ts$/ ] : [/node_modules/, /\.d\.ts$/ ],
			// include: env.environment !== "test" ? path.join(__dirname, "src") : path.join(__dirname, "src", "test"),
			include: path.join(__dirname, "src"),
			test: /\.tsx?$/,
			// @ts-ignore
			use: env.esbuild ?
			{
				loader: "esbuild-loader",
				options: {
					implementation: esbuild,
					loader: "tsx",
					target: ["es2020", "chrome91", "node14.16"],
					tsconfigRaw: resolveTSConfig(
						path.join(
							__dirname,
							env.build === "extension_web" ? "tsconfig.browser.json" : "tsconfig.json",
						),
					),
				},
			} :
			{
				loader: "ts-loader",
				options: {
					configFile: path.join(
						__dirname,
						env.build === "extension_web" ? "tsconfig.browser.json" : "tsconfig.json",
					),
					experimentalWatchApi: true,
					transpileOnly: true
				},
			}
		}]);
	}
};


//
// *************************************************************
// *** STATS                                                 ***
// *************************************************************
/**
 * @method
 * @param {WebpackConfig} wpConfig Webpack config object
 */
// @ts-ignore
const stats = (wpConfig) =>
{
	wpConfig.stats = {
		preset: "errors-warnings",
		assets: true,
		colors: true,
		env: true,
		errorsCount: true,
		warningsCount: true,
		timings: true
	};

	wpConfig.infrastructureLogging = {
		level: "log" // enables logging required for problem matchers
	};
};


//
// *************************************************************
// *** RESOLVE TS.CONFIG                                     ***
// *************************************************************
/**
 * @param {String} tsConfigFile
 * @returns {String}
 */
const resolveTSConfig = (tsConfigFile) =>
{
	const result = spawnSync("npx", ["tsc", `-p ${tsConfigFile}`, "--showConfig"], {
		cwd: __dirname,
		encoding: "utf8",
		shell: true,
	});
	const data = result.stdout,
		  start = data.indexOf("{"),
		  end = data.lastIndexOf("}") + 1;
	return JSON5.parse(data.substring(start, end));
};


//
// *************************************************************
// *** TARGET                                               ***
// *************************************************************
/**
 * @method
 * @param {WebpackEnvironment} env Webpack build environment
 * @param {WebpackConfig} wpConfig Webpack config object
 */
const target = (env, wpConfig) =>
{
	if (env.build === "webview") {
		wpConfig.target = "webworker";
	}
	else {
		wpConfig.target = "node";
	}
};
