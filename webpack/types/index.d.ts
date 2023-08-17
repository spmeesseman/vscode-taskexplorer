
/**
 * @file types/index.d.ts
 * @version 0.0.1
 * @license MIT
 * @author @spmeesseman Scott Meesseman
 * 
 * Handy file links:
 * 
 * COMPILER  : file:///c:\Projects\vscode-taskexplorer\node_modules\webpack\lib\Compiler.js
 * TAPABLE   : file:///c:\Projects\vscode-taskexplorer\node_modules\tapable\tapable.d.ts
 * RC DEFAULTS : file:///c:\Projects\vscode-taskexplorer\webpack\utils\app.js
 * 
 * @description
 *
 * Exports all types for this project
 *
 * All types exported from this definition file are prepended with `WpBuild`.
 */

/**
 * App typings
 */
export * from "./app";

/**
 * Generic typings
 */
export * from "./generic";

/**
 * Log typings
 */
export * from "./logger";

/**
 * WpBuild application specific types library
 */
export * from "./plugin";

/**
 * WpBuild application specific types library
 */
export * from "./rc";
export * from "./rc.extensions";

/**
 * WpBuild application specific types library
 */
// export * from "./rc.base";

/**
 * Base webpack types library
 */
export * from "./webpack";
// import * as wp from "./webpack";
