/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable import/no-extraneous-dependencies */
// @ts-check

/**
 * @file plugin/base.js
 * @version 0.0.1
 * @license MIT
 * @author Scott Meesseman @spmeesseman
 *
 * @description
 *
 * When adding a new plugin, perform the following tasks:
 *
 *     1. Add the plugin filename (w/o extnsion) to the `WpBuildPluginName` type near the
 *        top of the WpBuild types file
 *        file:///c:\Projects\vscode-taskexplorer\webpack\types\wpbuild.d.ts
 *
 *     2. Adjust the default application object's plugins hash by adding the plugin filename
 *        (w/o/ extension) as a key of the `plugins()` return object
 *        file:///:\Projects\vscode-taskexplorer\webpack\utils\environment.js
 *
 *     3. Adjust the rc configuration files by adding the plugin filename (w/o/ extension)
 *        as a key of the `plugins` object
 *        file:///c:\Projects\vscode-taskexplorer\webpack\.wpbuildrc.json
 *        file:///c:\Projects\vscode-taskexplorer\webpack\types\.wpbuildrc.defaults.json
 *
 *     4. Add a module reference to plugin directory index file and add to it's module.exports
 *        file://c:\Projects\vscode-taskexplorer\webpack\plugin\index.js
 *
 *     5.  Add the module into the modulke in the webpack exports byt importing and placing it
 *         in an appropriate position in the configuraation plugin array.
 *         file:///c:\Projects\vscode-taskexplorer\webpack\exports\plugins.js
 */

const { readFile } = require("fs/promises");
const { relative, basename } = require("path");
const { WebpackError, ModuleFilenameHelpers } = require("webpack");
const { globalEnv, isFunction, asArray, mergeIf, WpBuildCache, isString, WpBuildError } = require("../utils");

/** @typedef {import("../types").WebpackConfig} WebpackConfig */
/** @typedef {import("../types").WebpackLogger} WebpackLogger */
/** @typedef {import("../types").WebpackSource} WebpackSource */
/** @typedef {import("../utils/console")} WpBuildConsoleLogger */
/** @typedef {import("../types").WebpackCompiler} WebpackCompiler */
/** @typedef {import("../types").WebpackSnapshot} WebpackSnapshot */
/** @typedef {import("../types").WebpackRawSource} WebpackRawSource */
/** @typedef {import("../types").WebpackCacheFacade} WebpackCacheFacade */
/** @typedef {import("../types").WebpackCompilation} WebpackCompilation */
/** @typedef {import("../types").WpBuildEnvironment} WpBuildEnvironment */
/** @typedef {import("../types").WpBuildPluginOptions} WpBuildPluginOptions */
/** @typedef {import("../types").WebpackPluginInstance} WebpackPluginInstance */
/** @typedef {import("../types").WpBuildPluginTapOptions} WpBuildPluginTapOptions */
/** @typedef {import("../types").WebpackCompilationAssets} WebpackCompilationAssets */
/** @typedef {import("../types").WebpackCompilationParams} WebpackCompilationParams */
/** @typedef {import("../types").WebpackCompilerAsyncHook} WebpackCompilerAsyncHook */
/** @typedef {import("../types").WebpackStatsPrinterContext} WebpackStatsPrinterContext */
/** @typedef {import("../types").WebpackCompilationHookStage} WebpackCompilationHookStage */
/** @typedef {import("../types").WpBuildPluginTapOptionsHash} WpBuildPluginTapOptionsHash */
/** @typedef {import("../types").WebpackCompilerSyncHookName} WebpackCompilerSyncHookName */
/** @typedef {import("../types").WebpackSyncHook<WebpackCompiler>} WebpackSyncCompilerHook */
/** @typedef {import("../types").WebpackCompilerAsyncHookName} WebpackCompilerAsyncHookName */
/** @typedef {import("../types").WebpackAsyncHook<WebpackCompiler>} WebpackAsyncCompilerHook */
/** @typedef {import("../types").WebpackSyncHook<WebpackCompilation>} WebpackSyncCompilationHook */
/** @typedef {import("../types").WebpackAsyncHook<WebpackCompilation>} WebpackAsyncCompilationHook */

/** @typedef {{ file: string; snapshot?: WebpackSnapshot | null; source?: WebpackRawSource }} CacheResult */
/** @typedef {import("../types").RequireKeys<WpBuildPluginTapOptions, "stage" | "hookCompilation">} WpBuildPluginCompilationOptions */

