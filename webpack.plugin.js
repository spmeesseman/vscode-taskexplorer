//@ts-check

const path = require("path");
const webpack = require("webpack");
const { renameSync } = require("fs");
const CopyPlugin = require("copy-webpack-plugin");
const HtmlPlugin = require("html-webpack-plugin");
const CspHtmlPlugin = require("csp-html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const ForkTsCheckerPlugin = require("fork-ts-checker-webpack-plugin");
const CircularDependencyPlugin = require("circular-dependency-plugin");
const ImageMinimizerPlugin = require("image-minimizer-webpack-plugin");
const { CleanWebpackPlugin: CleanPlugin } = require("clean-webpack-plugin");
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;

// const { IgnorePlugin } = require("webpack");
// const { validate } = require("schema-utils");
// const TerserPlugin = require("terser-webpack-plugin");
// const ShebangPlugin = require("webpack-shebang-plugin");
// const CopyWebpackPlugin = require("copy-webpack-plugin");
// const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
// const FilterWarningsPlugin = require("webpack-filter-warnings-plugin");

/** @typedef {import("./types/webpack").WebpackBuild} WebpackBuild */
/** @typedef {import("./types/webpack").WebpackConfig} WebpackConfig */
/** @typedef {import("./types/webpack").WebpackEnvironment} WebpackEnvironment */
/** @typedef {import("./types/webpack").WebpackPluginInstance} WebpackPluginInstance */


const webviewApps =
{
	home: "./home/home.ts",
	// licensePage: "./licensePage/licensePage.ts",
	// parsingReport: "./parsingReport/parsingReport.ts",
	// releaseNotes: "./releaseNotes/releaseNotes.ts",
	// taskCount: "./taskCount/taskCount.ts",
	// taskUsage: "./taskUsage/taskUsage.ts",
	// welcome: "./welcome/welcome.ts",
};


const wpPlugin =
{
	/**
	* @param {WebpackEnvironment} env
	* @param {WebpackConfig} wpConfig Webpack config object
	* @returns {WebpackPluginInstance}
	*/
	afterdone: (env, wpConfig) =>
	{
		// "AfterDonePlugin" MUST BE LAST IN THE PLUGINS ARRAY!!
		/** @type {WebpackPluginInstance | undefined} */
		let plugin;
		if (env.build === "webview")
		{
			plugin = {
				/** @param {import("webpack").Compiler} compiler Compiler */
				apply: (compiler) => {}
			};
		}
		else
		{
			plugin = {
				/** @param {import("webpack").Compiler} compiler Compiler */
				apply: (compiler) =>   
				{
					compiler.hooks.done.tap("AfterDonePlugin", () =>
					{
						try {
							renameSync(path.join(__dirname, "dist", "vendor.js.LICENSE.txt"), path.join(__dirname, "dist", "vendor.LICENSE"));
						} catch {}
					});
				}
			};
		}
		return plugin;
	},

	analyze:
	{
		/**
		* @param {WebpackEnvironment} env
		* @param {WebpackConfig} wpConfig Webpack config object
		* @returns {BundleAnalyzerPlugin}
		*/
		bundle: (env, wpConfig) =>
		{
			return new BundleAnalyzerPlugin({ analyzerPort: "auto" });
		},

		/**
		* @param {WebpackEnvironment} env
		* @param {WebpackConfig} wpConfig Webpack config object
		* @returns {CircularDependencyPlugin}
		*/
		circular: (env, wpConfig) =>
		{
			return new CircularDependencyPlugin(
			{
				cwd: __dirname,
				exclude: /node_modules/,
				failOnError: false,
				onDetected: function ({ module: _webpackModuleRecord, paths, compilation })
				{   // @ts-ignore
					compilation.warnings.push(new WebpackError(paths.join(" -> ")));
				}
			});
		}
	},

	banner: ()=>
	{
		// return new webpack.BannerPlugin("Copyright 2023 Scott Meesseman"),
	},

	/**
	 * @param {WebpackEnvironment} env
	 * @param {WebpackConfig} wpConfig Webpack config object
	 * @returns {CleanPlugin}
	 */
	clean: (env, wpConfig) =>
	{
		/** @type {CleanPlugin} */
		let plugin;
		if (env.build === "webview")
		{
			plugin = new CleanPlugin(
				wpConfig.mode === "production"
					? {
							cleanOnceBeforeBuildPatterns: [
								path.posix.join(__dirname.replace(/\\/g, "/"), "dist", "res", "page", "res", "**"),
							],
							dangerouslyAllowCleanPatternsOutsideProject: true,
							dry: false
					  }
					: undefined
			);
		}
		else
		{
			plugin = new CleanPlugin(
			{
				cleanOnceBeforeBuildPatterns: [ "!dist/lib/page/**" ]
			});
		}
		return plugin;
	},

	/**
	 * @param {WebpackEnvironment} env
	 * @param {WebpackConfig} wpConfig Webpack config object
	 * @returns {CopyPlugin}
	 */
	copy: (env, wpConfig) =>
	{
		/** @type {CopyPlugin} */
		let plugin;
		if (env.build === "webview")
		{
			plugin = new CopyPlugin({
				patterns: [
					// {
					// 	from: path.posix.join(basePath.replace(/\\/g, "/"), "media", "*.*"),
					// 	to: path.posix.join(__dirname.replace(/\\/g, "/"), "dist", "res"),
					// },
					{
						from: path.posix.join(
							__dirname.replace(/\\/g, "/"),
							"node_modules",
							"@vscode",
							"codicons",
							"dist",
							"codicon.ttf",
						),
						to: path.posix.join(__dirname.replace(/\\/g, "/"), "res", "page"),
					},
				],
			});
		}
		else
		{
			plugin = new CopyPlugin();
		}
		return plugin;
	},

	/**
	 * @param {WebpackEnvironment} env
	 * @param {WebpackConfig} wpConfig Webpack config object
	 * @returns {MiniCssExtractPlugin}
	 */
	cssextract: (env, wpConfig) =>
	{
		return new MiniCssExtractPlugin({ filename: "css/[name].css", });
	},

	/**
	 * @param { string } name
	 * @param {WebpackEnvironment} env
	 * @param {WebpackConfig} wpConfig Webpack config object
	 * @returns {HtmlPlugin}
	 */
	html: (name, env, wpConfig) =>
	{
		return new HtmlPlugin(
		{
			chunks: [ name ],
			filename: path.posix.join(__dirname, "res", "page", `${name}.html`),
			inject: true,
			inlineSource: wpConfig.mode === "production" ? ".css$" : undefined,
			scriptLoading: "module",
			template: path.posix.join(name, `${name}.html`),
			minify: wpConfig.mode !== "production" ? false :
			{
				removeComments: true,
				collapseWhitespace: true,
				removeRedundantAttributes: false,
				useShortDoctype: true,
				removeEmptyAttributes: true,
				removeStyleLinkTypeAttributes: true,
				keepClosingSlash: true,
				minifyCSS: true,
			}
		});
	},

	/**
	 * @param {WebpackEnvironment} env
	 * @param {WebpackConfig} wpConfig Webpack config object
	 * @returns {CspHtmlPlugin}
	 */
	htmlcsp: (env, wpConfig) =>
	{
		const plugin = new CspHtmlPlugin(
		{
			"default-src": "'none'",
			"img-src": ["#{cspSource}", "https:", "data:"],
			"script-src":
			wpConfig.mode !== 'production'
					? ["#{cspSource}", "'nonce-#{cspNonce}'", "'unsafe-eval'"]
					: ["#{cspSource}", "'nonce-#{cspNonce}'"],
			"style-src":
			wpConfig.mode === 'production'
					? ["#{cspSource}", "'nonce-#{cspNonce}'", "'unsafe-hashes'", "https://ka-p.fontawesome.com" ]
					: ["#{cspSource}", "'unsafe-hashes'", "'unsafe-inline'", "https://ka-p.fontawesome.com" ],
			"font-src": ["#{cspSource}", "https://ka-p.fontawesome.com" ],
		},
		{
			enabled: true,
			hashingMethod: 'sha256',
			hashEnabled: {
				'script-src': true,
				'style-src': wpConfig.mode === 'production',
			},
			nonceEnabled: {
				'script-src': true,
				'style-src': wpConfig.mode === 'production',
			},
		});
		//
		// Override the nonce creation so it can be dynamically generated at runtime
		// @ts-ignore
		plugin.createNonce = () => '#{cspNonce}';
		return plugin;
	},

	/**
	 * @param {WebpackEnvironment} env
	 * @param {WebpackConfig} wpConfig Webpack config object
	 * @returns {InlineChunkHtmlPlugin}
	 */
	htmlinlinechunks: (env, wpConfig) =>
	{
		return new InlineChunkHtmlPlugin(HtmlPlugin, wpConfig.mode === "production" ? ["\\.css$"] : []);
	},

	/**
	 * @param {WebpackEnvironment} env
	 * @param {WebpackConfig} wpConfig Webpack config object
	 * @returns {ImageMinimizerPlugin}
	 */
	imageminimizer: (env, wpConfig) =>
	{
		return new ImageMinimizerPlugin({
			deleteOriginalAssets: true,
			generator: [ imgConfig(env, wpConfig) ]
		});
	},

	/**
	 * @param {WebpackEnvironment} env
	 * @param {WebpackConfig} wpConfig Webpack config object
	 * @returns {webpack.optimize.LimitChunkCountPlugin}
	 */
	limitchunks: (env, wpConfig) =>
	{
		return new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 });
	},

	/**
	 * @param {WebpackEnvironment} env
	 * @param {WebpackConfig} wpConfig Webpack config object
	 * @returns {ForkTsCheckerPlugin}
	 */
	tscheck: (env, wpConfig) =>
	{
		/** @type {ForkTsCheckerPlugin} */
		let plugin;
		if (env.build === "webview")
		{
			plugin = new ForkTsCheckerPlugin(
			{
				async: false,
				// eslint: {
				// 	enabled: true,
				// 	files: path.join(basePath, "**", "*.ts?(x)"),
				// 	options: {
				// 		cache: true,
				// 		cacheLocation: path.join(__dirname, ".eslintcache", "webviews/"),
				// 		cacheStrategy: "content",
				// 		fix: mode !== "production",
				// 	},
				// },
				formatter: "basic",
				typescript: {
					configFile: path.join(env.basePath, "tsconfig.json"),
				}
			})
		}
		else
		{
			plugin = new ForkTsCheckerPlugin({});
			// plugin = new ForkTsCheckerPlugin({
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
			//  },
			// 	formatter: "basic",
			// 	typescript: {
			// 		configFile: path.join(__dirname, wpConfig.target === "webworker" ? "tsconfig.browser.json" : "tsconfig.json"),
			// 	}
			// })
		}
		return plugin;
	},

	/**
	 * @param {WebpackEnvironment} env
	 * @param {WebpackConfig} wpConfig Webpack config object
	 * @returns {HtmlPlugin[]}
	 */
	webviewapps: (env, wpConfig) =>
	{
		/** @type {HtmlPlugin[]} */
		const plugins = [];
		if (env.build === "webview")
		{
			Object.keys(webviewApps).forEach(k => plugins.push(wpPlugin.html(k, env, wpConfig)));
		}
		else
		{

		}
		return plugins;
	}
};


