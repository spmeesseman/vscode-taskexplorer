
/**
 * @namespace typedefs
 */

/**
 * PLUGINS
 */

/** @typedef {import("./plugin").WpBuildPluginTapOptions} WpBuildPluginTapOptions */
/** @typedef {import("./plugin").WpBuildPluginVendorOptions} WpBuildPluginVendorOptions */
/** @typedef {import("./plugin").WpBuildPluginTapOptionsHash} WpBuildPluginTapOptionsHash */
/** @typedef {import("./plugin").RequireKeys<WpBuildPluginTapOptions, "stage" | "hookCompilation">} WpBuildPluginCompilationOptions */
/** @typedef {{ file: string; snapshot?: WebpackSnapshot | null; source?: WebpackRawSource }} CacheResult */
/**
 * @typedef {Record<string, any>} WpBuildPluginOptions
 * @property {WpBuildApp} app
 * @property {boolean} [registerVendorPluginsFirst]
 * @property {WpBuildPluginVendorOptions | WpBuildPluginVendorOptions[]} [plugins]
 */
/**
 * This callback is displayed as part of the Requester class.
 * @callback WpBuildCallback
 * @param {...any} args
 * @returns {any}
 */


/**
 * WPBUILDRC
 */

/* START_RC_DEFS */
/** @typedef {import("../types").WpBuildRcSourceCodeType} WpBuildRcSourceCodeType */
/** @typedef {import("../types").WpBuildRcBuildType} WpBuildRcBuildType */
/** @typedef {import("../types").WpBuildWebpackMode} WpBuildWebpackMode */
/** @typedef {import("../types").WebpackTarget} WebpackTarget */
/** @typedef {import("../types").WpBuildLogTrueColor} WpBuildLogTrueColor */
/** @typedef {import("../types").WpBuildLogColor} WpBuildLogColor */
/** @typedef {import("../types").WebpackLibraryType} WebpackLibraryType */
/* END_RC_DEFS */


/**
 * WPBUILDAPP
 */

/** @typedef {import("../types").IDisposable} IDisposable */
/** @typedef {import("../types").WpBuildRcLog} WpBuildRcLog */
/** @typedef {import("../types").WpBuildLogIcon} WpBuildLogIcon */
/** @typedef {import("../types").WpBuildRcPaths} WpBuildRcPaths */
/** @typedef {import("../types").WpBuildRcBuild} WpBuildRcBuild */
/** @typedef {import("../types").WpBuildRcBuilds} WpBuildRcBuilds */
/** @typedef {import("../types").WpBuildRcVsCode} WpBuildRcVsCode */
/** @typedef {import("../types").WebpackLogLevel} WebpackLogLevel */
/** @typedef {import("../types").WpBuildLogLevel} WpBuildLogLevel */
/** @typedef {import("../types").WebpackAssetInfo} WebpackAssetInfo */
/** @typedef {import("../types").IWpBuildRcSchema} IWpBuildRcSchema */
/** @typedef {import("../types").WpBuildRcExports} WpBuildRcExports */
/** @typedef {import("../types").WpBuildRcPlugins} WpBuildRcPlugins */
/** @typedef {import("../types").TypeWpBuildRcLog} TypeWpBuildRcLog */
/** @typedef {import("../types").WpBuildRcPathsKey} WpBuildRcPathsKey */
/** @typedef {import("../types").WpBuildLogIconSet} WpBuildLogIconSet */
/** @typedef {import("../types").WpBuildRcPathsKey} WpBuildRcPathsKey */
/** @typedef {import("../types").IWpBuildAppSchema} IWpBuildAppSchema */
/** @typedef {import("../types").TypeWpBuildRcBuild} TypeWpBuildRcBuild */
/** @typedef {import("../types").WpBuildAppTsConfig} WpBuildAppTsConfig */
/** @typedef {import("../types").TypeWpBuildRcPaths} TypeWpBuildRcPaths */
/** @typedef {import("../types").WebpackRuntimeArgs} WebpackRuntimeArgs */
/** @typedef {import("../types").WpBuildWebpackEntry} WpBuildWebpackEntry */
/** @typedef {import("../types").TypeWpBuildRcLogPad} TypeWpBuildRcLogPad */
/** @typedef {import("../types").WpBuildRcEnvironment} WpBuildRcEnvironment */
/** @typedef {import("../types").WpBuildRcPackageJson} WpBuildRcPackageJson */
/** @typedef {import("../types").WpBuildLogColorValue} WpBuildLogColorValue */
/** @typedef {import("../types").WpBuildWebpackConfig} WpBuildWebpackConfig */
/** @typedef {import("../types").WpBuildRuntimeEnvArgs} WpBuildRuntimeEnvArgs */
/** @typedef {import("../types").WpBuildAppTsConfigJson} WpBuildAppTsConfigJson */
/** @typedef {import("../types").WpBuildLogColorMapping} WpBuildLogColorMapping */
/** @typedef {import("../plugin//base").WpBuildPluginOptions} WpBuildPluginOptions */
/** @typedef {import("../types").WpBuildRcEnvironmentBase} WpBuildRcEnvironmentBase */
/** @typedef {import("../types").WpBuildAppGetPathOptions} WpBuildAppGetPathOptions */
/** @typedef {import("../types").WpBuildGlobalEnvironment} WpBuildGlobalEnvironment */
/** @typedef {import("../types").WpBuildWebpackEntryValue} WpBuildWebpackEntryValue */
/** @typedef {import("../types").WpBuildWebpackEntryObject} WpBuildWebpackEntryObject */
/** @typedef {import("../types").WpBuildWebpackAliasConfig} WpBuildWebpackAliasConfig */
/** @typedef {import("../types").WpBuildCombinedRuntimeArgs} WpBuildCombinedRuntimeArgs */
/** @typedef {import("../types").WebpackSyncHook<WebpackCompilation>} WebpackSyncCompilationHook */
/** @typedef {import("../types").WpBuildAppTsConfigCompilerOptions} WpBuildAppTsConfigCompilerOptions */


