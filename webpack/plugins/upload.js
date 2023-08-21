/* eslint-disable import/no-extraneous-dependencies */
// @ts-check

/**
 * @file plugin/upload.js
 * !!! This module uses 'plink' and 'pscp' from the PuTTY package: https://www.putty.org
 * !!! For first time build on fresh os install:
 * !!!   - create the environment variables WPBUILD_APP1_SSH_AUTH_*
 * !!!   - run a plink command manually to generate and trust the fingerprints:
 * !!!       plink -ssh -batch -pw <PWD> smeesseman@app1.spmeesseman.com "echo hello"
 * @version 0.0.1
 * @license MIT
 * @author Scott Meesseman @spmeesseman
 */

const { existsSync } = require("fs");
const WpBuildPlugin = require("./base");
const { join, basename } = require("path");
const { WebpackError } = require("webpack");
const { RegexTestsChunk } = require("../utils");
const { copyFile, rm, readdir, rename, mkdir } = require("fs/promises");

/** @typedef {import("../utils").WpBuildApp} WpBuildApp */
/** @typedef {import("../types").WebpackCompiler} WebpackCompiler */
/** @typedef {import("../types").WebpackCompilation} WebpackCompilation */
/** @typedef {import("./base").WpBuildPluginOptions} WpBuildPluginOptions */


class WpBuildUploadPlugin extends WpBuildPlugin
{
    /**
     * @class WpBuildUploadPlugin
     * @param {WpBuildPluginOptions} options Plugin options to be applied
     */
	constructor(options)
    {
        super(options);
        this.initGlobalEnvObject("upload", 0, "callCount", "readyCount");
    }


    /**
     * @function Called by webpack runtime to initialize this plugin
     * @override
     * @member apply
     * @param {WebpackCompiler} compiler the compiler instance
     * @returns {void}
     */
    apply(compiler)
    {
        this.onApply(compiler,
        {
            uploadDebugSupportFiles: {
                async: true,
                hook: "afterEmit",
                callback: this.debugSupportFiles.bind(this)
            },
            cleanup: {
                async: true,
                hook: "done",
                callback: this.cleanup.bind(this)
            }
        });
    }


    /**
     * @function
     * @private
     * @param {WebpackCompilation} _compilation
     * @throws {WebpackError}
     */
    async cleanup(_compilation)
    {
        const tmpUploadPath = join(this.app.build.paths.temp, this.app.mode);
        try
        {   if (existsSync(tmpUploadPath))
            {
                const tmpFiles = await readdir(tmpUploadPath);
                if (tmpFiles.length > 0)
                {
                    await rm(tmpUploadPath, { recursive: true, force: true });
                }
                this.app.logger.write("upload plugin cleanup completed");
        }   }
        catch (e) {
            this.handleError(e);
        }
    };


