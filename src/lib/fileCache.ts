/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { join } from "path";
import { TeWrapper } from "./wrapper";
import { ContextKeys } from "./context";
import { statusBarItem } from "./statusBarItem";
import * as taskTypeUtils from "./utils/taskTypeUtils";
import { IDictionary, ICacheItem } from "../interface";
import { findFiles, numFilesInDirectory } from "./utils/fs";
import { workspace, RelativePattern, WorkspaceFolder, Uri, commands } from "vscode";


export class TeFileCache
{

    private cancel = false;
    private firstRun = true;
    private cacheBusy = false;
    private taskGlobs: any = {};
    private cacheBuilding = false;
    private taskFilesMap: IDictionary<ICacheItem[]>;
    private projectFilesMap: IDictionary<IDictionary<string[]>>;
    private projectToFileCountMap: IDictionary<IDictionary<number>>;


    constructor(private readonly wrapper: TeWrapper)
    {
        void commands.executeCommand("setContext", "vscodeTaskExplorer.parsedFiles", []);
        this.taskFilesMap = {};
        this.projectFilesMap = {};
        this.projectToFileCountMap = {};
    }


    /**
     * @method addFileToCache
     * @since 3.0.0
     */
    addFileToCache = (taskType: string, uri: Uri, logPad: string) =>
    {
        this.wrapper.log.methodStart("add file to cache", 1, logPad);
        const wsf = workspace.getWorkspaceFolder(uri) as WorkspaceFolder,
            item = { uri, project: wsf.name };
        this.addToMappings(taskType, item, logPad + "   ");
        this.wrapper.log.methodDone("add file to cache", 1, logPad);
    };


    private addFromStorage = async() =>
    {
        await this.startBuild();
        statusBarItem.update("Loading tasks from file cache...");
        this.taskFilesMap = await this.wrapper.storage.get2<IDictionary<ICacheItem[]>>("fileCacheTaskFilesMap", {});
        this.projectFilesMap = await this.wrapper.storage.get2<IDictionary<IDictionary<string[]>>>("fileCacheProjectFilesMap", {});
        this.projectToFileCountMap = await this.wrapper.storage.get2<IDictionary<IDictionary<number>>>("fileCacheProjectFileToFileCountMap", {});
        await this.finishBuild(true);
    };