/**
 * UTILS
 */

/** @typedef {import("../utils").WpBuildRc} WpBuildRc */
/** @typedef {import("../utils").WpBuildApp} WpBuildApp */
/** @typedef {import("../utils").WpBuildConsoleLogger} WpBuildConsoleLogger */


/**
 * Executes a command with a promisified child_process.exec()
 * @typedef {object} ExecAsyncOptions
 * @property {string} command command to execute, with arguments
 * @property {import("child_process").ExecOptions} [execOptions] options to pass to child_process.exec()
 * @property {string | string[]} [ignoreOut] stdout or stderr lines to ignore
 * @property {string} [program] program name to diasplay in any logging
 * @property {typedefs.WpBuildConsoleLogger} logger a WpBuildConsoleLogger instance
 * @property {string} [logPad] a padding to prepend any log messages with
 * @returns {Promise<number | null>}
 */


/**
 * WEBPACK
 */

/** @typedef {import("./webpack").EntryObject} EntryObject */
/** @typedef {import("../types").WebpackMode} WebpackMode */
/** @typedef {import("./webpack").WebpackLogger} WebpackLogger */
/** @typedef {import("./webpack").WebpackSource} WebpackSource */
/** @typedef {import("./webpack").WebpackCompiler} WebpackCompiler */
/** @typedef {import("./webpack").WebpackSnapshot} WebpackSnapshot */
/** @typedef {import("./webpack").WebpackRawSource} WebpackRawSource */
/** @typedef {import("./webpack").WebpackRuleSetUse} WebpackRuleSetUse */
/** @typedef {import("./webpack").WebpackCacheFacade} WebpackCacheFacade */
/** @typedef {import("./webpack").WebpackCompilation} WebpackCompilation */
/** @typedef {import("./webpack").WebpackPluginInstance} WebpackPluginInstance */
/** @typedef {import("./webpack").WebpackRuleSetUseItem} WebpackRuleSetUseItem */
/** @typedef {import("./webpack").WebpackCompilationAssets} WebpackCompilationAssets */
/** @typedef {import("./webpack").WebpackCompilationParams} WebpackCompilationParams */
/** @typedef {import("./webpack").WebpackCompilerAsyncHook} WebpackCompilerAsyncHook */
/** @typedef {import("./webpack").WebpackStatsPrinterContext} WebpackStatsPrinterContext */
/** @typedef {import("./webpack").WebpackCompilationHookStage} WebpackCompilationHookStage */
/** @typedef {import("./webpack").WebpackCompilerSyncHookName} WebpackCompilerSyncHookName */
/** @typedef {import("./webpack").WebpackSyncHook<WebpackCompiler>} WebpackSyncCompilerHook */
/** @typedef {import("./webpack").WebpackCompilerAsyncHookName} WebpackCompilerAsyncHookName */
/** @typedef {import("./webpack").WebpackAsyncHook<WebpackCompiler>} WebpackAsyncCompilerHook */
/** @typedef {import("./webpack").WebpackAsyncHook<WebpackCompilation>} WebpackAsyncCompilationHook */


exports.unused = {};
