/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable import/no-extraneous-dependencies */
// @ts-check

const glob = require("glob");
const path = require("path");
// const nodeExternals = require("webpack-node-externals");
const { entry, externals, plugins, output, rules } = require("./webpack/exports");
const { wpPlugin } = require("./webpack/plugin/plugins");

/** @typedef {import("./webpack/types/webpack").WebpackBuild} WebpackBuild */
/** @typedef {import("./webpack/types/webpack").WebpackConfig} WebpackConfig */
/** @typedef {import("./webpack/types/webpack").WebpackEnvironment} WebpackEnvironment */
/** @typedef {import("./webpack/types/webpack").WebpackPluginInstance} WebpackPluginInstance */
/** @typedef {"true"|"false"} BooleanString */
/** @typedef {{ mode: "none"|"development"|"production"|undefined, env: WebpackEnvironment, config: String[] }} WebpackArgs */


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
		fa: "custom",
		imageOpt: true,
		environment: "prod",
		target: "node"
	}, env);

	Object.keys(env).filter(k => typeof env[k] === "string" && /(?:true|false)/i.test(env[k])).forEach((k) =>
	{
		env[k] = env[k].toLowerCase() === "true";
	});

	consoleWrite("Start Webpack build");
	consoleWrite("Environment:");
	consoleWrite(`   build         : ${env.build}`);
	consoleWrite(`   clean         : ${env.clean}`);
	consoleWrite(`   environment   : ${env.environment}`);
	consoleWrite(`   esbuild       : ${env.esbuild}`);
	consoleWrite(`   target        : ${env.target}`);
	if (argv) {
		consoleWrite("Arguments:");
		if (argv.env) {
			consoleWrite(`   environment   : ${argv.env}`);
		}
		if (argv.mode) {
			consoleWrite(`   mode          : ${argv.mode}`);
		}
		if (argv.config) {
			consoleWrite(`   config        : ${argv.config.join(", ")}`);
		}
	}

	if (env.build){
		consoleWrite(`Running environment specified build '${env.build}'`);
		return getWebpackConfig(env.build, env, argv);
	}

	if (env.environment === "test") {
		consoleWrite("Build test files");
		// env.esbuild = true;
		return [
			getWebpackConfig("extension", env, argv),
			getWebpackConfig("webview", { ...env, ...{ environment: "dev" }}, argv)
		];
	}

	if (env.environment === "testprod") {
		consoleWrite("Build test files (production compiled)");
		return [
			getWebpackConfig("extension", env, argv),
			getWebpackConfig("webview", { ...env, ...{ environment: "prod" }}, argv)
		];
	}

	consoleWrite("Build extension and webviews");
	return [
		getWebpackConfig("extension", env, argv),
		// getWebpackConfig("browser", env, argv),
		getWebpackConfig("webview", env, argv),
	];
};


const consoleWrite = (msg, icon, pad = "") =>
    console.log(`     ${pad}${icon || wpPlugin.figures.color.info}${msg ? " " + wpPlugin.figures.withColor(msg, wpPlugin.figures.colors.grey) : ""}`);


/**
 * @method getWebpackConfig
 * @private
 * @param {WebpackBuild} buildTarget
 * @param {WebpackEnvironment} env Webpack build environment
 * @param {WebpackArgs} argv Webpack command line args
 * @returns {WebpackConfig}
 */
const getWebpackConfig = (buildTarget, env, argv) =>
{
	env.build = buildTarget;
	env.buildPath = __dirname;
	/** @type {WebpackConfig}*/
	const wpConfig = {};
	basepath(env);                 // Base path
	mode(env, argv, wpConfig);     // Mode i.e. "production", "development", "none"
	target(env, wpConfig);         // Target i.e. "node", "webworker", "tests"
	context(env, wpConfig);        // Context for build
	entry(env, wpConfig);          // Entry points for built output
	externals(env, wpConfig);      // External modules
	ignorewarnings(env, wpConfig); // Warnings from the compiler to ignore
	optimization(env, wpConfig);   // Build optimization
	minification(env, wpConfig);   // Minification / Terser plugin options
	output(env, wpConfig);         // Output specifications
	devTool(env, wpConfig);        // Dev tool / sourcemap control
	plugins(env, wpConfig);        // Webpack plugins
	resolve(env, wpConfig);        // Resolve config
	rules(env, wpConfig);          // Loaders & build rules
	stats(env, wpConfig);          // Stats i.e. console output & verbosity
	wpConfig.name = `${buildTarget}:${wpConfig.mode}`;
	return wpConfig;
};