    /**
     * @method addFolderToCache
     *
     * @param folder The folder to be added to the cache.  This folder should be a sub-folder within
     * a workspace folder.  Workspace folders are handled differently and are handled by the
     * 'addWsFolderToCache()` function.  This function is calledfrom thefileWatcher instance when
     * a new folder is created, or copied into a workspace.
     *
     * @since 3.0.0
     */
    addFolder = async(folder: Uri, logPad: string) =>
    {
        let numFilesFound = 0;
        const licMgr = this.wrapper.licenseManager;
        const wsFolder = workspace.getWorkspaceFolder(folder) as WorkspaceFolder;

        this.wrapper.log.methodStart("add folder to cache", 1, logPad, false, [[ "folder", folder.fsPath ]]);

        const numFiles = await numFilesInDirectory(folder.fsPath);
        if (numFiles > 0)
        {
            await this.startBuild();

            const providers = this.wrapper.providers;
            const taskProviders = ([ ...Object.keys(providers), ...taskTypeUtils.getWatchTaskTypes() ]).sort((a, b) => {
                return taskTypeUtils.getTaskTypeFriendlyName(a).localeCompare(taskTypeUtils.getTaskTypeFriendlyName(b));
            });

            for (const providerName of taskProviders)
            {
                const isExternal = providers[providerName] && providers[providerName].isExternal;
                if (!this.cancel && numFilesFound < numFiles && (isExternal || this.wrapper.utils.isTaskTypeEnabled(providerName)))
                {
                    let glob;
                    if (!taskTypeUtils.isWatchTask(providerName))
                    {
                        const provider = providers[providerName];
                        glob = provider?.getGlobPattern();
                    }
                    if (!glob) {
                        glob = this.wrapper.utils.getGlobPattern(providerName);
                    }

                    const dspTaskType = taskTypeUtils.getTaskTypeFriendlyName(providerName);
                    statusBarItem.update(`Scanning for ${dspTaskType} tasks in project ${wsFolder.name}`);

                    if (!isExternal)
                    {
                        let numFilesAdded = 0;
                        this.wrapper.log.write(`   adding new directory to '${providerName}' file cache`, 2, logPad);
                        try
                        {   let maxFiles = Infinity;
                            this.wrapper.log.write(`      Start folder scan for ${providerName} tasks`, 3, logPad);
                            if (licMgr && !licMgr.isLicensed())
                            {
                                const cachedFileCount = this.getTaskFileCount();
                                maxFiles = licMgr.getMaxNumberOfTaskFiles() - cachedFileCount;
                                if (maxFiles <= 0)
                                {
                                    this.wrapper.utils.showMaxTasksReachedMessage(licMgr);
                                    this.wrapper.log.write(`      Max files limit (${licMgr.getMaxNumberOfTaskFiles()}) already reached (no license)`, 2, logPad);
                                    await this.finishBuild();
                                    return numFilesFound;
                                }
                                this.wrapper.log.write(`      Set max files to scan at ${maxFiles} files (no license)`, 2, logPad);
                            }
                            const paths = await findFiles(glob, { nocase: true, ignore: this.getExcludesPatternGlob(), cwd: folder.fsPath  });
                            for (const fPath of paths)
                            {
                                const uriFile = Uri.file(join(folder.fsPath, fPath));
                                numFilesAdded += this.addToMappings(providerName, { uri: uriFile, project: wsFolder.name }, logPad + "      ");
                            }
                            this.projectToFileCountMap[wsFolder.name][providerName] += numFilesAdded;
                            this.wrapper.log.write(`      Folder scan complete, found ${paths.length} ${providerName} file(s), added ${numFilesAdded} file(s)`, 3, logPad);
                        }
                        catch (e: any) { /* istanbul ignore next */ this.wrapper.log.error(e); }
                        numFilesFound += numFilesAdded;
                        this.wrapper.log.value("      # of files added", numFilesAdded, 3);
                        this.wrapper.log.write(`   finished adding new directory to '${providerName}' file cache`, 3, logPad);
                    }
                    else {
                        await this.wrapper.utils.timeout(50);
                    }
                }
            }
            await this.finishBuild();
        }

        this.wrapper.log.methodDone("add folder to cache", 1, logPad, [[ "# of files in directory", numFiles ], [ "# of files matched", numFiles ]]);
        return numFilesFound;
    };


    private addWsFolder = async(folder: WorkspaceFolder, taskType: string, logPad: string) =>
    {
        let numFilesFound = 0;
        this.wrapper.log.methodStart(`scan workspace project folder for ${taskType} tasks`, 1, logPad, logPad === "", [[ "folder", folder.name ]]);

        const providers = this.wrapper.providers;
        const externalProvider = providers[taskType]  && providers[taskType].isExternal;
        if (!this.cancel && (externalProvider || this.wrapper.utils.isTaskTypeEnabled(taskType)))
        {
            this.wrapper.log.value(`   building workspace project ${taskType} task file cache`, taskType, 3, logPad);
            numFilesFound += await this.buildTaskTypeCache(taskType, folder, false, logPad + "   ");
            this.wrapper.log.value(`   completed building project ${taskType} task file cache`, taskType, 3, logPad);
        }

        if (this.cancel) {
            this.wrapper.log.write("   add workspace project folder to cache cancelled", 3, logPad);
        }
        this.wrapper.log.methodDone(`scan workspace project folder for ${taskType} tasks`, 1, logPad, [[ "# of files matched", numFilesFound ]]);
        return numFilesFound;
    };


