//@ts-check
// const fs = require("fs");
const path = require("path");
const JSON5 = require("json5");
const esbuild = require("esbuild");
const { spawnSync } = require("child_process");
const { wpPlugin } = require("./webpack.plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

/** @typedef {import("./types/webpack").WebpackBuild} WebpackBuild */
/** @typedef {import("./types/webpack").WebpackConfig} WebpackConfig */
/** @typedef {import("./types/webpack").WebpackEnvironment} WebpackEnvironment */

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
 * @returns {WebpackConfig|WebpackConfig[]}
 */
module.exports = (env) =>
{
	env = {
		clean: false,
		analyze: false,
		esbuild: false,
		imageOpt: true,
		environment: "prod",
		target: "node",
		...env
	};

	// @ts-ignore
	if (env.analyze === "true")  { env.analyze = true;  }
	if (env.clean === "true")    { env.clean = true;    }
	if (env.esbuild === "true")  { env.esbuild = true;  }
	if (env.imageOpt === "true") { env.imageOpt = true; }

	if (env.build)
	{
		return getWebpackConfig(/**@type {WebpackBuild}*/(env.build), env);
	}

	return [
		getWebpackConfig("extension", env),
		// getWebpackConfig("extension_web", env),
		getWebpackConfig("webview", env),
	];
};


/**
 * @method
 * @private
 * @param {WebpackBuild} build
 * @param {WebpackEnvironment} env Webpack build environment
 * @returns {WebpackConfig}
 */
const getWebpackConfig = (build, env) =>
{   
	env.build = build;
	env.basePath = env.build === "webview" ? path.join(__dirname, "src", "webview", "app") : __dirname;
	/**@type {WebpackConfig}*/const wpConfig = {};
	mode(env, wpConfig);          // Mode i.e. "production", "development", "none"
	context(env, wpConfig);       // Context for build
	entry(env, wpConfig);         // Entry points for built output
	externals(wpConfig)           // External modules
	optimization(env, wpConfig);  // Build optimization
	minification(env, wpConfig);  // Minification / Terser plugin options
	output(env, wpConfig);        // Output specifications
	plugins(env, wpConfig);       // Webpack plugins
	resolve(env, wpConfig);       // Resolve config
	rules(env, wpConfig);         // Loaders & build rules
	stats(wpConfig);              // Stats i.e. console output & verbosity
	target(env,wpConfig);         // Target i.e. "node", "webworker", "tests"
	wpConfig.name = `${build}:${wpConfig.mode}`;
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
		wpConfig.entry = {
			"extension": {
				import: "./src/extension.ts",
				filename: "extension.js"
			}
		};
	}
};


//
// *************************************************************
// *** EXTERNALS                                             ***
// *************************************************************
//
/**
 * @method
 * @param {WebpackConfig} wpConfig Webpack config object
 */
const externals = (wpConfig) =>
{
	wpConfig.externals =
	{   //
		// the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot
		// be webpack"ed, -> https://webpack.js.org/configuration/externals/
		//
		vscode: "commonjs vscode"
	};
};


//
// *************************************************************
// *** LIBRARY MODE                                          ***
// *************************************************************
/**
 * Adds library mode webpack config `output` object.
 *
 * @method
 * @private
 * @param {WebpackEnvironment} env Webpack build environment
 * @param {WebpackConfig} wpConfig Webpack config object
 */
const library = (env, wpConfig) =>
{
	if (env.environment === "test")
	{
		if (!wpConfig.output) {
			wpConfig.output = {};
		}
		Object.assign(wpConfig.output,
		{
			globalObject: "this",
			library: {
				type: "commonjs2"
			}
		});
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
 * @param {WebpackConfig} wpConfig Webpack config object
 */
const mode = (env, wpConfig) =>
{
	if (env.environment === "dev" || env.environment === "test") {
		wpConfig.mode = "development";
	}
	else //
	{   // env.environment === "prod"
		wpConfig.mode = "production";
		env.environment = "prod";
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
	if (env.build !== "webview")
	{
		wpConfig.optimization =
		{
			runtimeChunk: env.environment !== "dev" ? "single" : undefined,
			splitChunks: wpConfig.target === "webworker" ? false : {
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
			filename: "js/[name].js",
			// libraryTarget: "module",
    		// chunkFormat: "module",
			path: path.join(__dirname, "res"),
			publicPath: "#{webroot}/",
		};
	}
	else
	{
		wpConfig.output = {
			clean: env.clean === true,
			path: env.build === "extension_web" ? path.join(__dirname, "dist", "browser") :
												  path.join(__dirname, "dist"),
			libraryTarget: "commonjs2",
			filename: "[name].js"
		};
	}
	
	devTool(env, wpConfig);
	library(env, wpConfig);
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
		wpConfig.plugins.push(
			wpPlugin.clean(env, wpConfig),
			wpPlugin.tscheck(env, wpConfig),
			wpPlugin.cssextract(env, wpConfig),
			...wpPlugin.webviewapps(Object.keys(webviewApps), env, wpConfig),
			// @ts-ignore
			wpPlugin.htmlcsp(env, wpConfig),
			wpPlugin.htmlinlinechunks(env, wpConfig),
			wpPlugin.copy(env, wpConfig)
		);
		// if (wpConfig.mode !== "production")
		// {
		// 	wpConfig.plugins.push(wpPlugin.imageminimizer);
		// }
	}
	else
	{
		wpConfig.plugins.push(wpPlugin.clean(env, wpConfig));
		// plugin.tscheck(env, wpConfig);
		if (env.build === "extension_web")
		{
			wpConfig.plugins.push(wpPlugin.limitchunks(env, wpConfig));
		}
	}

	if (env.analyze === true)
	{
		// @ts-ignore
		wpConfig.plugins.push(wpPlugin.analyze.bundle(env, wpConfig));
		// @ts-ignore
		wpConfig.plugins.push(wpPlugin.analyze.circular(env, wpConfig));
	}

	wpConfig.plugins.push(wpPlugin.banner(env, wpConfig));
	wpConfig.plugins.push(wpPlugin.afterdone(env, wpConfig));

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
			extensions: [
				".ts", ".tsx", ".js", ".jsx", ".json"
			]
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
			exclude: [/node_modules/, /test/, /\.d\.ts$/ ],
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
		level: "log", // enables logging required for problem matchers
	};
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
		wpConfig.target = "web";
	}
	else {
		wpConfig.target = env.target || "node";
	}
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