/**
 * This callback is displayed as part of the Requester class.
 * @callback WpBuildPluginHookCallback
 * @param {...any} args
 * @returns {any}
 */


/**
 * @class WpBuildHashPlugin
 * @augments WebpackPluginInstance
 */
class WpBuildBasePlugin
{
    /**
     * Persistent storage cache
     * @member {WpBuildCache} cache
     * @memberof WpBuildBasePlugin.prototype
     * @protected
     */
    cache;

    /**
     * Webpack compilation instance
     * @member {WebpackCompilation} compilation
     * @memberof WpBuildBasePlugin.prototype
     * @type {WebpackCompilation}
     * @protected
     */
    compilation;

    /**
     * @member {WebpackCompiler} compiler
     * @type {WebpackCompiler} compiler
     * @protected
     */
    compiler;

    /**
     * @member {WpBuildEnvironment} env
     * @memberof WpBuildBasePlugin.prototype
     * @protected
     */
    env;

    /**
     * @member {number} hashDigestLength
     * @memberof WpBuildBasePlugin.prototype
     * @protected
     */
    hashDigestLength;

    /**
     * @member {WpBuildConsoleLogger} logger
     * @memberof WpBuildBasePlugin.prototype
     * @protected
     */
    logger;

    /**
     * @member {string} name
     * @memberof WpBuildBasePlugin.prototype
     * @protected
     */
    name;

    /**
     * @member {string} nameCompilation
     * @memberof WpBuildBasePlugin.prototype
     * @private
     */
    nameCompilation;

    /**
     * @member {WpBuildPluginOptions} options
     * @memberof WpBuildBasePlugin.prototype
     * @protected
     */
    options;

    /**
     * @member {WebpackPluginInstance[]} _plugins
     * @memberof WpBuildBasePlugin.prototype
     * @private
     */
    plugins;

    /**
     * Runtime compiler cache
     * @member {WebpackCacheFacade} wpCache
     * @memberof WebpackCompiler.prototype
     * @protected
     * @type {WebpackCacheFacade}
     */
    wpCache;

    /**
     * Runtime compilation cache
     * @member {WebpackCacheFacade} wpCacheCompilation
     * @memberof WpBuildBasePlugin.prototype
     * @type {WebpackCacheFacade}
     * @protected
     */
    wpCacheCompilation;

    /**
     * @member {WebpackConfig} wpConfig
     * @memberof WpBuildBasePlugin.prototype
     * @protected
     */
    wpConfig;

    /**
     * @member {WebpackLogger} wpLogger
     * @memberof WpBuildBasePlugin.prototype
     * @type {WebpackLogger}
     * @protected
     */
    wpLogger;


    /**
     * @class WpBuildBasePlugin
     * @param {WpBuildPluginOptions} options Plugin options to be applied
     * @param {string} [globalCache]
     */
	constructor(options, globalCache)
    {
        this.validatePluginOptions(options);
        this.env = options.env;
        this.logger = this.env.logger;
        this.wpConfig = options.env.wpc;
        this.name = this.constructor.name;
        this.nameCompilation = this.constructor.name + "_";
        this.options = mergeIf(options, { plugins: [] });
        this.hashDigestLength = this.env.wpc.output.hashDigestLength || 20;
        this.cache = new WpBuildCache(this.env, { file: `cache_${this.name}.json` });
        if (globalCache) {
            this.initGlobalEnvObject(globalCache);
        }
        if (!options.registerVendorPluginsFirst) {
            this.plugins = [ this, ...asArray(options.plugins).map(p => new p.ctor(p.options)) ];
        }
        else {
            this.plugins = [ ...asArray(options.plugins).map(p => new p.ctor(p.options)), this ];
        }
    }


    /**
     * Called by webpack runtime to initialize this plugin.  To be overridden by inheriting class.
     * @function
     * @public
     * @member apply
     * @abstract
     * @param {WebpackCompiler} compiler the compiler instance
     */
    apply(compiler) { this.compiler = compiler; }


    /**
     * Break property name into separate spaced words at each camel cased character
     * @function
     * @private
     * @member breakProp
     * @param {string} prop
     * @returns {string}
     */
    breakProp(prop)
    {
        return prop.replace(/_/g, "")
                   .replace(/[A-Z]{2,}/g, (v) => v[0] + v.substring(1).toLowerCase())
                   .replace(/[a-z][A-Z]/g, (v) => `${v[0]} ${v[1]}`).toLowerCase();
    }


