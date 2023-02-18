//@ts-check

const fs = require("fs");
const path = require("path");
const webpack = require("webpack");
const { renameSync } = require("fs");
const { spawnSync } = require("child_process");
const CopyPlugin = require("copy-webpack-plugin");
const HtmlPlugin = require("html-webpack-plugin");
const CspHtmlPlugin = require("csp-html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const ForkTsCheckerPlugin = require("fork-ts-checker-webpack-plugin");
const CircularDependencyPlugin = require("circular-dependency-plugin");
const ImageMinimizerPlugin = require("image-minimizer-webpack-plugin");
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;

// const { IgnorePlugin } = require("webpack");
// const TerserPlugin = require("terser-webpack-plugin");
// const ShebangPlugin = require("webpack-shebang-plugin");
// const CopyWebpackPlugin = require("copy-webpack-plugin");
// const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
// const FilterWarningsPlugin = require("webpack-filter-warnings-plugin");

/** @typedef {import("./types/webpack").WebpackBuild} WebpackBuild */
/** @typedef {import("./types/webpack").WebpackConfig} WebpackConfig */
/** @typedef {import("./types/webpack").WebpackEnvironment} WebpackEnvironment */
/** @typedef {import("./types/webpack").WebpackPluginInstance} WebpackPluginInstance */


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
		if (env.build !== "webview" && wpConfig.mode === "production")
		{
			plugin =
			{   /** @param {import("webpack").Compiler} compiler Compiler */
				apply: (compiler) =>
				{
					compiler.hooks.done.tap("AfterDonePlugin", () =>
					{
						try {
							renameSync(path.join(__dirname, "dist", "vendor.js.LICENSE.txt"), path.join(__dirname, "dist", "vendor.LICENSE"));
							renameSync(path.join(__dirname, "dist", "extension.js.LICENSE.txt"), path.join(__dirname, "dist", "extension.LICENSE"));
						} catch {}
					});
				}
			};
		}
		if (env.build === "extension" && env.environment.startsWith("test"))
		{
			const babel = [
				"babel", "./src/test", "--out-dir", "./dist/test", "--extensions", ".ts",
				"--presets=@babel/preset-env,@babel/preset-typescript",
			];
			spawnSync("npx", babel,
			{
				cwd: __dirname,
				encoding: "utf8",
				shell: true
			});
		}
		if (!plugin) {
			plugin = /** @type {webpack.BannerPlugin} */(/** @type {unknown} */(undefined));
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
			/** @type {BundleAnalyzerPlugin | any  | undefined} */
			let plugin;
			if (env.analyze === true)
			{
				plugin = new BundleAnalyzerPlugin({ analyzerPort: "auto" });
			}
			if (!plugin) {
				plugin = /** @type {BundleAnalyzerPlugin} */(/** @type {unknown} */(undefined));
			}
			return plugin;
		},

		/**
		* @param {WebpackEnvironment} env
		* @param {WebpackConfig} wpConfig Webpack config object
		* @returns {CircularDependencyPlugin}
		*/
		circular: (env, wpConfig) =>
		{
			/** @type {CircularDependencyPlugin | undefined} */
			let plugin;
			if (env.analyze === true)
			{
				plugin = new CircularDependencyPlugin(
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
			if (!plugin) {
				plugin = /** @type {CircularDependencyPlugin} */(/** @type {unknown} */(undefined));
			}
			return plugin;
		}
	},


	/**
	 * @param {WebpackEnvironment} env
	 * @param {WebpackConfig} wpConfig Webpack config object
	 * @returns {webpack.BannerPlugin}
	 */
	banner: (env, wpConfig) =>
	{
		/** @type {webpack.BannerPlugin | undefined} */
		let plugin;
		if (wpConfig.mode === "production")
		{
			plugin = new webpack.BannerPlugin(
			{
				banner: `Copyright ${(new Date()).getFullYear()} Scott Meesseman`,
				entryOnly: true,
				test: /extension\.js/ //s,
				// raw: true
			});
		}
		if (!plugin) {
			plugin = /** @type {webpack.BannerPlugin} */(/** @type {unknown} */(undefined));
		}
		return plugin;
	},


	/**
	 * @param {WebpackEnvironment} env
	 * @param {WebpackConfig} wpConfig Webpack config object
	 * @returns {CleanWebpackPlugin}
	 */
	clean: (env, wpConfig) =>
	{
		/** @type {CleanWebpackPlugin | undefined} */
		let plugin;
		if (env.clean === true)
		{
			if (env.build === "webview")
			{
				const basePath = path.posix.join(__dirname.replace(/\\/g, "/"), "res");
				plugin = new CleanWebpackPlugin(
				{
					cleanOnceBeforeBuildPatterns: [
						path.posix.join(basePath, "css", "**"),
						path.posix.join(basePath, "js", "**"),
						path.posix.join(basePath, "page", "**")
					],
					dangerouslyAllowCleanPatternsOutsideProject: true,
					dry: false
				});
			}
			else
			{
				plugin = new CleanWebpackPlugin(
				{
					cleanOnceBeforeBuildPatterns: wpConfig.mode === "production" ? [
						path.posix.join(__dirname.replace(/\\/g, "/"), "dist", "**"),
						path.posix.join(__dirname.replace(/\\/g, "/"), "coverage", "**"),
						path.posix.join(__dirname.replace(/\\/g, "/"), ".nyc-output", "**"),
						"!dist/webview/app/**"
					] : [
						path.posix.join(__dirname.replace(/\\/g, "/"), "dist", "**"),
						"!dist/webview/app/**"
					],
					dangerouslyAllowCleanPatternsOutsideProject: true,
					dry: false
				});
			}
		}
		if (!plugin) {
			plugin = /** @type {CleanWebpackPlugin} */(/** @type {unknown} */(undefined));
		}
		return plugin;
	},


	/**
	 * @param {String[]} apps
	 * @param {WebpackEnvironment} env
	 * @param {WebpackConfig} wpConfig Webpack config object
	 * @returns {CopyPlugin}
	 */
	copy: (apps, env, wpConfig) =>
	{
		/** @type {CopyPlugin | undefined} */
		let plugin;
		if (env.build === "webview")
		{
			const /** @type {CopyPlugin.Pattern[]} */patterns = [],
				  psx__dirname = __dirname.replace(/\\/g, "/"),
				  psxBasePath = env.basePath.replace(/\\/g, "/");
			apps.filter(app => fs.existsSync(path.join(env.basePath, app, "res"))).forEach(
				app => patterns.push(
				{
					from: path.posix.join(psxBasePath, app, "res", "*.*"),
					to: path.posix.join(psx__dirname, "res", "img", "webview"),
					context: path.posix.join(psxBasePath, app, "res")
				})
			);
			if (fs.existsSync(path.join(env.basePath, "res")))
			{
				patterns.push({
					from: path.posix.join(psxBasePath, "res", "*.*"),
					to: path.posix.join(psx__dirname, "res", "img", "webview"),
					context: path.posix.join(psxBasePath, "res")
				});
			}
			patterns.push(
			{
				from: path.posix.join(psx__dirname, "node_modules", "@vscode", "codicons", "dist", "codicon.ttf"),
				to: path.posix.join(psx__dirname, "res", "page"),
			} // ,
			// {
			// 	from: path.posix.join(psx__dirname, "node_modules", "@fortawesome", "fontawesome-pro", "webfonts", "fa-regular-400.woff2"),
			// 	to: path.posix.join(psx__dirname, "res", "page"),
			// },
			// {
			// 	from: path.posix.join(psx__dirname, "node_modules", "@fortawesome", "fontawesome-pro", "webfonts", "fa-solid-900.woff2"),
			// 	to: path.posix.join(psx__dirname, "res", "page"),
			// },
			// {
			// 	from: path.posix.join(psx__dirname, "node_modules", "@fortawesome", "fontawesome-pro", "webfonts", "fa-duotone-900.woff2"),
			// 	to: path.posix.join(psx__dirname, "res", "page"),
			// }
			);
			plugin = new CopyPlugin({ patterns: patterns });
		}
		if (!plugin) {
			plugin = /** @type {CopyPlugin} */(/** @type {unknown} */(undefined));
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
		return new MiniCssExtractPlugin(
		{
			filename: (pathData, assetInfo) =>
			{
				let name = "[name]";
				if (pathData.chunk?.name) {
					name = pathData.chunk.name.replace(/[a-z]+([A-Z])/g, (substr, token) => substr.replace(token, "-" + token.toLowerCase()));
				}
				return `css/${name}.css`
			}
		});
	},


	/**
	 * @param { string } name
	 * @param {WebpackEnvironment} env
	 * @param {WebpackConfig} wpConfig Webpack config object
	 * @returns {HtmlPlugin}
	 */
	html: (name, env, wpConfig) =>
	{
		const wwwName = name.replace(/[a-z]+([A-Z])/g, (substr, token) => substr.replace(token, "-" + token.toLowerCase()));
		return new HtmlPlugin(
		{
			chunks: [ name, wwwName ],
			filename: path.posix.join(__dirname, "res", "page", `${wwwName}.html`),
			inject: true,
			inlineSource: wpConfig.mode === "production" ? ".css$" : undefined,
			scriptLoading: "module",
			template: path.posix.join(name, `${wwwName}.html`),
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
					? ["#{cspSource}", "'nonce-#{cspNonce}'", "'unsafe-hashes'" ]
					: ["#{cspSource}", "'unsafe-hashes'", "'unsafe-inline'" ],
			"font-src": ["#{cspSource}" ],
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
		/** @type {InlineChunkHtmlPlugin | undefined} */
		let plugin;
		if (env.build === "webview")
		{
			plugin = new InlineChunkHtmlPlugin(HtmlPlugin, wpConfig.mode === "production" ? ["\\.css$"] : []);
		}
		if (!plugin) {
			plugin = /** @type {InlineChunkHtmlPlugin} */(/** @type {unknown} */(undefined));
		}
		return plugin;
	},


	/**
	 * @param {WebpackEnvironment} env
	 * @param {WebpackConfig} wpConfig Webpack config object
	 * @returns {ImageMinimizerPlugin}
	 */
	imageminimizer: (env, wpConfig) =>
	{
		/** @type {ImageMinimizerPlugin | undefined} */
		let plugin;
		if (env.build === "webview" && wpConfig.mode !== "production")
		{
			// plugin = new ImageMinimizerPlugin({
			// 	deleteOriginalAssets: true,
			// 	generator: [ imgConfig(env, wpConfig) ]
			// });
		}
		if (!plugin) {
			plugin = /** @type {ImageMinimizerPlugin} */(/** @type {unknown} */(undefined));
		}
		return plugin;
	},


	/**
	 * @param {WebpackEnvironment} env
	 * @param {WebpackConfig} wpConfig Webpack config object
	 * @returns {webpack.optimize.LimitChunkCountPlugin}
	 */
	limitchunks: (env, wpConfig) =>
	{
		/** @type {webpack.optimize.LimitChunkCountPlugin | undefined} */
		let plugin;
		if (env.build === "extension_web")
		{
			plugin = new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 });
		}
		if (!plugin) {
			plugin = /** @type {webpack.optimize.LimitChunkCountPlugin} */(/** @type {unknown} */(undefined));
		}
		return plugin;
	},


	/**
	 * @param {WebpackEnvironment} env
	 * @param {WebpackConfig} wpConfig Webpack config object
	 * @returns {ForkTsCheckerPlugin}
	 */
	tscheck: (env, wpConfig) =>
	{
		/** @type {ForkTsCheckerPlugin | undefined} */
		let plugin;
		if (env.build === "webview")
		{
			plugin = new ForkTsCheckerPlugin(
			{
				async: false,
				// eslint: {
				// 	enabled: true,
				// 	files: path.join(env.basePath, "**", "*.ts?(x)"),
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
			// plugin = new ForkTsCheckerPlugin({});
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
		if (!plugin) {
			plugin = /** @type {ForkTsCheckerPlugin} */(/** @type {unknown} */(undefined));
		}
		return plugin;
	},


	/**
	 * @param {String[]} apps
	 * @param {WebpackEnvironment} env
	 * @param {WebpackConfig} wpConfig Webpack config object
	 * @returns {HtmlPlugin[]}
	 */
	webviewapps: (apps, env, wpConfig) =>
	{
		/** @type {HtmlPlugin[]} */
		const plugins = [];
		if (env.build === "webview")
		{
			apps.forEach(k => plugins.push(wpPlugin.html(k, env, wpConfig)));
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
	wpPlugin
}
