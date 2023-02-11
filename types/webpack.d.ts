
//@ts-check
declare type WebpackBuild = "extension"|"extension_web"|"webview";
declare type WebpackBuildOrUndefined = WebpackBuild|undefined;
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
    analyze: boolean;
    basePath: string;
    clean: boolean;
    environment: "dev"|"prod"|"test";
    esbuild: boolean; // Is ES build
    imageOpt: boolean; // Perform image optimization
    target: WebpackBuild;
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