/**
 * @param {WebpackEnvironment} env
 * @param {WebpackConfig} wpConfig Webpack config object
 * @returns { ImageMinimizerPlugin.Generator<any> }
 */
const imgConfig = (env, wpConfig) =>
{
	/** @type ImageMinimizerPlugin.Generator<any> */
	// @ts-ignore
	return env.imageOpt ?
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
					method: wpConfig.mode === "production" ? 4 : 0,
				}
			]]
		}
	};
};

class InlineChunkHtmlPlugin
{
	constructor(htmlPlugin, patterns)
	{
		this.htmlPlugin = htmlPlugin;
		this.patterns = patterns;
	}

	getInlinedTag(publicPath, assets, tag)
	{
		if (
			(tag.tagName !== "script" || !(tag.attributes && tag.attributes.src)) &&
			(tag.tagName !== "link" || !(tag.attributes && tag.attributes.href))
		) {
			return tag;
		}

		let chunkName = tag.tagName === "link" ? tag.attributes.href : tag.attributes.src;
		if (publicPath) {
			chunkName = chunkName.replace(publicPath, "");
		}
		if (!this.patterns.some(pattern => chunkName.match(pattern))) {
			return tag;
		}

		const asset = assets[chunkName];
		if (asset == null) {
			return tag;
		}

		return { tagName: tag.tagName === "link" ? "style" : tag.tagName, innerHTML: asset.source(), closeTag: true };
	}

	apply(compiler)
	{
		let publicPath = compiler.options.output.publicPath || "";
		if (publicPath && !publicPath.endsWith("/")) {
			publicPath += "/";
		}

		compiler.hooks.compilation.tap("InlineChunkHtmlPlugin", compilation => {
			const getInlinedTagFn = tag => this.getInlinedTag(publicPath, compilation.assets, tag);
			const sortFn = (a, b) => (a.tagName === "script" ? 1 : -1) - (b.tagName === "script" ? 1 : -1);
			this.htmlPlugin.getHooks(compilation).alterAssetTagGroups.tap("InlineChunkHtmlPlugin", assets => {
				assets.headTags = assets.headTags.map(getInlinedTagFn).sort(sortFn);
				assets.bodyTags = assets.bodyTags.map(getInlinedTagFn).sort(sortFn);
			});
		});
	}
}

module.exports = {
	wpPlugin, webviewApps
}