//
// *************************************************************
// *** BASEPATH                                               ***
// *************************************************************
//
/**
 * @method basepath
 * @param {WebpackEnvironment} env Webpack build environment
 */
const basepath = (env) =>
{
	if (env.build === "webview") {
		env.basePath = path.join(__dirname, "src", "webview", "app");
	}
	// else if (env.build === "tests") {
	// 	env.basePath = path.join(__dirname, "src", "test");
	// }
	else {
		env.basePath = __dirname;
	}
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
	wpConfig.context = env.basePath;
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
{   //
	// Disabled for this build - Using source-map-plugin - see webpack.plugin.js#sourcemaps
	// ann the plugins() function below
	//
	wpConfig.devtool = false;
};


//
// *************************************************************
// *** IGNORE WARNINGS                                             ***
// *************************************************************
//
/**
 * @method ignorewarnings
 * https://webpack.js.org/configuration/other-options/#ignorewarnings
 * @param {WebpackEnvironment} env Webpack build environment
 * @param {WebpackConfig} wpConfig Webpack config object
 */
const ignorewarnings = (env, wpConfig) =>
{
   if (!env.verbosity)
   {
		wpConfig.ignoreWarnings = [
			/Critical dependency\: the request of a dependency is an expression/,
			/Critical dependency\: require function is used in a way in which dependencies cannot be statically extracted/
			// {
			// 	module: /module2\.js\?[34]/, // A RegExp
			// }
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
		if (env.environment === "dev") {
			wpConfig.mode = "development";
		}
		else if (env.environment === "test" || env.build === "tests") {
			wpConfig.mode = "none";
		}
		else {
			wpConfig.mode = "production";
			// env.environment = "prod"; ~ "testprod"
		}
	}
	else
	{
		wpConfig.mode = argv.mode;
		if (argv.mode === "development") {
			env.environment = "dev";
		}
		else if (argv.mode === "none") {
			env.environment = "test";
		}
		else {
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
	if (env.build === "extension" || env.build === "browser")
	{
		wpConfig.optimization =
		{
			runtimeChunk: env.environment === "prod" || env.environment === "test" ? "single" : undefined,
			splitChunks: false
		};
		if (env.build !== "browser")
		{
			wpConfig.optimization.splitChunks = {
				cacheGroups: {
					vendor: {
						test: /node_modules/,
						name: "vendor",
						chunks: "all"
					}
				}
			};
		}
	}
	else {
		wpConfig.optimization = {};
	}
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
				"@env": path.resolve(__dirname, "src", "lib", "env", env.build === "browser" ? "browser" : "node"),
				":types": path.resolve(__dirname, "types")
			},
			fallback: env.build === "browser" ? { path: require.resolve("path-browserify"), os: require.resolve("os-browserify/browser") } : undefined,
			mainFields: env.build === "browser" ? [ "browser", "module", "main" ] : [ "module", "main" ],
			extensions: [ ".ts", ".tsx", ".js", ".jsx", ".json" ]
		};
	}
	else
	{
		wpConfig.resolve = {
			alias: {
				"@env": path.resolve(__dirname, "src", "lib", "env", "browser"),
				":types": path.resolve(__dirname, "types")
			},
			extensions: [ ".ts", ".tsx", ".js", ".jsx", ".json" ],
			modules: [ env.basePath, "node_modules" ],
		};
	}
};


//
// *************************************************************
// *** STATS                                                 ***
// *************************************************************
/**
 * @method stats
 * @param {WebpackEnvironment} env Webpack build environment
 * @param {WebpackConfig} wpConfig Webpack config object
 */
const stats = (env, wpConfig) =>
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
		colors: true,
		level: env.verbosity || "info" // enables logging required for problem matchers
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
	if (env.build === "webview"|| env.build === "browser") {
		wpConfig.target = "webworker";
	}
	else {
		wpConfig.target = "node";
	}
};