    addWsFolders = async(wsf: readonly WorkspaceFolder[] | undefined, logPad = "") =>
    {
        let numFilesFound = 0;
        if (wsf)
        {
            this.wrapper.log.methodStart("add workspace project folders", 1, logPad, logPad === "");
            await this.startBuild();
            if (!this.cancel)
            {
                const providers = this.wrapper.providers;
                const taskProviders = ([ ...Object.keys(providers), ...taskTypeUtils.getWatchTaskTypes() ]).sort((a, b) => {
                    return taskTypeUtils.getTaskTypeFriendlyName(a).localeCompare(taskTypeUtils.getTaskTypeFriendlyName(b));
                });

                for (const tasktype of taskProviders)
                {
                    for (const f of wsf)
                    {
                        numFilesFound += await this.addWsFolder(f, tasktype, logPad + "   ");
                        if (this.cancel) {
                            break;
                        }
                    }
                    if (this.cancel) {
                        break;
                    }
                }
            }
            await this.finishBuild();
            this.wrapper.log.value("   was cancelled", this.cancel, 3);
            this.wrapper.log.methodDone("add workspace project folders", 1, logPad, [[ "# of file found", numFilesFound ]]);
        }
        return numFilesFound;
    };


    /**
     * @method addToMappings
     * @since 3.0.0
     */
    private addToMappings = (taskType: string, item: ICacheItem, logPad: string) =>
    {
        this.wrapper.log.methodStart("add item to mappings", 4, logPad, false, [[ "task type", taskType ], [ "file", item.uri.fsPath ]]);
        this.initMaps(taskType, item.project);
        const added = { c1: 0, c2: 0 };
        if (!this.taskFilesMap[taskType].find(i => i.uri.fsPath.toLowerCase() === item.uri.fsPath.toLowerCase()))
        {
            this.taskFilesMap[taskType].push(item);
            ++added.c1;
        }
        if (!this.projectFilesMap[item.project][taskType].find(fsPath => fsPath.toLowerCase() === item.uri.fsPath.toLowerCase()))
        {
            this.projectFilesMap[item.project][taskType].push(item.uri.fsPath);
            ++added.c2;
        }
        this.wrapper.log.methodDone("add item to mappings", 4, logPad, [[ "items added", added.c1 ], [ "counts equal", added.c1 === added.c2 ]]);
        return added.c1;
    };


    private buildFolderCache = async (folder: WorkspaceFolder, taskType: string, fileGlob: string, logPad: string) =>
    {
        let numFilesFound = 0;
        const licMgr = this.wrapper.licenseManager;
        const logMsg = "Scan project " + folder.name + " for " + taskType + " tasks",
            dspTaskType = taskTypeUtils.getTaskTypeFriendlyName(taskType);

        this.wrapper.log.methodStart(logMsg, 1, logPad);
        statusBarItem.update(`Scanning for ${dspTaskType} tasks in project ${folder.name}`);

        this.initMaps(taskType, folder.name);

        const providers = this.wrapper.providers,
            isExternal = providers[taskType] && providers[taskType].isExternal,
            fsChanged = this.isFsChanged(taskType, folder.name),
            globChanged = this.isGlobChanged(taskType, fileGlob);

        this.wrapper.log.value("   glob changed", globChanged, 3, logPad);
        this.wrapper.log.value("   fIlesystem changed", fsChanged, 3, logPad);
        this.wrapper.log.value("   is external", isExternal, 3, logPad);

        if (!isExternal && (globChanged || fsChanged))
        {
            try
            {   let maxFiles = Infinity;
                this.wrapper.log.write(`   Start workspace folder scan for ${taskType} files`, 3, logPad);
                if (licMgr && !licMgr.isLicensed())
                {
                    const cachedFileCount = this.getTaskFileCount();
                    maxFiles = licMgr.getMaxNumberOfTaskFiles() - cachedFileCount;
                    if (maxFiles <= 0) {
                        this.wrapper.log.write(`   Max files limit (${licMgr.getMaxNumberOfTaskFiles()}) already reached (no license)`, 2, logPad);
                        this.wrapper.utils.showMaxTasksReachedMessage(licMgr);
                        return numFilesFound;
                    }
                    this.wrapper.log.write(`   Set max files to scan at ${maxFiles} files (no license)`, 3, logPad);
                }
                const relativePattern = new RelativePattern(folder, fileGlob),
                    paths = await workspace.findFiles(relativePattern, this.getExcludesPatternVsc(folder), maxFiles); // ,
                    // USE_GLOB: paths = await globAsync(fileGlob, { cwd: folder.uri.fsPath, ignore: getExcludesPatternsGlob() });
                for (const fPath of paths)
                {
                    // USE_GLOB: const uriFile = Uri.file(join(folder.uri.fsPath, fPath));
                    this.addToMappings(taskType, { uri: fPath /* USE_GLOB:uriFile */, project: folder.name }, logPad + "   ");
                    if (++numFilesFound === maxFiles) {
                        this.wrapper.log.write(`   Max files to scan reached at ${licMgr.getMaxNumberOfTaskFiles()} files (no license)`, 3, logPad);
                        break;
                    }
                    if (this.cancel) {
                        break;
                    }
                }
                this.projectToFileCountMap[folder.name][taskType] = numFilesFound;
                this.wrapper.log.write(`   Workspace folder scan completed, found ${numFilesFound} ${taskType} files`, 3, logPad);
            }
            catch (e: any) { /* istanbul ignore next */ this.wrapper.log.error(e); }
        }
        else if (isExternal) {
            await this.wrapper.utils.timeout(50);
        }

        this.wrapper.log.methodDone(logMsg, 1, logPad);
        return numFilesFound;
    };