    /**
     * @function
     * @protected
     * @async
     * @member checkSnapshot
     * @param {string} filePath
     * @param {string} identifier
     * @param {string} outputDir Output directory of build
     * @param {WebpackRawSource | undefined} source
     * @returns {Promise<CacheResult>}
     */
    async checkSnapshot(filePath, identifier, outputDir, source)
    {
        let data, /** @type {CacheResult} */cacheEntry;
        const logger = this.logger,
              filePathRel = relative(outputDir, filePath),
              /** @type {CacheResult} */result = { file: basename(filePathRel), snapshot: null, source };

        logger.value("   check cache for existing asset", filePathRel, 3);

        try {
            cacheEntry = await this.wpCacheCompilation.getPromise(`${filePath}|${identifier}`, null);
        }
        catch (e) {
            this.handleError(e, "failed while checking cache");
            return result;
        }

        if (cacheEntry && cacheEntry.snapshot)
        {
            let isValidSnapshot;
            logger.value("   check snapshot valid", filePathRel, 4);
            try {
                isValidSnapshot = await this.checkSnapshotValid(cacheEntry.snapshot);
            }
            catch (e) {
                this.handleError(e, "failed while checking snapshot");
                return result;
            }
            if (isValidSnapshot)
            {
                logger.value("   snapshot valid", filePathRel, 4);
                ({ source } = cacheEntry);
            }
            else {
                logger.write(`   snapshot for '${filePathRel}' is invalid`, 4);
            }
        }

        if (!source)
        {
            const startTime = Date.now();
            data = data || await readFile(filePath);
            source = new this.compiler.webpack.sources.RawSource(data);
            logger.value("   create snapshot", filePathRel, 4);
            try {
                result.snapshot = await this.createSnapshot(startTime, filePath);
            }
            catch (e) {
                this.handleError(e, "failed while creating snapshot");
                return result;
            }
            if (source && result.snapshot)
            {
                logger.value("   cache snapshot", filePathRel, 4);
                try {
                    const hash = this.getContentHash(source.buffer());
                    result.snapshot.setFileHashes(hash);
                    await this.wpCacheCompilation.storePromise(`${filePath}|${identifier}`, null, { source, snapshot: result.snapshot, hash });
                    result.source = source;
                }
                catch (e) {
                    this.handleError(e, "failed while caching snapshot");
                    return result;
                }
            }
        }

        return result;
    };


    /**
     * @function
     * @protected
     * @async
     * @member checkSnapshotExists
     * @param {string} filePath
     * @param {string} identifier
     * @param {string} outputDir Output directory of build
     * @returns {Promise<boolean>}
     */
    async checkSnapshotExists(filePath, identifier, outputDir)
    {
        const logger = this.logger,
              filePathRel = relative(outputDir, filePath);
        let /** @type {CacheResult | undefined} */cacheEntry;
        logger.value("   check cache for existing asset snapshot", filePathRel, 3);
        try {
            cacheEntry = await this.wpCacheCompilation.getPromise(`${filePath}|${identifier}`, null);
        }
        catch (e) {
            this.handleError(e, "failed while checking if cached snapshot exists");
        }
        return !!cacheEntry && !!cacheEntry.snapshot;
    };


	/**
	 * @function
	 * @protected
	 * @async
	 * @member checkSnapshotValid
	 * @param {WebpackSnapshot} snapshot
	 * @returns {Promise<boolean | undefined>}
	 */
	async checkSnapshotValid(snapshot)
	{
		return new Promise((resolve, reject) =>
		{
			this.compilation.fileSystemInfo.checkSnapshotValid(snapshot, (e, isValid) => { if (e) { reject(e); } else { resolve(isValid); }});
		});
	}


	/**
	 * @function
	 * @protected
	 * @async
	 * @member createSnapshot
	 * @param {number} startTime
	 * @param {string} dependency
	 * @returns {Promise<WebpackSnapshot | undefined | null>}
	 */
	async createSnapshot(startTime, dependency)
	{
		return new Promise((resolve, reject) =>
		{
			this.compilation.fileSystemInfo.createSnapshot(startTime, [ dependency ], // @ts-ignore
				undefined, undefined, null, (e, snapshot) => { if (e) { reject(e); } else { resolve(snapshot); }}
			);
		});
	}


