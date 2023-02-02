//@ts-check

// const fs = require("fs");
const path = require("path");
const JSON5 = require("json5");
const { renameSync } = require("fs");
const { validate } = require("schema-utils");
const { spawnSync } = require("child_process");
// const { IgnorePlugin } = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");
const { WebpackError, webpack, optimize } = require("webpack");
// const ShebangPlugin = require("webpack-shebang-plugin");
// const CopyWebpackPlugin = require("copy-webpack-plugin");
// const FilterWarningsPlugin = require("webpack-filter-warnings-plugin");
// const TerserPlugin = require("terser-webpack-plugin");
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
const CircularDependencyPlugin = require("circular-dependency-plugin");
const { CleanWebpackPlugin: CleanPlugin } = require("clean-webpack-plugin");
const CspHtmlPlugin = require("csp-html-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const esbuild = require("esbuild");
const ForkTsCheckerPlugin = require("fork-ts-checker-webpack-plugin");
const HtmlPlugin = require("html-webpack-plugin");
const ImageMinimizerPlugin = require("image-minimizer-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

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
 * @param {WebpackBuildEnv|any} env Environment variable containing runtime options passed
 * to webpack on the command line (e.g. `webpack --env environment=test --env clean=true`).
 * @returns {WebpackConfig}
 */
module.exports = (env) =>
{
	/**@type {WebpackConfig}*/const wpConfig =  {};

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

	entryPoints(env, wpConfig);   // Entry points for built output
	externals(wpConfig)           // External modules
	optimization(env, wpConfig);  // Build optimization
	mode(env, wpConfig);          // Mode i.e. 'production', 'development', 'none'
	output(env, wpConfig);        // Output specifications
	plugins(env, wpConfig);       // Webpack plugins
	resolve(wpConfig);            // Resolve config
	rules(env, wpConfig);         // Loaders & build rules
	stats(wpConfig);              // Stats i.e. console output & verbosity
	target(env,wpConfig);         // Target i.e. 'node', 'webworker', 'tests'

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
		// be webpack'ed, -> https://webpack.js.org/configuration/externals/
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
		/*
			minimizer: [
				new TerserPlugin(
				env.esbuild ?
				{
					minify: TerserPlugin.esbuildMinify,
					terserOptions: {
						// @ts-ignore
						drop: ["debugger"],
						format: "cjs",
						minify: true,
						treeShaking: true,
						// Keep the class names otherwise @log won"t provide a useful name
						keepNames: true,
						target: "es2020",
					}
				} :
				{
					extractComments: false,
					parallel: true,
					terserOptions: {
						compress: {
							drop_debugger: true,
						},
						ecma: 2020,
						// Keep the class names otherwise @log won"t provide a useful name
						keep_classnames: true,
						module: true,
					},
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
		path: wpConfig.target === "webworker" ? path.join(__dirname, "dist", "browser") : path.join(__dirname, "dist"),
		libraryTarget: "commonjs2",
		filename: "[name].js",
		chunkFilename: "feature-[name].js",
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
{
	// @ts-ignore
	// const imageGeneratorConfig = getImageMinimizerConfig(wpConfig.mode, env);

	wpConfig.plugins = [];

	if (wpConfig.mode === "production")
	{
		wpConfig.plugins = [
			// new CleanPlugin(
			// {
			// 	cleanOnceBeforeBuildPatterns: [ "!dist/lib/page/**" ]
			// }),
			{
				/** @param {PluginInstance} compiler Compiler */
				apply: (compiler) =>   // add AfterDone plugin at the end of the plugins array
				{
					compiler.hooks.done.tap("AfterDonePlugin", () =>
					{
						try {
							renameSync(path.join(__dirname, "dist", "vendor.js.LICENSE.txt"), path.join(__dirname, "dist", "vendor.LICENSE"));
						} catch {}
					});
				}
			},
			// new ForkTsCheckerPlugin({
			// 	async: false,
			// 	// @ts-ignore
			// 	eslint: {
			// 		enabled: true,
			// 		files: "src/**/*.ts?(x)",
			// 		options: {
			// 			cache: true,
			// 			cacheLocation: path.join(__dirname, ".eslintcache/", wpConfig.target === "webworker" ? "browser/" : ""),
			// 			cacheStrategy: "content",
			// 			fix: wpConfig.mode !== "production",
			// 			overrideConfigFile: path.join(
			// 				__dirname,
			// 				wpConfig.target === "webworker" ? ".eslintrc.browser.json" : ".eslintrc.json",
			// 			),
			// 		},
			// 	},
			// 	formatter: "basic",
			// 	typescript: {
			// 		configFile: path.join(__dirname, wpConfig.target === "webworker" ? "tsconfig.browser.json" : "tsconfig.json"),
			// 	}
			// }),
			// new ImageMinimizerPlugin({
			// 	deleteOriginalAssets: true,
			// 	generator: [imageGeneratorConfig],
			// }),
			// new CssMinimizerPlugin({
			// 	minimizerOptions: {
			// 		preset: [
			// 			"cssnano-preset-advanced",
			// 			{ discardUnused: false, mergeIdents: false, reduceIdents: false },
			// 		],
			// 	},
			// })
		];
	}

	if (wpConfig.target === "webworker") {
		wpConfig.plugins.push(new optimize.LimitChunkCountPlugin({ maxChunks: 1 }));
	}

	// @ts-ignore
	if (env.analyze === "true")
	{
		wpConfig.plugins.push(
			/** @type {PluginInstance} */
			(new BundleAnalyzerPlugin({ analyzerPort: "auto" }))
		);

		wpConfig.plugins.push(
			/** @type {PluginInstance} */(new CircularDependencyPlugin(
			{
				cwd: __dirname,
				exclude: /node_modules/,
				failOnError: false,
				onDetected: function ({ module: _webpackModuleRecord, paths, compilation })
				{   // @ts-ignore
					compilation.warnings.push(new WebpackError(paths.join(" -> ")));
				},
			}))
		);
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
		extensions: [ ".ts", ".js" ]
		// alias: {
		// 	// @ts-ignore
		// 	"@env": path.resolve(__dirname, "src", "env", wpConfig.target === "webworker" ? "browser" : wpConfig.target),
		// 	// This dependency is very large, and isn"t needed for our use-case
		// 	tr46: path.resolve(__dirname, "patches", "tr46.js"),
		// },
		// fallback: wpConfig.target === "webworker" ?
		// 			{ path: require.resolve("path-browserify"), os: require.resolve("os-browserify/browser") } :
		// 			undefined,
		// mainFields: wpConfig.target === "webworker" ? [ "browser", "module", "main" ] :
		// 											  [ "module", "main" ],
		// extensions: [
		// 	".ts", ".tsx", ".js", ".jsx", ".json"
		// ]
	};
};