    /**
     * @function
     * @private
     * @param {WebpackCompilation} compilation
     * @throws {WebpackError}
     */
    async debugSupportFiles(compilation)
    {   //
        // `The lBasePath` variable is a temp directory that we will create in the in
        // the OS/env temp dir.  We will move only files that have changed content there,
        // and perform only one upload when all builds have completed.
        //
        const app = this.app,
              logger = app.logger,
              toUploadPath = join(app.build.paths.temp, app.mode);

        if (!app.global.runtimeVars) {
            return;
        }

        logger.write("upload debug support files", 1);
        this.compilation = compilation;
        if (!existsSync(toUploadPath)) {
            await mkdir(toUploadPath);
        }

        for (const chunk of Array.from(compilation.chunks).filter(c => c.canBeInitial() && c.name && !RegexTestsChunk.test(c.name)))
        {
            for (const file of Array.from(chunk.files).filter(f => this.matchObject(f)))
            {
                const asset = compilation.getAsset(file);
                if (asset && chunk.name && (app.global.runtimeVars.next[chunk.name] !== app.global.runtimeVars.current[chunk.name] || !app.global.runtimeVars.previous[chunk.name]))
                {
                    const distPath = this.app.getDistPath();
                    logger.value("   queue asset for upload", logger.tag(file), 2);
                    logger.value("      asset info", JSON.stringify(asset.info), 4);
                    await copyFile(join(distPath, file), join(toUploadPath, file));
                    if (asset.info.related?.sourceMap)
                    {
                        const sourceMapFile = asset.info.related.sourceMap.toString();
                        logger.value("   queue sourcemap for upload", logger.tag(sourceMapFile), 2);
                        if (app.mode === "production") {
                            logger.value("   remove production sourcemap from distribution", sourceMapFile, 3);
                            await rename(join(distPath, sourceMapFile), join(toUploadPath, sourceMapFile));
                        }
                        else {
                            await copyFile(join(distPath, sourceMapFile), join(toUploadPath, sourceMapFile));
                        }
                    }
                }
                else /* istanbul ignore else */if (asset) {
                    logger.value("   unchanged, skip asset upload", logger.tag(file), 2);
                }
                else {
                    logger.value("   unknown error, skip asset upload", logger.tag(file), 2);
                }
            }
        }
        const filesToUpload = await readdir(toUploadPath);
        if (filesToUpload.length === 0)
        {
            logger.write("no assets to upload", 1, "");
            return;
        }

        const host = process.env.WPBUILD_APP1_SSH_UPLOAD_HOST,
              user = process.env.WPBUILD_APP1_SSH_UPLOAD_USER,
              rBasePath = process.env.WPBUILD_APP1_SSH_UPLOAD_PATH,
              sshAuth = process.env.WPBUILD_APP1_SSH_UPLOAD_AUTH,
              sshAuthFlag = process.env.WPBUILD_APP1_SSH_UPLOAD_FLAG;

        if (!host || !user || !rBasePath ||  !sshAuth || !sshAuthFlag)
        {
            this.compilation.errors.push(new WebpackError("Required environment variables for upload are not set"));
            return;
        }

        const plinkCmds = [
            `mkdir ${rBasePath}/${app.rc.name}`,
            `mkdir ${rBasePath}/${app.rc.name}/v${app.pkgJson.version}`,
            `mkdir ${rBasePath}/${app.rc.name}/v${app.pkgJson.version}/${app.mode}`,
            `rm -f ${rBasePath}/${app.rc.name}/v${app.pkgJson.version}/${app.mode}/*.*`
        ];
        if (app.mode === "production") { plinkCmds.pop(); }

        const plinkArgs = [
            "-ssh",       // force use of ssh protocol
            "-batch",     // disable all interactive prompts
            sshAuthFlag,  // auth flag
            sshAuth,      // auth key
            `${user}@${host}`,
            plinkCmds.join(";")
        ];

        const pscpArgs = [
            sshAuthFlag,  // auth flag
            sshAuth,      // auth key
            "-q",         // quiet, don't show statistics
            "-r",         // copy directories recursively
            toUploadPath, // directory containing the files to upload, the "directpory" itself (prod/dev/test) will be
            `${user}@${host}:"${rBasePath}/${app.rc.name}/v${app.pkgJson.version}"` // uploaded, and created if not exists
        ];

        await copyFile(join(this.app.getRcPath("base"), "node_modules", "source-map", "lib", "mappings.wasm"), join(toUploadPath, "mappings.wasm"));

        logger.write(`   upload resource files to ${host}`, 1, "");
        try
        {
            logger.write("   plink: create / clear remmote directory", 1);
            await this.exec("plink " + plinkArgs.join(" "), "plink", [ "cannot create directory", "File exists" ]);
            logger.write("   pscp:  upload files", 1, "");
            await this.exec("pscp " + pscpArgs.join(" "), "pscp");
            filesToUpload.forEach((f) =>
                logger.write(`   ${logger.icons.color.successTag} ${logger.withColor(`uploaded ${basename(f)}`, logger.colors.grey)}`, 1)
            );
            logger.write("successfully uploaded resource files", 1);
        }
        catch (e)
        {
            logger.error("error uploading resource files:");
            filesToUpload.forEach((f) =>
                logger.write(`   ${logger.icons.color.errorTag} ${logger.withColor(`upload ${basename(f)} failed`, logger.colors.grey)}`, 1)
            );
            logger.error(e);
        }
        finally {
            await rm(toUploadPath, { recursive: true, force: true });
        }
    }
}


/**
 * Returns a `WpBuildUploadPlugin` instance if appropriate for the current build
 * environment. Can be enabled/disable in .wpconfigrc.json by setting the `plugins.upload`
 * property to a boolean value of `true` or `false`
 * @module wpbuild.plugin.upload
 * @function upload
 * @param {WpBuildApp} app
 * @returns {WpBuildUploadPlugin | undefined} plugin instance
 */
const upload = (app) => app.build.plugins.upload ? new WpBuildUploadPlugin({ app }) : undefined;


module.exports = upload;