	/**
	 * @function
	 * @protected
	 * @member fileNameStrip
	 * @param {string} file
	 * @param {boolean} [rmvExt] Remove file extension
	 * @returns {string}
	 */
    fileNameStrip = (file, rmvExt) =>
    {
        let newFile = file.replace(new RegExp(`\\.[a-f0-9]{${this.hashDigestLength},}`), "");
        if (rmvExt) {
            newFile = newFile.replace(/\.js(?:\.map)?/, "");
        }
        return newFile;
    };


	/**
	 * @function
	 * @protected
	 * @member fileNameHashRegex
	 * @returns {RegExp}
	 */
    fileNameHashRegex = () => new RegExp(`\\.[a-z0-9]{${this.hashDigestLength},}`);


	/**
	 * @function
	 * @member getContentHash
	 * @protected
	 * @param {Buffer} source
	 * @returns {string}
	 */
	getContentHash(source)
	{
		const {hashDigest, hashDigestLength, hashFunction, hashSalt } = this.compilation.outputOptions,
			  hash = this.compiler.webpack.util.createHash(/** @type {string} */hashFunction);
		if (hashSalt) {
			hash.update(hashSalt);
		}
		return hash.update(source).digest(hashDigest).toString().slice(0, hashDigestLength);
	}


    /**
     * @function
     * @public
     * @static
     * @member getEntriesRegex
     * @param {WebpackConfig} wpConfig Webpack config object
     * @param {boolean} [dbg]
     * @param {boolean} [ext]
     * @param {boolean} [hash]
     * @returns {RegExp}
     */
    static getEntriesRegex = (wpConfig, dbg, ext, hash) =>
    {
        return new RegExp(
            `(?:${Object.keys(wpConfig.entry).reduce((e, c) => `${e ? e + "|" : ""}${c}`, "")})` +
            `(?:\\.debug)${!dbg ? "?" : ""}(?:\\.[a-z0-9]{${wpConfig.output.hashDigestLength || 20}})` +
            `${!hash ? "?" : ""}(?:\\.js|\\.js\\.map)${!ext ? "?" : ""}`
        );
    };


    /**
     * @function
     * @public
     * @member getPlugins
     * @returns {(WebpackPluginInstance | InstanceType<WpBuildBasePlugin>)[]}
     */
    getPlugins() { return this.plugins; }


	/**
	 * @function
	 * @member handleError
	 * @protected
	 * @param {Error | WebpackError | string} e
	 * @param {string | undefined | null | false | 0} [msgOrFile]
	 * @param {string | undefined} [fileOrDetails]
	 * @param {string | undefined} [details]
	 */
	handleError(e, msgOrFile, fileOrDetails, details)
	{
        if (isString(e))
        {
            e = msgOrFile ? new WpBuildError(e, msgOrFile, fileOrDetails) : new WebpackError(e);
        }
        else if (!(e instanceof WebpackError) && !(e instanceof WpBuildError))
        {
            this.env.logger.error(msgOrFile ?? "an error has occurred");
            if (!fileOrDetails) {
                e = new WebpackError(e.message);
            }
            else {
                e = new WpBuildError(e.message, fileOrDetails, details);
            }
        }
        this.env.logger.error(e);
        this.compilation.errors.push(/** @type {WebpackError} */(e));
	}


    /**
     * @function
     * @protected
     * @member initGlobalEnvObject
     * @param {string} baseProp
     * @param {any} [initialValue]
     * @param {...any} props
     */
    initGlobalEnvObject(baseProp, initialValue, ...props)
    {
        if (!globalEnv[baseProp]) {
            globalEnv[baseProp] = {};
        }
        props.filter(p => !globalEnv[baseProp][p]).forEach((p) => { globalEnv[baseProp][p] = initialValue; });
    };


    /**
     * @function
     * @private
     * @member isAsync
     * @param {any} hook
     * @returns {hook is WebpackAsyncCompilerHook | WebpackAsyncCompilationHook}
     */
    isAsync = (hook) => isFunction(hook.tapPromise);


    /**
     * @function
     * @private
     * @member isAsyncType
     * @param {any} hook
     * @returns {hook is WebpackAsyncCompilerHook | WebpackAsyncCompilationHook}
     */
    isAsyncType = (hook) => isFunction(hook.tapPromise);


    /**
     * @function
     * @protected
     * @member isEntryAsset
     * @param {string} file
     * @returns {boolean}
     */
    isEntryAsset = (file) => WpBuildBasePlugin.getEntriesRegex(this.wpConfig).test(file);


    /**
     * @function
     * @private
     * @member isTapable
     * @param {any} hook
     * @returns {hook is WebpackAsyncCompilerHook | WebpackAsyncCompilationHook}
     */
    isTapable = (hook) => isFunction(hook.tap) || isFunction(hook.tapPromise);


