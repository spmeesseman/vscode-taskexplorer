//@ts-check

// const fs = require("fs");
const path = require("path");
const { renameSync } = require("fs");
// const { IgnorePlugin } = require("webpack");
// const ShebangPlugin = require("webpack-shebang-plugin");
// const CopyWebpackPlugin = require("copy-webpack-plugin");
// const FilterWarningsPlugin = require("webpack-filter-warnings-plugin");
// const TerserPlugin = require("terser-webpack-plugin");
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
const CircularDependencyPlugin = require("circular-dependency-plugin");
const CspHtmlPlugin = require("csp-html-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const ImageMinimizerPlugin = require("image-minimizer-webpack-plugin");

/**
 * @typedef {Object} WebpackBuildEnv
 * @property {Boolean} clean If set,will clean the output directory before build
 * @property {String} environment The environment to compile for, one of `prod`, `dev`, or `test`,
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
	if (!env) {
		env = { clean: false, environment: "prod" };
	}

	// @ts-ignore
	if (env.clean === "true") {
		env.clean = true;
	}

	// @ts-ignore
	if (!env.target) {
		// @ts-ignore
		env.target = "node"; // or "webworker"
	}

	/**@type {WebpackConfig}*/
	const wpConfig =  // Base Webpack configuration object
	{   // @ts-ignore
		target: env.target,
	};

	entryPoints(env, wpConfig);   // Entry points for built output
	externals(wpConfig)           // External modules
	optimization(env, wpConfig);  // Build optimization
	mode(env, wpConfig);
	output(env, wpConfig);        // Output specifications
	plugins(env, wpConfig);       // Webpack plugins
	resolve(wpConfig);            // Resolve config
	rules(wpConfig);              // Loaders & other build rules
	stats(wpConfig);              // Stats

	return wpConfig;
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
 * @param {WebpackBuildEnv} env Webpack build environment
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
 * @param {WebpackBuildEnv} env Webpack build environment
 * @param {WebpackConfig} wpConfig Webpack config object
 */
// @ts-ignore
const entryPoints = (env, wpConfig) =>
{
	wpConfig.entry = {
		"extension": {
			import: "./src/extension.ts",
			filename: "extension.js"
		}
	};
};


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
//
/**
 * Adds library mode webpack config `output` object.
 *
 * @method
 * @private
 * @param {WebpackBuildEnv} env Webpack build environment
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
//
/**
 * @method
 * @param {WebpackConfig} wpConfig Webpack config object
 */
const minification = (wpConfig) =>
{   //
	// For production build, customize the minify stage
	//
	if (wpConfig.mode === "production")
	{   /*
		Object.assign(wpConfig.optimization,
		{
			minimize: true,
			minimizer: [
				new TerserPlugin({
					extractComments: false,
					parallel: true,
					terserOptions: {
						ecma: undefined,
						parse: {},
						compress: true,
						mangle: true,   // Default `false`
						module: false,
						sourceMap: false,
						// Deprecated
						output: null,
						format: {},
						// format: {       // Default {}
						// 	comments: false, // default "some"
						// 	shebang: true
						// },
						// toplevel (default false) - set to true to enable top level variable
						// and function name mangling and to drop unused variables and functions.
						toplevel: false,
						nameCache: null,
						ie8: false,
						keep_classnames: undefined,
						// pass true to prevent discarding or mangling of function names.
						keep_fnames: false,
						safari10: false,
					}
				})
			]
		});*/
	}
};


//
// *************************************************************
// *** MODE                                                  ***
// *************************************************************
//
/**
 * @method
 * @param {WebpackBuildEnv} env Webpack build environment
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
//
/**
 * @method
 * @param {WebpackBuildEnv} env Webpack build environment
 * @param {WebpackConfig} wpConfig Webpack config object
 */
const optimization = (env, wpConfig) =>
{
	wpConfig.optimization =
	{
		runtimeChunk: env.environment !== "dev" ? "single" : undefined,
		splitChunks: {
			cacheGroups: {
				vendor: {
					test: /[\\/]node_modules[\\/]((?!(node-windows)).*)[\\/]/,
					name: "vendor",
					chunks: "all"
				}
			}
		}
	};
	minification(wpConfig);  // Minification / Terser plugin options
};


//
// *************************************************************
// *** OUTPUT                                                ***
// *************************************************************
//
/**
 * @method
 * @param {WebpackBuildEnv} env Webpack build environment
 * @param {WebpackConfig} wpConfig Webpack config object
 */
const output = (env, wpConfig) =>
{
	wpConfig.output = {
		clean: env.clean === true,
		path: path.resolve(__dirname, "dist"),
		filename: "[name].js",
		libraryTarget: "commonjs2"
	};
	devTool(env, wpConfig);
	library(env, wpConfig);
};


//
// *************************************************************
// *** PLUGINS                                               ***
// *************************************************************
//
/**
 * @method
 * @param {WebpackBuildEnv} env Webpack build environment
 * @param {WebpackConfig} wpConfig Webpack config object
 */
const plugins = (env, wpConfig) =>
{   // @ts-ignore
	const imageGeneratorConfig = getImageMinimizerConfig(wpConfig.mode, env);
	wpConfig.plugins = [];

	if (wpConfig.mode === "production")
	{
		wpConfig.plugins = [ // add AfterDone plugin at the end of the plugins array
		{
			/** @param {PluginInstance} compiler Compiler */
			apply: (compiler) =>
			{
				compiler.hooks.done.tap("AfterDonePlugin", () =>
				{
					try {
						renameSync(path.join(__dirname, "dist", "vendor.js.LICENSE.txt"), path.join(__dirname, "dist", "vendor.LICENSE"));
					} catch {}
				});
			}
		},
		new ImageMinimizerPlugin({
			deleteOriginalAssets: true,
			generator: [imageGeneratorConfig],
		}),
		new CssMinimizerPlugin({
			minimizerOptions: {
				preset: [
					"cssnano-preset-advanced",
					{ discardUnused: false, mergeIdents: false, reduceIdents: false },
				],
			},
		})];
		// @ts-ignore
		if (env.analyze === "true")
		{
			wpConfig.plugins.push(new BundleAnalyzerPlugin({ analyzerPort: "auto" }));

			wpConfig.plugins.push(
				new CircularDependencyPlugin(
				{
					cwd: __dirname,
					exclude: /node_modules/,
					failOnError: false,
					onDetected: function ({ module: _webpackModuleRecord, paths, compilation })
					{   // @ts-ignore
						compilation.warnings.push(new WebpackError(paths.join(" -> ")));
					},
				}),
			);
		}
	}
};


//
// *************************************************************
// *** RESOLVE                                               ***
// *************************************************************
//
/**
 * @method
 * @param {WebpackConfig} wpConfig Webpack config object
 */
const resolve = (wpConfig) =>
{
	wpConfig.resolve =
	{   
		extensions: [ ".ts", ".js" ],
		// mainFields: [ "browser", "module", "main" ]
	};
};


//
// *************************************************************
// *** RULES                                                 ***
// *************************************************************
//
/**
 * @method
 * @param {WebpackConfig} wpConfig Webpack config object
 */
const rules = (wpConfig) =>
{
	wpConfig.module = {
		rules: [{
			test: /\.ts$/,
			exclude: [/node_modules/, /test/],
			use: [{
				loader: "ts-loader"
			}]
		},
		// {
		// 	test: /\.mjs$/,
		// 	resolve: { mainFields: [ "browser", "module", "main" ] }
		// },
		// {
		// 	exclude: [ /.(js|jsx|mjs|html|json)$/],
		// 	loader: "file-loader",
		// 	options: {
		// 		// name: config.mediaChunkFileName
		// 	},
		// }
		]
	};
};


//
// *************************************************************
// *** CSP                                                   ***
// *************************************************************
//
/**
 * @param { "production" | "development" | "none" } mode
 * @param {{ analyzeBundle?: boolean; analyzeDeps?: boolean; esbuild?: boolean; useSharpForImageOptimization?: boolean } | undefined } env
 * @returns { CspHtmlPlugin }
 */
// @ts-ignore
const getCspHtmlPlugin = (mode, env) =>
{
	const cspPlugin = new CspHtmlPlugin(
	{
		'default-src': "'none'",
		'img-src': ['#{cspSource}', 'https:', 'data:'],
		'script-src':
			mode !== 'production'
				? ['#{cspSource}', "'nonce-#{cspNonce}'", "'unsafe-eval'"]
				: ['#{cspSource}', "'nonce-#{cspNonce}'"],
		'style-src':
			mode === 'production'
				? ['#{cspSource}', "'nonce-#{cspNonce}'", "'unsafe-hashes'"]
				: ['#{cspSource}', "'unsafe-hashes'", "'unsafe-inline'"],
		'font-src': ['#{cspSource}'],
	},
	{
		enabled: true,
		hashingMethod: 'sha256',
		hashEnabled: {
			'script-src': true,
			'style-src': mode === 'production',
		},
		nonceEnabled: {
			'script-src': true,
			'style-src': mode === 'production',
		},
	});
	// Override the nonce creation so we can dynamically generate them at runtime
	// @ts-ignore
	cspPlugin.createNonce = () => '#{cspNonce}';
	return cspPlugin;
};


//
// *************************************************************
// *** IMAGES                                                ***
// *************************************************************
//
/**
 * @param {'production'|'development'|'none'|'tests'} mode
 * @param {{ analyzeBundle?: boolean; analyzeDeps?: boolean; esbuild?: boolean; useSharpForImages?: boolean } | undefined } env
 * @returns { ImageMinimizerPlugin.Generator<any> }
 */
const getImageMinimizerConfig = (mode, env) =>
{
	/** @type ImageMinimizerPlugin.Generator<any> */
	// @ts-ignore
	return env.useSharpForImages ?
	{
		type: "asset",
		implementation: ImageMinimizerPlugin.sharpGenerate,
		options: {
			encodeOptions: {
				webp: {
					lossless: true,
				},
			},
		},
	} :
	{
		type: "asset",
		implementation: ImageMinimizerPlugin.imageminGenerate,
		options: {
			plugins: [
			[
				"imagemin-webp",
				{
					lossless: true,
					nearLossless: 0,
					quality: 100,
					method: mode === "production" ? 4 : 0,
				},
			]]
		}
	};
};


//
// *************************************************************
// *** STATS                                                 ***
// *************************************************************
//
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
};
