/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable import/no-extraneous-dependencies */
// @ts-check

/**
 * @file plugin/wait.js
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

const { existsSync } = require("fs");
const WpBuildBasePlugin = require("./base");
const { apply, WpBuildError } = require("../utils");

/** @typedef {import("../types").WebpackCompiler} WebpackCompiler */
/** @typedef {import("../types").WpBuildEnvironment} WpBuildEnvironment */
/** @typedef {import("../types").WpBuildPluginOptions} WpBuildPluginOptions */


class WpBuildWaitPlugin extends WpBuildBasePlugin
{
    /**
     * @member {string}
     * @memberof WpBuildWaitPlugin.prototype
     * @private
     */
    _file;

    /**
     * @member {number}
     * @memberof WpBuildWaitPlugin.prototype
     * @private
     */
    _interval;

    /**
     * @member {number}
     * @memberof WpBuildWaitPlugin.prototype
     * @private
     */
    _timeout;


    /**
     * @class WpBuildWaitPlugin
     * @param {WpBuildPluginOptions} options Plugin options to be applied
     */
	constructor(options)
    {
        super(options);
        this._file = "";
        this._interval = 150;
        this._timeout = 15;
    }

    /**
     * Called by webpack runtime to initialize this plugin
     * @function
     * @override
     * @member
     * @param {WebpackCompiler} compiler the compiler instance
     */
    apply(compiler)
    {
		this.onApply(compiler,
        {
            run: {
                async: true,
                hook: "run",
                callback: this.poll.bind(this)
            }
        });
    }


    /**
     * @function
     * @private
     * @member
     * @param {WebpackCompiler} _compiler
     * @returns {Promise<void>}
     */
    poll(_compiler)
    {
        const start = Date.now();
        /** @param {(value: void | PromiseLike<void>) => void} resolve @param {any} reject */
        const _poll = (resolve, reject) =>
        {
            if (existsSync(this._file))
            {
                resolve();
            }
            else if (Date.now() - start > this._timeout)
            {
                reject(new WpBuildError(`Wait operation times out at ${this._timeout} ms`, "plugin/wait.js"));
            }
            else {
                setTimeout(_poll, this._interval, resolve, reject);
            }
        };
        return new Promise((resolve, reject) => _poll(resolve, reject));
    }
}


/**
 * @function
 * @module
 * @param {WpBuildEnvironment} env
 * @returns {WpBuildWaitPlugin | undefined}
 */
const wait = (env) => env.app.plugins.wait && env.build === "tests" ? new WpBuildWaitPlugin({ env }) : undefined;


module.exports = wait;