    /**
     * Webpack ModuleFilenameHelpers - matches properties `include`, `exclude`, and
     * `test` on the plugin options object
     * @function
     * @protected
     * @member matchObject
     * @param {string} str
     * @returns {boolean}
     */
    matchObject = (str) => ModuleFilenameHelpers.matchObject.bind(undefined, this.options, str);


    /**
     * Called by extending class from apply()
     * @function
     * @protected
     * @member onApply
     * @param {WebpackCompiler} compiler the compiler instance
     * @param {WpBuildPluginTapOptionsHash} options
     * @throws {WebpackError}
     */
    onApply(compiler, options)
    {
        this.validateApplyOptions(compiler, options);

        const optionsArray = Object.entries(options);
        this.compiler = compiler;
        this.wpCache = compiler.getCache(this.name);
        this.wpLogger = compiler.getInfrastructureLogger(this.name);
        this.hashDigestLength = compiler.options.output.hashDigestLength || this.env.wpc.output.hashDigestLength || 20;

        const hasCompilationHook = optionsArray.find(([ _, tapOpts ]) => tapOpts.hook === "compilation") ||
                                   optionsArray.every(([ _, tapOpts ]) => !!tapOpts.stage);
        if (hasCompilationHook)
        {
            this.tapCompilationHooks(optionsArray.filter(([ _, tapOpts ]) => tapOpts.hook === "compilation"));
        }

        for (const [ name, tapOpts ] of optionsArray.filter(([ _, tapOpts ]) => tapOpts.hook && tapOpts.hook !== "compilation"))
        {
            const hook = compiler.hooks[tapOpts.hook];
            if (!tapOpts.async)
            {
                hook.tap(`${this.name}_${name}`, this.wrapCallback(name, tapOpts).bind(this));
            }
            else
            {   if (this.isAsync(hook))
                {
                    hook.tapPromise(`${this.name}_${name}`, this.wrapCallback(name, tapOpts).bind(this));
                }
                else {
                    this.handleError(new WebpackError(`Invalid async hook parameters specified: ${tapOpts.hook}`));
                    return;
                }
            }
        }
    }


    /**
     * @function
     * @protected
     * @member onCompilation
     * @param {WebpackCompilation} compilation
     * @returns {boolean}
     */
    onCompilation(compilation)
    {
        this.compilation = compilation;
        this.wpLogger = compilation.getLogger(this.name);
        this.wpCacheCompilation = compilation.getCache(this.name);
        return !compilation.getStats().hasErrors();
    }


    /**
     * @function
     * @private
     * @member tapCompilationHooks
     * @param {[string, WpBuildPluginTapOptions][]} optionsArray
     */
    tapCompilationHooks(optionsArray)
    {
        this.compiler.hooks.compilation.tap(this.name, (compilation) =>
        {
            if (!this.onCompilation(compilation)) {
                return;
            }
            optionsArray.forEach(([ name, tapOpts ]) =>
            {
                if (!tapOpts.hookCompilation)
                {
                    if (tapOpts.stage) {
                        tapOpts.hookCompilation = "processAssets";
                    }
                    else {
                        this.handleError(new WebpackError("Invalid hook parameters: stage and hookCompilation not specified"));
                        return;
                    }
                }
                else if (tapOpts.hookCompilation === "processAssets" && !tapOpts.stage)
                {
                    this.handleError(new WebpackError("Invalid hook parameters: stage not specified for processAssets"));
                    return;
                }
                this.tapCompilationStage(name, /** @type {WpBuildPluginCompilationOptions} */(tapOpts));
            });
        });
    }