    buildTaskTypeCache = async(taskType: string, wsFolder: WorkspaceFolder | undefined, setCacheBuilding: boolean, logPad: string) =>
    {
        let numFilesFound = 0;
        const providerType = taskTypeUtils.isScriptType(taskType) ? "script" : taskType;
        this.wrapper.log.methodStart("build file cache", 1, logPad, false, [
            [ "folder", !wsFolder ? "entire workspace" : wsFolder.name ], [ "task type", taskType ],
            [ "task provider type", providerType ], [ "setCacheBuilding", setCacheBuilding.toString() ]
        ]);

        if (setCacheBuilding) {
            await this.startBuild();
        }

        // const glob = this.wrapper.utils.getGlobPattern(taskType);
        let glob;
        if (!taskTypeUtils.isWatchTask(taskType))
        {
            const providers = this.wrapper.providers;
            glob = providers[taskType].getGlobPattern();
        }
        if (!glob) {
            glob = this.wrapper.utils.getGlobPattern(taskType);
        }
        this.wrapper.log.value("   glob", glob, 1, logPad);

        //
        // If 'wsFolder' if falsey, build the entire cache.  If truthy, build the cache for the
        // specified folder only
        //
        if (!wsFolder)
        {
            this.wrapper.log.write("   Scan all projects for taskType '" + taskType + "' (" + providerType + ")", 1, logPad);
            for (const folder of workspace.workspaceFolders as readonly WorkspaceFolder[])
            {
                numFilesFound += await this.buildFolderCache(folder, taskType, glob, logPad + "   ");
                if (this.cancel) {
                    break;
                }
            }
        }
        else {
            numFilesFound = await this.buildFolderCache(wsFolder, taskType, glob, logPad + "   ");
        }

        if (setCacheBuilding) {
            await this.finishBuild();
        }

        this.wrapper.log.methodDone("build file cache", 1, logPad);
        return numFilesFound;
    };


    cancelBuildCache = async() =>
    {   //
        // Note 1/21/23.  This may not be needed anymore, as we now wait for any caching
        // operation to finish in the main extension module's `deactivate` function as
        // opposed to cancelling it.
        //
        if (this.cacheBuilding)
        {
            this.cancel = true;
            while (this.cacheBuilding) {
                await this.wrapper.utils.timeout(100);
            }
        }
    };


    /**
     * @method clearMaps
     * @since 3.0.0
     */
    private clearMaps = () =>
    {
        this.taskFilesMap = {};
        this.projectFilesMap = {};
        this.projectToFileCountMap = {};
        this.taskGlobs = {};
    };


    private finishBuild = async(skipPersist?: boolean) =>
    {
        const taskFiles: string[] = [];
            // taskTypes: string[] = [];
        if (skipPersist !== true) {
            this.persistCache();
        }
        for (const taskType of Object.keys(this.taskFilesMap))
        {
            // taskTypes.push(taskType);
            for (const cacheItem of this.taskFilesMap[taskType]) {
                taskFiles.push(cacheItem.uri.fsPath);
            }
        }
        taskFiles.sort();
        await this.wrapper.contextTe.setContext(ContextKeys.TaskFiles, taskFiles);
        // await commands.executeCommand("setContext", "vscodeTaskExplorer.taskTypes", taskTypes);
        statusBarItem.hide();
        this.cacheBuilding = false;
        this.cancel = false;
    };