//
// *************************************************************
// *** RULES                                                 ***
// *************************************************************
//
/**
 * @method
 * @param {WebpackBuildEnv} env Webpack build environment
 * @param {WebpackConfig} wpConfig Webpack config object
 */
const rules = (env, wpConfig) =>
{
	wpConfig.module = {
		rules: [
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
							wpConfig.target === "webworker" ? "tsconfig.browser.json" : "tsconfig.json",
						),
					),
				},
			} :
			{
				loader: "ts-loader",
				options: {
					configFile: path.join(
						__dirname,
						wpConfig.target === "webworker" ? "tsconfig.browser.json" : "tsconfig.json",
					),
					experimentalWatchApi: true,
					transpileOnly: true
				},
			}
		}]
	};
};


// //
// // *************************************************************
// // *** CSP                                                   ***
// // *************************************************************
// //
// /**
//  * @param { "production" | "development" | "none" } mode
//  * @param {{ analyzeBundle?: boolean; analyzeDeps?: boolean; esbuild?: boolean; useSharpForImageOptimization?: boolean } | undefined } env
//  * @returns { CspHtmlPlugin }
//  */
// // @ts-ignore
// const getCspHtmlPlugin = (mode, env) =>
// {
// 	const cspPlugin = new CspHtmlPlugin(
// 	{
// 		'default-src': "'none'",
// 		'img-src': ['#{cspSource}', 'https:', 'data:'],
// 		'script-src':
// 			mode !== 'production'
// 				? ['#{cspSource}', "'nonce-#{cspNonce}'", "'unsafe-eval'"]
// 				: ['#{cspSource}', "'nonce-#{cspNonce}'"],
// 		'style-src':
// 			mode === 'production'
// 				? ['#{cspSource}', "'nonce-#{cspNonce}'", "'unsafe-hashes'"]
// 				: ['#{cspSource}', "'unsafe-hashes'", "'unsafe-inline'"],
// 		'font-src': ['#{cspSource}'],
// 	},
// 	{
// 		enabled: true,
// 		hashingMethod: 'sha256',
// 		hashEnabled: {
// 			'script-src': true,
// 			'style-src': mode === 'production',
// 		},
// 		nonceEnabled: {
// 			'script-src': true,
// 			'style-src': mode === 'production',
// 		},
// 	});
// 	// Override the nonce creation so we can dynamically generate them at runtime
// 	// @ts-ignore
// 	cspPlugin.createNonce = () => '#{cspNonce}';
// 	return cspPlugin;
// };
// 
// 
// //
// // *************************************************************
// // *** IMAGES                                                ***
// // *************************************************************
// //
// /**
//  * @param {"production"|"development"|"none"|"tests"} mode
//  * @param {{ analyzeBundle?: boolean; analyzeDeps?: boolean; esbuild?: boolean; useSharpForImages?: boolean } | undefined } env
//  * @returns { ImageMinimizerPlugin.Generator<any> }
//  */
// const getImageMinimizerConfig = (mode, env) =>
// {
// 	/** @type ImageMinimizerPlugin.Generator<any> */
// 	// @ts-ignore
// 	return env.useSharpForImages ?
// 	{
// 		type: "asset",
// 		implementation: ImageMinimizerPlugin.sharpGenerate,
// 		options: {
// 			encodeOptions: {
// 				webp: {
// 					lossless: true,
// 				},
// 			},
// 		},
// 	} :
// 	{
// 		type: "asset",
// 		implementation: ImageMinimizerPlugin.imageminGenerate,
// 		options: {
// 			plugins: [
// 			[
// 				"imagemin-webp",
// 				{
// 					lossless: true,
// 					nearLossless: 0,
// 					quality: 100,
// 					method: mode === "production" ? 4 : 0,
// 				},
// 			]]
// 		}
// 	};
// };


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

	wpConfig.infrastructureLogging = {
		level: "log", // enables logging required for problem matchers
	};
};


