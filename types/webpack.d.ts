
//@ts-check
declare type WebpackBuild = "extension"|"extension_web"|"webview";
declare type WebpackBuildOrUndefined = "extension"|"extension_web"|"webview"|undefined;
declare type WebpackConfig = import("webpack").Configuration;
declare type WebpackPluginInstance = import("webpack").WebpackPluginInstance;
declare type WebpackOptimization = any;
declare interface WebpackBuildEnv
{
    clean: boolean; // If set,will clean the output directory before build
    environment: string; // The environment to compile for, one of `prod`, `dev`, or `test`.  Note this is not the same as webpack `mode`.
}
declare interface WebpackEnvironment
{
    analyze?: boolean | string;
    basePath: string;
    build: string;
    clean?: boolean | string;
    environment?: string;
    esbuild?: boolean | string; // Is ES build
    imageOpt?: boolean | string; // Perform image optimization
    target?: string;
}

export {
    WebpackBuild,
    WebpackBuildOrUndefined,
    WebpackConfig,
    WebpackPluginInstance,
    WebpackOptimization,
    WebpackBuildEnv,
    WebpackEnvironment
};