    /**
     * @method getExcludesPatternGlob
     * @since 3.0.0
     */
    private getExcludesPatternGlob = () =>
    {
        const excludes: string[] = this.wrapper.config.get("exclude");
        return [ "**/node_modules/**", "**/work/**", ...excludes ];
    };


    private getExcludesPatternVsc = (folder: string | WorkspaceFolder): RelativePattern =>
    {
        const excludes: string[] = this.wrapper.config.get("exclude"),
            multiFilePattern = this.wrapper.utils.getCombinedGlobPattern("**/node_modules/**,**/work/**", excludes);
        return new RelativePattern(folder, multiFilePattern);
    };


    getTaskFiles = (taskType: string) => this.taskFilesMap[taskType];


    /**
     * @method getTaskFileCount
     * @since 3.0.0
     */
    getTaskFileCount = () =>
    {
        let count = 0;
        Object.values(this.taskFilesMap).forEach((v) =>
        {
            count += v.length;
        });
        return count;
    };


    /**
     * @method initMaps
     * @since 3.0.0
     */
    private initMaps = (taskType: string, project: string) =>
    {
        if (!this.taskFilesMap[taskType]) {
            this.taskFilesMap[taskType] = [];
        }
        if (!this.projectToFileCountMap[project]) {
            this.projectToFileCountMap[project] = {};
        }
        if (!this.projectToFileCountMap[project][taskType]) {
            this.projectToFileCountMap[project][taskType] = -1;
        }
        if (!this.projectFilesMap[project]) {
            this.projectFilesMap[project] = {};
        }
        if (!this.projectFilesMap[project][taskType]) {
            this.projectFilesMap[project][taskType] = [];
        }
    };


    isBusy = () => this.cacheBuilding === true ||  this.cacheBusy === true;


    /**
     * @method isFsChanged
     * @since 3.0.0
     */
    private isFsChanged = (taskType: string, project: string) =>
    {
        let fsChanged = true;
        /* istanbul ignore else */
        if (this.projectFilesMap[project] && this.projectFilesMap[project][taskType])
        {
            fsChanged = this.projectToFileCountMap[project][taskType] !== this.projectFilesMap[project][taskType].length;
        }
        return fsChanged;
    };


    /**
     * @method isGlobChanged
     * @since 3.0.0
     */
    private isGlobChanged = (taskType: string, fileGlob: string) =>
    {
        let globChanged = !this.taskGlobs[taskType];
        if (this.taskGlobs[taskType] && this.taskGlobs[taskType] !== fileGlob) {
            globChanged = true;
        }
        this.taskGlobs[taskType] = fileGlob;
        return globChanged;
    };


    /**
     * @method persistCache
     * @since 3.0.0
     */
    persistCache = (clear?: boolean, force?: boolean) =>
    {   //
        // This all has to be synchronous because if it's not, the updates do not
        // work when called from the extension's deactivate() method. Dumb.  And the
        // docs say the deactivate() method can be async.  BS.  THere was some weird
        // stuff going on when this was all started as async and then added to the
        // deactivate() method.
        //
        if (clear !== true && (force || this.wrapper.config.get<boolean>("enablePersistentFileCaching")))
        // if (clear !== true && (!teApi.isTests() || this.wrapper.config.get<boolean>("enablePersistentFileCaching")))
        {
            const text = statusBarItem.get();
            statusBarItem.update("Persisting file cache...");
            this.wrapper.storage.update2Sync("fileCacheTaskFilesMap", this.taskFilesMap);
            this.wrapper.storage.update2Sync("fileCacheProjectFilesMap", this.projectFilesMap);
            this.wrapper.storage.update2Sync("fileCacheProjectFileToFileCountMap", this.projectToFileCountMap);
            statusBarItem.update(text);
        }
        else if (clear === true)
        {
            this.wrapper.storage.update2Sync("fileCacheTaskFilesMap", undefined);
            this.wrapper.storage.update2Sync("fileCacheProjectFilesMap", undefined);
            this.wrapper.storage.update2Sync("fileCacheProjectFileToFileCountMap", undefined);
        }
    };


