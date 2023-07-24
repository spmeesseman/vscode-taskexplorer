/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable import/no-extraneous-dependencies */
// @ts-check

/**
 * @module webpack.plugin.upload
 *
 * Uses 'plink' and 'pscp' from PuTTY package: https://www.putty.org
 *
 * !!! For first time build on fresh os install:
 * !!!   - create the environment variable SPMEESSEMAN_COM_APP1_SSH_AUTH_SMEESSEMAN
 * !!!   - run a plink command manually to generate and trust the fingerprints:
 * !!!       plink -ssh -batch -pw <PWD> smeesseman@app1.spmeesseman.com "echo hello"
 *
 */

const { join } = require("path");
const { spawnSync } = require("child_process");
const { renameSync, copyFileSync } = require("fs");
const { writeInfo, figures } = require("../console");

/** @typedef {import("../types").WebpackConfig} WebpackConfig */
/** @typedef {import("../types").WebpackHashState} WebpackHashState */
/** @typedef {import("../types").WebpackEnvironment} WebpackEnvironment */
/** @typedef {import("../types").WebpackPluginInstance} WebpackPluginInstance */
/** @typedef {import("../types").WebpackGlobalEnvironment} WebpackGlobalEnvironment */


/**
 * @method upload
 * @param {WebpackEnvironment} env
 * @param {WebpackGlobalEnvironment} gEnv Webpack global environment
 * @param {WebpackConfig} wpConfig Webpack config object
 * @returns {WebpackPluginInstance | undefined}
 */
const upload = (env, gEnv, wpConfig) =>
{
    /** @type {WebpackPluginInstance | undefined} */
    let plugin;
    if (env.build === "extension")
    {
        plugin =
        {
            apply: (compiler) =>
            {
                compiler.hooks.afterDone.tap("AfterDoneUploadPlugin", (statsData) =>
                {
                    if (statsData.hasErrors()) { return; }
                    // if (!gEnv.uploadCount) { gEnv.uploadCount = 0; }
                    // ++gEnv.uploadCount;
                    // if (gEnv.uploadCount === 2)
                    // {
                    const stats = statsData.toJson(),
                          assets = stats.assets?.filter(a => a.type === "asset"),
                          assetChunks = stats.assetsByChunkName;
                    if (assets && assetChunks)
                    {
                        const assetNames = assets.map(a => a.name);
                        // Object.keys(assetChunks).forEach((k) =>
                        // {
                        //     const asset = assets.find(a => a.name === assetChunks[k][0]);
                        //     if (asset && asset.chunkNames)
                        //     {
                        //         setAssetState(asset, env, wpConfig);
                        //     }
                        // });
                        sourceMapFiles(assetNames, env);
                        _upload(assetNames, env);
                    }
                    // }
                });
            }
        };
    }
    return plugin;
};


/**
 * @method sourceMapFiles
 * @param {String[]} assetNames
 * @param {WebpackEnvironment} env
 */
const sourceMapFiles = (assetNames, env) =>
{
    try {
        if (env.environment === "prod") {
            renameSync(join(env.paths.dist, "taskexplorer.js.map"), join(env.paths.temp, "taskexplorer.js.map"));
        }
        else {
            copyFileSync(join(env.paths.dist, "taskexplorer.js.map"), join(env.paths.temp, "taskexplorer.js.map"));
        }
        copyFileSync(join(env.paths.build, "node_modules", "source-map", "lib", "mappings.wasm"), join(env.paths.temp, "mappings.wasm"));
    } catch {}
};


/**
 * @method _upload
 * @param {String[]} assetNames
 * @param {WebpackEnvironment} env
 */
const _upload = (assetNames, env) =>
{
    const host = "app1.spmeesseman.com";
    if (JSON.stringify(env.state.hash.current) === JSON.stringify(env.state.hash.current))
    {
        writeInfo(`content hash unchanged, resource upload to ${host} will be skipped`, figures.color.star);
        return;
    }

    const user = "smeesseman",
          rBasePath = "/var/www/app1/res/app",
          /** @type {import("child_process").SpawnSyncOptions} */
          spawnSyncOpts = { cwd: env.paths.build, encoding: "utf8", shell: true },
          sshAuth = process.env.SPMEESSEMAN_COM_APP1_SSH_AUTH_SMEESSEMAN || "InvalidAuth";

    const plinkArgs = [
        "-ssh",   // force use of ssh protocol
        "-batch", // disable all interactive prompts
        "-pw",    // authenticate
        sshAuth,  // auth key
        `${user}@${host}`
    ];

    const pscpArgs = [
        "-pw",    // authenticate
        sshAuth,  // auth key
        // "-q",  // quiet, don't show statistics
        "-r",     // copy directories recursively
        env.paths.temp,
        `${user}@${host}:"${rBasePath}/${env.app.name}/v${env.app.version}"`
    ];

    try {
        const plinkArgsFull = [ ...plinkArgs, `mkdir ${rBasePath}/${env.app.name}/v${env.app.version}/${env.environment}` ];
        writeInfo(`upload resource files to ${host}`, figures.color.star);
        writeInfo(`   create dir    : plink ${plinkArgsFull.map((v, i) => (i !== 3 ? v : "<PWD>")).join(" ")}`);
        spawnSync("plink", [ ...plinkArgs, `mkdir ${rBasePath}/${env.app.name}` ], spawnSyncOpts);
        spawnSync("plink", [ ...plinkArgs, `mkdir ${rBasePath}/${env.app.name}/v${env.app.version}` ], spawnSyncOpts);
        spawnSync("plink", plinkArgsFull, spawnSyncOpts);
        writeInfo(`   upload files  : pscp ${pscpArgs.map((v, i) => (i !== 1 ? v : "<PWD>")).join(" ")}`);
        spawnSync("pscp", pscpArgs, spawnSyncOpts);
        writeInfo("successfully uploaded resource files", figures.color.star);
    }
    catch (e) {
        writeInfo("error uploading resource files:", figures.color.error);
        writeInfo("   " + e.message.trim(), figures.color.error);
    }
};


module.exports = upload;