//
// *************************************************************
// *** TARGET                                               ***
// *************************************************************
//
/**
 * @method
 * @param {WebpackBuildEnv|any} env Webpack build environment
 * @param {WebpackConfig} wpConfig Webpack config object
 */
const target = (env, wpConfig) =>
{
	wpConfig.target = env.target || "node";
};


//
// *************************************************************
// *** HELPER FUNCTIONS AND FUTURE TODOS                     ***
// *************************************************************
//


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
// /**
//  * @param { string } name
//  * @param { boolean } plus
//  * @param { 'production' | 'development' | 'none' } mode
//  * @param {{ analyzeBundle?: boolean; analyzeDeps?: boolean; esbuild?: boolean; useSharpForImageOptimization?: boolean } | undefined } env
//  * @returns { HtmlPlugin }
//  */
// function getHtmlPlugin(name, plus, mode, env) {
// 	return new HtmlPlugin({
// 		template: plus ? path.join('plus', name, `${name}.html`) : path.join(name, `${name}.html`),
// 		chunks: [name],
// 		filename: path.join(__dirname, 'dist', 'webviews', `${name}.html`),
// 		inject: true,
// 		scriptLoading: 'module',
// 		inlineSource: mode === 'production' ? '.css$' : undefined,
// 		minify:
// 			mode === 'production'
// 				? {
// 						removeComments: true,
// 						collapseWhitespace: true,
// 						removeRedundantAttributes: false,
// 						useShortDoctype: true,
// 						removeEmptyAttributes: true,
// 						removeStyleLinkTypeAttributes: true,
// 						keepClosingSlash: true,
// 						minifyCSS: true,
// 				  }
// 				: false,
// 	});
// }
// 
// class InlineChunkHtmlPlugin
// {
// 	constructor(htmlPlugin, patterns)
// 	{
// 		this.htmlPlugin = htmlPlugin;
// 		this.patterns = patterns;
// 	}
// 
// 	getInlinedTag(publicPath, assets, tag)
// 	{
// 		if (
// 			(tag.tagName !== 'script' || !(tag.attributes && tag.attributes.src)) &&
// 			(tag.tagName !== 'link' || !(tag.attributes && tag.attributes.href))
// 		) {
// 			return tag;
// 		}
// 
// 		let chunkName = tag.tagName === 'link' ? tag.attributes.href : tag.attributes.src;
// 		if (publicPath) {
// 			chunkName = chunkName.replace(publicPath, '');
// 		}
// 		if (!this.patterns.some(pattern => chunkName.match(pattern))) {
// 			return tag;
// 		}
// 
// 		const asset = assets[chunkName];
// 		if (asset == null) {
// 			return tag;
// 		}
// 
// 		return { tagName: tag.tagName === 'link' ? 'style' : tag.tagName, innerHTML: asset.source(), closeTag: true };
// 	}
// 
// 	apply(compiler)
// 	{
// 		let publicPath = compiler.options.output.publicPath || '';
// 		if (publicPath && !publicPath.endsWith('/')) {
// 			publicPath += '/';
// 		}
// 
// 		compiler.hooks.compilation.tap('InlineChunkHtmlPlugin', compilation => {
// 			const getInlinedTagFn = tag => this.getInlinedTag(publicPath, compilation.assets, tag);
// 			const sortFn = (a, b) => (a.tagName === 'script' ? 1 : -1) - (b.tagName === 'script' ? 1 : -1);
// 			this.htmlPlugin.getHooks(compilation).alterAssetTagGroups.tap('InlineChunkHtmlPlugin', assets => {
// 				assets.headTags = assets.headTags.map(getInlinedTagFn).sort(sortFn);
// 				assets.bodyTags = assets.bodyTags.map(getInlinedTagFn).sort(sortFn);
// 			});
// 		});
// 	}
// }
// 
// 
// /**
//  * @param { 'production' | 'development' | 'none' } mode
//  * @param {{ analyzeBundle?: boolean; analyzeDeps?: boolean; esbuild?: boolean; useSharpForImageOptimization?: boolean } } env
//  * @returns { WebpackConfig }
//  */
// function getWebviewsConfig(mode, env)
// {
// 	const basePath = path.join(__dirname, 'src', 'webviews', 'apps');
// 
// 	/** @type WebpackConfig['plugins'] | any */
// 	const plugins = [
// 		new CleanPlugin(
// 			mode === 'production'
// 				? {
// 						cleanOnceBeforeBuildPatterns: [
// 							path.posix.join(__dirname.replace(/\\/g, '/'), 'dist', 'webviews', 'media', '**'),
// 						],
// 						dangerouslyAllowCleanPatternsOutsideProject: true,
// 						dry: false,
// 				  }
// 				: undefined,
// 		),
// 		new ForkTsCheckerPlugin({
// 			async: false,
// 			// @ts-ignore
// 			eslint: {
// 				enabled: true,
// 				files: path.join(basePath, '**', '*.ts?(x)'),
// 				options: {
// 					cache: true,
// 					cacheLocation: path.join(__dirname, '.eslintcache', 'webviews/'),
// 					cacheStrategy: 'content',
// 					fix: mode !== 'production',
// 				},
// 			},
// 			formatter: 'basic',
// 			typescript: {
// 				configFile: path.join(basePath, 'tsconfig.json'),
// 			},
// 		}),
// 		new MiniCssExtractPlugin({ filename: '[name].css' }),
// 		getHtmlPlugin('commitDetails', false, mode, env),
// 		getHtmlPlugin('graph', true, mode, env),
// 		getHtmlPlugin('home', false, mode, env),
// 		getHtmlPlugin('rebase', false, mode, env),
// 		getHtmlPlugin('settings', false, mode, env),
// 		getHtmlPlugin('timeline', true, mode, env),
// 		getHtmlPlugin('welcome', false, mode, env),
// 		getCspHtmlPlugin(mode, env),
// 		new InlineChunkHtmlPlugin(HtmlPlugin, mode === 'production' ? ['\\.css$'] : []),
// 		new CopyPlugin({
// 			patterns: [
// 				{
// 					from: path.posix.join(basePath.replace(/\\/g, '/'), 'media', '*.*'),
// 					to: path.posix.join(__dirname.replace(/\\/g, '/'), 'dist', 'webviews'),
// 				},
// 				{
// 					from: path.posix.join(
// 						__dirname.replace(/\\/g, '/'),
// 						'node_modules',
// 						'@vscode',
// 						'codicons',
// 						'dist',
// 						'codicon.ttf',
// 					),
// 					to: path.posix.join(__dirname.replace(/\\/g, '/'), 'dist', 'webviews'),
// 				},
// 			],
// 		}),
// 	];
// 
// 	const imageGeneratorConfig = getImageMinimizerConfig(mode, env);
// 
// 	if (mode !== 'production') {
// 		plugins.push(
// 			new ImageMinimizerPlugin({
// 				deleteOriginalAssets: true,
// 				generator: [imageGeneratorConfig],
// 			}),
// 		);
// 	}
// 
// 	return {
// 		name: 'webviews',
// 		context: basePath,
// 		entry: {
// 			commitDetails: './commitDetails/commitDetails.ts',
// 			graph: './plus/graph/graph.tsx',
// 			home: './home/home.ts',
// 			rebase: './rebase/rebase.ts',
// 			settings: './settings/settings.ts',
// 			timeline: './plus/timeline/timeline.ts',
// 			welcome: './welcome/welcome.ts',
// 		},
// 		mode: mode,
// 		target: 'web',
// 		devtool: mode === 'production' ? false : 'source-map',
// 		output: {
// 			filename: '[name].js',
// 			path: path.join(__dirname, 'dist', 'webviews'),
// 			publicPath: '#{root}/dist/webviews/',
// 		},
// 		optimization: {
// 			minimizer:
// 				mode === 'production' ? [
// 					new TerserPlugin(
// 						env.esbuild
// 							? {
// 									minify: TerserPlugin.esbuildMinify,
// 									terserOptions: {
// 										// @ts-ignore
// 										drop: ['debugger', 'console'],
// 										// @ts-ignore
// 										format: 'esm',
// 										minify: true,
// 										treeShaking: true,
// 										// // Keep the class names otherwise @log won't provide a useful name
// 										// keepNames: true,
// 										target: 'es2020',
// 									},
// 								}
// 							: {
// 									extractComments: false,
// 									parallel: true,
// 									// @ts-ignore
// 									terserOptions: {
// 										compress: {
// 											drop_debugger: true,
// 											drop_console: true,
// 										},
// 										ecma: 2020,
// 										// // Keep the class names otherwise @log won't provide a useful name
// 										// keep_classnames: true,
// 										module: true,
// 									},
// 								},
// 					),
// 					new ImageMinimizerPlugin({
// 						deleteOriginalAssets: true,
// 						generator: [imageGeneratorConfig],
// 					}),
// 					new CssMinimizerPlugin({
// 						minimizerOptions: {
// 							preset: [
// 								'cssnano-preset-advanced',
// 								{ discardUnused: false, mergeIdents: false, reduceIdents: false },
// 							],
// 						},
// 					}),
// 				]
// 			: [],
// 		},
// 		module: {
// 			rules: [
// 				{
// 					test: /\.m?js/,
// 					resolve: { fullySpecified: false },
// 				},
// 				{
// 					exclude: /\.d\.ts$/,
// 					include: path.join(__dirname, 'src'),
// 					test: /\.tsx?$/,
// 					use: env.esbuild
// 						? {
// 								loader: 'esbuild-loader',
// 								options: {
// 									implementation: esbuild,
// 									loader: 'tsx',
// 									target: 'es2020',
// 									tsconfigRaw: resolveTSConfig(path.join(basePath, 'tsconfig.json')),
// 								},
// 						  }
// 						: {
// 								loader: 'ts-loader',
// 								options: {
// 									configFile: path.join(basePath, 'tsconfig.json'),
// 									experimentalWatchApi: true,
// 									transpileOnly: true,
// 								},
// 						  },
// 				},
// 				{
// 					test: /\.scss$/,
// 					use: [
// 						{
// 							loader: MiniCssExtractPlugin.loader,
// 						},
// 						{
// 							loader: 'css-loader',
// 							options: {
// 								sourceMap: mode !== 'production',
// 								url: false,
// 							},
// 						},
// 						{
// 							loader: 'sass-loader',
// 							options: {
// 								sourceMap: mode !== 'production',
// 							},
// 						},
// 					],
// 					exclude: /node_modules/,
// 				},
// 			],
// 		},
// 		resolve: {
// 			alias: {
// 				'@env': path.resolve(__dirname, 'src', 'env', 'browser'),
// 			},
// 			extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
// 			modules: [basePath, 'node_modules'],
// 		},
// 		plugins: plugins,
// 		infrastructureLogging: {
// 			level: 'log', // enables logging required for problem matchers
// 		},
// 		stats: {
// 			preset: 'errors-warnings',
// 			assets: true,
// 			colors: true,
// 			env: true,
// 			errorsCount: true,
// 			warningsCount: true,
// 			timings: true,
// 		},
// 	};
// }