    /**
     * @method registerFileCache
     * Clears the file cache, and either performs the workspace file scan to build/rebuild it,
     * or loads it from storage.
     */
    rebuildCache = async(logPad: string, forceForTests?: boolean) =>
    {
        let numFilesFound = 0;

        this.wrapper.log.methodStart("rebuild cache", 1, logPad, logPad === "");
        //
        // Set 'cache busy' flag used in isBusy()
        //
        this.cacheBusy = true;
        //
        // Clear the cache maps.  This sets all 3 IDictionary map objects and the task glob
        // mapping to empty objects {}
        //
        this.clearMaps();

        //
        // Load from storage maybe.  Storage-2 functions are used for persistence in the
        // development environment and the tests.
        //
        if (this.firstRun || forceForTests)
        {
            if (this.wrapper.config.get<boolean>("enablePersistentFileCaching"))
            {
                await this.addFromStorage();
                numFilesFound = this.getTaskFileCount();
            }
            this.firstRun = false;
        }

        //
        // If we didn't load from storage, then start the scan to build to file cache
        //
        if (numFilesFound === 0) {
            numFilesFound = await this.addWsFolders(workspace.workspaceFolders, logPad + "   ");
            if (numFilesFound === 0) {
                this.clearMaps();
            }
        }

        this.cacheBusy = false;
        this.wrapper.log.methodDone("rebuild cache", 1, logPad);
        return numFilesFound;
    };


    removeFileFromCache = (taskType: string, uri: Uri, logPad: string) =>
    {
        this.wrapper.log.methodStart("remove file from cache", 2, logPad, false, [[ "task type", taskType ], [ "path", uri.fsPath ]]);
        const numFilesRemoved = this.removeFromMappings(taskType, uri, false, logPad + "   ");
        this.wrapper.log.methodDone("remove file from cache", 2, logPad);
        return numFilesRemoved;
    };


    /**
     * @method removeFolderFromCache
     *
     * @param folder The folder to be removed from the cache.  This folder should be a sub-folder within
     * a workspace folder.  Workspace folders are handled differently and are handled by the
     * 'removeWsFolders()` function.  This function is calledfrom the fileWatcher instance when
     * a new folder is deleted or renamed.
     *
     * @since 3.0.0
     */
    removeFolderFromCache = (uri: Uri, logPad: string) =>
    {
        let numFilesRemoved = 0;
        this.wrapper.log.methodStart("remove folder from cache", 2, logPad, false, [[ "folder", uri.fsPath ]]);
        Object.keys(this.taskFilesMap).forEach((taskType) =>
        {
            this.wrapper.log.write(`   Processing files cached for ${taskType} tasks`, 2, logPad);
            numFilesRemoved += this.removeFromMappings(taskType, uri, true, logPad + "   ");
        });
        this.wrapper.log.methodDone("remove folder from cache", 1, logPad);
        return numFilesRemoved;
    };


    /**
     * @method removeTaskTypeFromCache
     * @since 3.0.0
     */
    removeTaskTypeFromCache = (taskType: string, logPad: string) =>
    {
        this.wrapper.log.methodStart("remove task type from cache", 2, logPad, false, [[ "task type", taskType ]]);
        const numFilesRemoved = this.removeFromMappings(taskType, undefined, true, logPad + "   ");
        this.wrapper.log.methodDone("remove task type from cache", 2, logPad, [[ "# of files removed", numFilesRemoved ]]);
        return numFilesRemoved;
    };