    /**
     * @function
     * @protected
     * @member tapCompilationStage
     * @param {string} optionName
     * @param {WpBuildPluginCompilationOptions} options
     * @returns {void}
     * @throws {WebpackError}
     */
    tapCompilationStage(optionName, options)
    {
        const stageEnum = options.stage ? this.compiler.webpack.Compilation[`PROCESS_ASSETS_STAGE_${options.stage}`] : null,
              name = `${this.name}_${options.stage}`,
              hook = this.compilation.hooks[options.hookCompilation];
        if (this.isTapable(hook))
        {
            this.nameCompilation = name;
            if (stageEnum && options.hookCompilation === "processAssets")
            {
                const logMsg = this.breakProp(optionName).padEnd(this.env.app.log.pad.value - 3) + this.logger.tag(`processassets: ${options.stage} stage`);
                if (!options.async) {
                    hook.tap({ name, stage: stageEnum }, this.wrapCallback(logMsg, options).bind(this));
                }
                else {
                    hook.tapPromise({ name, stage: stageEnum }, this.wrapCallback(logMsg, options).bind(this));
                }
            }
            else
            {
                if (!options.async) {
                    hook.tap(name, this.wrapCallback(optionName, options).bind(this));
                }
                else {
                    if (this.isAsync(hook)) {
                        hook.tapPromise(name, this.wrapCallback(optionName, options).bind(this));
                    }
                    else {
                        this.handleError(new WebpackError(`Invalid async hook specified: ${options.hook}`));
                        return;
                    }
                }
            }
            this.tapStatsPrinter(name, options);
        }
    }


    /**
     * @function
     * @protected
     * @member tapStatsPrinter
     * @param {string} name
     * @param {WpBuildPluginCompilationOptions} options
     */
    tapStatsPrinter(name, options)
    {
        const property = options.statsProperty;
        if (property)
        {
            this.compilation.hooks.statsPrinter.tap(name, (stats) =>
            {
                const printFn = (/** @type {{}} */prop, /** @type {WebpackStatsPrinterContext} */context) =>
                      prop ? context[options.statsPropertyColor || "green"]?.(context.formatFlag?.(this.breakProp(property)) || "") || "" : "";
                stats.hooks.print.for(`asset.info.${property}`).tap(name, printFn);
            });
        }
    }


    /**
     * @function
     * @private
     * @member validateOptions
     * @param {WebpackCompiler} compiler the compiler instance
     * @param {WpBuildPluginTapOptionsHash} options Plugin options to be applied
     * @throws {WpBuildError}
     */
	validateApplyOptions(compiler, options)
    {
        if (options)
        {
            Object.values(options).forEach((o) =>
            {
                if (o.async && !this.isAsync(compiler.hooks[o.hook]))
                {
                    throw new WebpackError(`Invalid hook parameters specified: ${o.hook} is not asynchronou`);
                }
            });
            for (const o of Object.values(options).filter((tapOpts) => tapOpts.hook))
            {
                const hook = compiler.hooks[o.hook],
                      isAsync = this.isAsync(hook);
                if (o.async && !isAsync)
                {
                    this.handleError(new WebpackError(`Invalid hook parameters specified: ${o.hook} is not asynchronous`));
                    return;
                }
            }
        }
    }


    /**
     * @function
     * @private
     * @member validateOptions
     * @param {WpBuildPluginOptions} options Plugin options to be applied
     * @throws {WpBuildError}
     */
	validatePluginOptions(options)
    {
        // if (options.plugins)
        // {
        //     Object.values(asArray(options.plugins)).forEach((o) =>
        //     {
        //         if (o.async && o.hook !== WebpackCompilerAsyncHookName)
        //         {
        //             throw new WebpackError(`Specified hook '${o.hook}' is not asynchronous`);
        //         }
        //     });
        // }
    }


    /**
     * @function
     * @private
     * @member wrapCallback
     * @param {string} message If camel-cased, will be formatted with {@link breakProp}
     * @param {WpBuildPluginTapOptions} options
     * @returns {WpBuildPluginHookCallback}
     */
    wrapCallback(message, options)
    {
        const logger = this.logger,
              callback = options.callback,
              logMsg = this.breakProp(message);
        if (!options.async) {
            return (...args) => { logger.start(logMsg, 1); callback.call(this, ...args); };
        }
        return async (...args) => { logger.start(logMsg, 1); await callback.call(this, ...args); };
    }


    // /**
    //  * @template T
    //  * @function
    //  * @protected
    //  * @member wrapTry
    //  * @param {Function} fn
    //  * @param {string} msg
    //  * @param {...any} args
    //  * @returns {PromiseLike<T> | T | Error}
    //  */
    // wrapTry = (fn, msg, ...args) =>
    // {
    //     this.env.logger.write(msg, 3);
    //     try {
    //         const r = fn.call(this, ...args);
    //         if (isPromise(r)) {
    //             return r.then((v) => v);
    //         }
    //         else {
    //             return r;
    //         }
    //     }
    //     catch (e) {
    //         this.handleError(e, `Failed: ${msg}`);
    //         return /** @type {Error} */(e);
    //     }
    // };
}


module.exports = WpBuildBasePlugin;
module.exports.WpBuildError = WpBuildError;