    /**
     * @method removeFromMappings
     * @since 3.0.0
     */
    private removeFromMappings = (taskType: string, uri: Uri | WorkspaceFolder | undefined, isFolder: boolean, logPad: string) =>
    {
        let folderUri: Uri | undefined;
        let wsFolders: readonly WorkspaceFolder[];
        this.wrapper.log.methodStart("remove item from mappings", 3, logPad, false, [[ "task type", taskType ]]);

        if (uri === undefined)
        {
            wsFolders = workspace.workspaceFolders as readonly WorkspaceFolder[];
        }
        else if (uri instanceof Uri)
        {
            const wsf = workspace.getWorkspaceFolder(uri) as WorkspaceFolder;
            this.wrapper.log.value("   path", uri.fsPath, 3);
            wsFolders = [ wsf ];
            folderUri = uri;
        }
        else {
            wsFolders = [ uri ];
            folderUri = wsFolders[0].uri;
        }

        const removed = {
            c1: 0, c2: 0
        };

        for (const wsf of wsFolders)
        {
            this.initMaps(taskType, wsf.name);

            this.projectFilesMap[wsf.name][taskType].slice().reverse().forEach((fsPath, index, object) =>
            {
                if (folderUri !== undefined)
                {
                    if (fsPath === folderUri.fsPath || (isFolder && fsPath.startsWith(folderUri.fsPath)))
                    {
                        this.wrapper.log.value(`   remove from project files map (${index})`, fsPath, 3, logPad);
                        this.projectFilesMap[wsf.name][taskType].splice(object.length - 1 - index, 1);
                        ++removed.c1;
                    }
                }
                else
                {   /* istanbul ignore else */
                    if (fsPath.startsWith(wsf.uri.fsPath))
                    {
                        this.wrapper.log.value(`   remove from project files map (${index})`, fsPath, 3, logPad);
                        this.projectFilesMap[wsf.name][taskType].splice(object.length - 1 - index, 1);
                        ++removed.c1;
                    }
                }
            });

            this.taskFilesMap[taskType].slice().reverse().forEach((item, index, object) =>
            {
                if (folderUri !== undefined)
                {
                    if (item.uri.fsPath === folderUri.fsPath || (isFolder && item.uri.fsPath.startsWith(folderUri.fsPath)))
                    {
                        this.wrapper.log.value(`   remove from task files map (${index})`, item.uri.fsPath, 3, logPad);
                        this.taskFilesMap[taskType].splice(object.length - 1 - index, 1);
                        ++removed.c2;
                    }
                }
                else
                {   /* istanbul ignore else */
                    if (item.project === wsf.name)
                    {
                        this.wrapper.log.value(`   remove from task files map (${index})`, item.uri.fsPath, 3, logPad);
                        this.taskFilesMap[taskType].splice(object.length - 1 - index, 1);
                        ++removed.c2;
                    }
                }
            });
        }

        if (uri === undefined && this.taskFilesMap[taskType])
        {
            this.wrapper.log.write("   clear task files map", 4, logPad);
            this.taskFilesMap[taskType] = [];
        }

        this.wrapper.log.methodDone("remove item from mappings", 4, logPad, [[ "items added", removed.c2 ], [ "counts equal", removed.c1 === removed.c2 ]]);
        return removed.c2;
    };


    removeWsFolders = (wsf: readonly WorkspaceFolder[], logPad: string) =>
    {
        let numFilesRemoved = 0;
        this.wrapper.log.methodStart("remove workspace folder", 1, logPad);
        for (const f of wsf)
        {
            this.wrapper.log.value("   workspace folder", f.name, 1, logPad);
            Object.keys(this.taskFilesMap).forEach((taskType) =>
            {
                const taskFilesRemoved = this.removeFromMappings(taskType, f, true, logPad + "      ");
                numFilesRemoved += taskFilesRemoved;
                this.wrapper.log.write(`   removed ${taskFilesRemoved} ${taskType} files`, 2, logPad);
            });
            delete this.projectToFileCountMap[f.name];
            delete this.projectFilesMap[f.name];
            this.wrapper.log.write(`   removed ${numFilesRemoved} total files`, 1, logPad);
        }
        this.wrapper.log.methodDone("remove workspace folder", 1, logPad);
        return numFilesRemoved;
    };


    private startBuild = async() =>
    {
        while (this.cacheBuilding === true) {
            await this.wrapper.utils.timeout(100);
        }
        this.cacheBuilding = true;
        statusBarItem.show();
    };

}
