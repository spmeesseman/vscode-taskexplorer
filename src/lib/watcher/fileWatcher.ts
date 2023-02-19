/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { extname } from "path";
import { TeWrapper } from "../wrapper";
import { ITeFileWatcher } from "../../interface";
import { Commands, executeCommand } from "../command/command";
import { getTaskTypes, isScriptType } from "../utils/taskTypeUtils";
import {
    Disposable, FileSystemWatcher, workspace, WorkspaceFolder, Uri, WorkspaceFoldersChangeEvent
} from "vscode";


export class TeFileWatcher implements ITeFileWatcher, Disposable
{

    private disposables: Disposable[];
    private currentEvent: any;
    private rootPath: string | undefined;
    private currentNumWorkspaceFolders: number | undefined;
    private eventQueue: any[] = [];
    private watchers: { [taskType: string]: FileSystemWatcher } = {};
    private watcherDisposables: { [taskType: string]: Disposable } = {};
    private dirWatcher: { watcher?: FileSystemWatcher; onDidCreate?: Disposable; onDidDelete?: Disposable } = {};


    constructor(private readonly wrapper: TeWrapper)
    {
        this.wrapper.log.methodStart("register file watchers", 1, "");
        this.disposables = [];

        //
        // Record ws folder count and `rootPath` (which is deprecated but still causes the dumb extension
        // restart when changed?) so that we can detect when a workspace is opened/closed, when a single
        // project workspace changes to multi-root, or when the aforementioned `rootPath` changes and the
        // extension is about  to get deactivated and then re-activated.
        //
        this.rootPath = workspace.rootPath;
        this.currentNumWorkspaceFolders = workspace.workspaceFolders?.length;
        this.wrapper.log.values(1, "   ", [
            [ "workspace root path (deprecated)", workspace.rootPath ],
            [ "workspace root folder[0] name", workspace.workspaceFolders ? workspace.workspaceFolders[0].name : /* istanbul ignore next */"undefined" ],
            [ "workspace root folder[0] path", workspace.workspaceFolders ? workspace.workspaceFolders[0].uri.fsPath : /* istanbul ignore next */"undefined" ],
            [ "current # of workspace folders", this.currentNumWorkspaceFolders ]
        ]);
        //
        // Watch for folder adds and deletes within the project folder
        //
        this.createDirWatcher();
        //
        // Refresh tree when folders/projects are added/removed from the workspace, in a multi-root ws
        //
        this.disposables.push(workspace.onDidChangeWorkspaceFolders(this.onWsFoldersChange));
        this.wrapper.log.methodDone("register file watchers", 1, "");
    }


    dispose()
    {
        this.disposables.forEach((d) => {
            d.dispose();
        });
        Object.values(this.watcherDisposables).forEach((d) => {
            d.dispose();
        });
        Object.values(this.watchers).filter(w => !!w).forEach((w) => {
            w.dispose();
        });
        this.watchers = {};
        this.watcherDisposables = {};
        this.disposables = [];
    }


    init = async(logPad: string) =>
    {   //
        // Watch individual task type files within the project folder
        //
        await this.createFileWatchers(logPad);
    };


    private createDirWatcher = () =>
    {
        this.dirWatcher.onDidCreate?.dispose();
        this.dirWatcher.onDidDelete?.dispose();
        this.dirWatcher.watcher?.dispose();
        /* istanbul ignore else */
        if (workspace.workspaceFolders)
        {
            this.dirWatcher.watcher = workspace.createFileSystemWatcher(this.getDirWatchGlob(workspace.workspaceFolders));
            this.dirWatcher.onDidCreate = this.dirWatcher.watcher.onDidCreate(async (e) => { await this.onDirCreate(e); }, null);
            this.dirWatcher.onDidDelete = this.dirWatcher.watcher.onDidDelete(async (e) => { await this.onDirDelete(e); }, null);
            this.disposables.push(this.dirWatcher.onDidCreate);
            this.disposables.push(this.dirWatcher.onDidDelete);
            this.disposables.push(this.dirWatcher.watcher);
        }
    };


    private createFileWatchers = async(logPad: string) =>
    {
        this.wrapper.log.methodStart("create file watchers", 1, logPad);
        const taskTypes = getTaskTypes();
        for (const taskType of taskTypes)
        {
            this.wrapper.log.write(`   create file watchers for task type '${taskType}'`, 1, logPad);
            if (this.wrapper.utils.isTaskTypeEnabled(taskType))
            {
                await this.registerFileWatcher(taskType, true, true, logPad + "   ");
            }
            else {
                this.wrapper.log.write(`   skip for task type '${taskType}' (disabled in settings)`, 1, logPad);
            }
        }
        this.wrapper.log.methodDone("create file watchers", 1, logPad);
    };


    private eventNeedsToBeQueued = (eventKind: string, uri: Uri) =>
    {
        let needs = true;
        if (eventKind === "modify file") // only check the queue for 'modify', not the current event
        {
            needs = !this.isSameEvent(this.eventQueue, eventKind, uri);
        }
        else if (eventKind === "create file")
        {
            const events = [ this.currentEvent, ...this.eventQueue ];
            needs = !events.find(e => e.event === "create directory" && uri.fsPath.startsWith(e.fsPath)) &&
                    !this.isSameEvent(events, eventKind, uri);
        }
        //
        // VSCode doesn't trigger file delete event when a dir is deleted
        //
        // else if (eventKind === "delete file") {
        //     const events = [ currentEvent, ...eventQueue ];
        //     needs = !events.find(e => e.event === "delete directory" && uri.fsPath.startsWith(e.fsPath)) &&
        //             !events.find(e => e.event === eventKind && uri.fsPath === e.fsPath);
        // }
        else {
            const events = [ this.currentEvent, ...this.eventQueue ];
            needs = !this.isSameEvent(events, eventKind, uri);
        }
        return needs;
    };


    private getDirWatchGlob = (wsFolders: readonly WorkspaceFolder[]) =>
    {
        this.wrapper.log.write("   Build file watcher glob", 2);
        const watchPaths: string[] = [];
        wsFolders.forEach((wsf) =>
        {
            watchPaths.push(wsf.name);
        });
        const clsPathGlob = `**/{${watchPaths.join(",")}}/**/*`.replace("//**", "/");
        this.wrapper.log.write("   file watcher glob:", 2);
        this.wrapper.log.write(`   ${clsPathGlob}`, 2);
        return clsPathGlob;
    };


    isBusy = () => !!this.currentEvent;


    private isSameEvent = (q: any[], kind: string, uri: Uri) => q.find(e => e.event === kind && e.fsPath === uri.fsPath);


    private onDirCreate = async(uri: Uri) =>
    {
        if (this.wrapper.fs.isDirectory(uri.fsPath) && !this.wrapper.utils.isExcluded(uri.fsPath))
        {
            const e = {
                fn: this._procDirCreateEvent,
                args: [ uri, "   " ],
                event: "create directory",
                fsPath: uri.fsPath
            };
            if (this.currentEvent) {
                this.eventQueue.push(e);
            }
            else {
                this.currentEvent = e;
                await this._procDirCreateEvent(uri, "");
            }
        }
    };


    private onDirDelete = async(uri: Uri) =>
    {   //
        // The dir is gone already, so can't lstat it to see if it was a directory or file
        // Rely on the fact if it has no extension, then it's a directory.  I supposed we
        // can track existing directories, ut ugh.  Maybe someday.
        //
        if (!extname(uri.fsPath) && !this.wrapper.utils.isExcluded(uri.fsPath)) // ouch
        {
            const e = {
                fn: this._procDirDeleteEvent,
                args: [ uri, "   " ],
                event: "delete directory",
                fsPath: uri.fsPath
            };
            if (this.currentEvent) {
                this.eventQueue.push(e);
            }
            else {
                this.currentEvent = e;
                await this._procDirDeleteEvent(uri, "");
            }
        }
    };


    private onFileChange = async(taskType: string, uri: Uri) =>
    {
        if (!this.wrapper.utils.isExcluded(uri.fsPath))
        {
            const e = {
                fn: this._procFileChangeEvent,
                args: [ taskType, uri, "   " ],
                event: "modify file",
                fsPath: uri.fsPath
            };
            if (!this.currentEvent)
            {
                this.currentEvent = e;
                await this._procFileChangeEvent(taskType, uri, "");
            }
            else { this.queueEventIfNeeded(e, uri); }
        }
    };


    private onFileCreate = async(taskType: string, uri: Uri) =>
    {
        if (!this.wrapper.utils.isExcluded(uri.fsPath))
        {
            const e = {
                fn: this._procFileCreateEvent,
                args: [ taskType, uri, "   " ],
                event: "create file",
                fsPath: uri.fsPath
            };
            if (!this.currentEvent)
            {
                this.currentEvent = e;
                await this._procFileCreateEvent(taskType, uri, "");
            }
            else { this.queueEventIfNeeded(e, uri); }
        }
    };


    private onFileDelete = async(taskType: string, uri: Uri) =>
    {
        if (!this.wrapper.utils.isExcluded(uri.fsPath))
        {
            const e = {
                fn: this._procFileDeleteEvent,
                args: [ taskType, uri, "   " ],
                event: "delete file",
                fsPath: uri.fsPath
            };
            if (!this.currentEvent)
            {
                this.currentEvent = e;
                await this._procFileDeleteEvent(taskType, uri, "");
            }
            else { this.queueEventIfNeeded(e, uri); }
        }
    };


    // Note:  Exported for testsApi
    //        Te updateWorkSpaceFolders() call does not work when running tests, the testing
    //        instance of VSCode even pops up an info message saying so.  So for now we mimic
    //        as best we can by exporting onWsFoldersChange() to be added to the ITestsApi so
    //        that the test suites can mimic the add ws folder event.  But...  When I first
    //        started messing with the updateWorkspaceFolders() function, it saved the state
    //        and on subsequent loads it was trying to load the ws folders that had "failed"
    //        to be added.  Loading because of cache data in /.vscode-test.  And when it did
    //        that, it opened as a multi-root ws, I could then keep that instance open (it also
    //        launched the normal test instance), and, the ws folder adds succeed.  Unfortunately
    //        i can;t figure out how to start tests using a multi-root workspace, doesn't seem
    //        like its supported :(  SO this is the best we can do...
    //
    onWsFoldersChange = async(e: WorkspaceFoldersChangeEvent) =>
    {
        this.wrapper.log.methodStart("[event] workspace folder change", 1);

        //
        // Detect when a folder move occurs and the ext is about to deactivate/re-activate.  A
        // folder move that changes the first workspace folder will restart the extension
        // unfortunately.  Changing the first workspace folder modifies the deprecated `rootPath`
        // and I think that's why the reload is needed or happens.  The only reason the `update2Sync`
        // function exists is right here.  If we do any async op when the root is changing, we lose
        // the context, even the async storage op is not completed.  So we needed a sync op here to
        // record the timestamp.  The timesptamp is used on extension activation to determine if it
        // is being activated because of this scenario, in which case we'll load from a stored file
        // cache so that the tree reload is much quicker, especially in large workspaces.  We'll do
        // it regardless of the 'enablePersistentFileCaching' settings.
        //
        /* istanbul ignore if */  // program flow can never fall here during tests as the ext reloads
        if (this.rootPath !== workspace.rootPath)
        {
            this.wrapper.log.write("   workspace deprecated 'root path' has changed", 1);
            this.wrapper.log.values(1, "   ", [[ "new root path", workspace.rootPath ], [ "previous root path", this.rootPath ]]);
            if (this.rootPath === undefined) {
                this.wrapper.log.write("   changing to a multi-root workspace");
            }
            this.wrapper.log.write("   vscode will deactivate and re-activate the extension", 1);
            this.rootPath = workspace.rootPath;
            this.wrapper.storage.update2Sync("lastWsRootPathChange", Date.now());
        }

        //
        // If not a standard folder move not involving the 1st folder (in which case the `added`
        // and `removed` count will be 0) then a workspace folder was actually added or removed,
        // and the 'removed' or 'added' count will be > 0.
        //
        else if (e.removed.length > 0 || e.added.length > 0)
        {
            const fwEvent = {
                fn: this._procWsDirAddRemoveEvent,
                args: [ e, "   " ],
                event: "workspace change"
            };
            this.wrapper.log.write("   workspace folder has been added or removed, process/queue event", 1);
            //
            // Technically, there should never be a current event when program flow falls here, since
            // VSCode documentation states directly that updateWorkspaceFolders() cannot be called
            // consecutive times without waiting for the onDidChangeWorkspaceFolders event to fire,
            // which this function is a listener of.  Even so, leaving the check here, with a handy
            // dandy cheap istanbul ignore tag for coverage ignorance.
            //
            /* istanbul ignore if */
            if (this.currentEvent) {
                this.eventQueue.push(fwEvent);
            }
            else {
                this.currentEvent = fwEvent;
                await this._procWsDirAddRemoveEvent(e, "   ");
            }
        }

        //
        // The 'removed' and 'added' counts are both === 0, so folders were moved/re-ordered,
        // and  the 1st folder `rootPath` did not change
        //
        else {
            this.wrapper.log.write("   workspace folder order has changed", 1);
            if (!this.wrapper.config.get<boolean>("sortProjectFoldersAlpha"))
            {   //
                // Refresh tree only, leave file cache and provider invalidation alone.  Setting
                // the 2nd param in refresh cmd to `false` accomplishes just that.
                //
                this.wrapper.log.write("   refresh tree order", 1);
                await executeCommand(Commands.Refresh, false, undefined, "   ");
            }
            else {
                this.wrapper.log.write("   nothing to do", 1);
            }
        }

        this.currentNumWorkspaceFolders = workspace.workspaceFolders?.length;
        this.wrapper.log.methodDone("[event] workspace folder change", 1, "", [[ "current # of workspace folders", this.currentNumWorkspaceFolders ]]);
    };


    private processQueue = async () =>
    {
        if (this.eventQueue.length > 0)
        {
            const next = this.currentEvent = this.eventQueue.shift();
            this.wrapper.log.methodStart("file watcher event queue", 1, "", true, [
                [ "event", next.event ], [ "arg1", this.wrapper.utils.isString(next.args[0]) ? next.args[0] : next.args[0].fsPath ],
                [ "arg2", this.wrapper.utils.isUri(next.args[1]) ? next.args[1].fsPath : "none (log padding)" ],
                [ "# of events still pending", this.eventQueue.length ]
            ]);
            await next.fn(...next.args);
            this.wrapper.log.methodDone("file watcher event queue", 1, "");
        }
        else {
            this.currentEvent = undefined;
        }
    };


    private queueEventIfNeeded = (e: any, uri: Uri) =>
    {
        if (this.eventNeedsToBeQueued(e.event, uri))
        {
            this.eventQueue.push(e);
        }
    };


    /**
     * Registers file watchers for a specific task type using the specified glob pattern.
     *
     * @param context Extension context
     * @param taskType Task type, i.e. 'ant', 'bash' 'python', etc...
     * @param fileBlob The file blob to use for the watchers, defined in constants module for each task type
     * @param firstRun Is first run (ins initializing)
     * @param enabled Is enabled.  `false` if task type was disabled.
     * @param logPad Log padding.
     */
    registerFileWatcher = async(taskType: string, firstRun: boolean, enabled: boolean, logPad: string) =>
    {
        this.wrapper.log.methodStart("register file watcher for task type '" + taskType + "'", 1, logPad, false, [[ "enabled", enabled ]]);

        if (!firstRun && workspace.workspaceFolders)
        {
            if (enabled !== false) {
                const numFilesFound  = await this.wrapper.filecache.buildTaskTypeCache(taskType, undefined, true, logPad + "   ");
                this.wrapper.log.write(`   ${numFilesFound} files were added to the file cache`, 1, logPad);
            }
            else {
                const numFilesRemoved = this.wrapper.filecache.removeTaskTypeFromCache(taskType, logPad + "   ");
                this.wrapper.log.write(`   ${numFilesRemoved} files were removed from file cache`, 1, logPad);
            }
        }

        let watcher = this.watchers[taskType];
        if (watcher)
        {
            const watcherDisposable = this.watcherDisposables[taskType];
            if (watcherDisposable)
            {
                watcherDisposable.dispose();
                delete this.watcherDisposables[taskType];
            }
        }

        if (enabled !== false)
        {   //
            // Ignore modification events for some task types (script type, e.g. 'bash', 'python' etc)
            // app-publisher and maven only get watched for invalid syntax.  they always have same # of tasks for a file.
            //
            const ignoreModify = isScriptType(taskType) || taskType === "apppublisher" || taskType === "maven" ||
                                taskType === "tsc" || taskType === "jenkins" || taskType === "webpack";
            if (!watcher) {
                watcher = workspace.createFileSystemWatcher(this.wrapper.utils.getGlobPattern(taskType));
                this.watchers[taskType] = watcher;
                this.disposables.push(watcher);
            }
            this.watcherDisposables[taskType] = watcher.onDidDelete(async uri => this.onFileDelete(taskType, uri));
            this.watcherDisposables[taskType] = watcher.onDidCreate(async uri => this.onFileCreate(taskType, uri));
            if (!ignoreModify) {
                this.watcherDisposables[taskType] = watcher.onDidChange(async uri => this.onFileChange(taskType, uri));
            }
        }

        this.wrapper.log.methodDone("register file watcher for task type '" + taskType + "'", 1, logPad);
    };


    private _procDirCreateEvent = async(uri: Uri, logPad: string) =>
    {
        try
        {   this.wrapper.log.methodStart("[event] directory 'create'", 1, logPad, true, [[ "dir", uri.fsPath ]]);
            const numFilesFound = await this.wrapper.filecache.addFolder(uri, logPad + "   ");
            if (numFilesFound > 0) {
                await executeCommand(Commands.Refresh, undefined, uri, logPad + "   ");
            }
            this.wrapper.log.methodDone("[event] directory 'create'", 1, logPad);
        }
        catch (e) {}
        finally { /* don't await */ this.processQueue(); }
    };


    private _procDirDeleteEvent = async(uri: Uri, logPad: string) =>
    {
        try
        {   this.wrapper.log.methodStart("[event] directory 'delete'", 1, logPad, true, [[ "dir", uri.fsPath ]]);
            const numFilesRemoved = this.wrapper.filecache.removeFolderFromCache(uri, logPad + "   ");
            if (numFilesRemoved > 0) {
                await executeCommand(Commands.Refresh, undefined, uri, logPad + "   ");
            }
            this.wrapper.log.methodDone("[event] directory 'delete'", 1, logPad);
        }
        catch (e) { /* istanbul ignore next */ this.wrapper.log.error([ "Filesystem watcher 'dir change' event error", e ]); }
        finally { /* don't await */ this.processQueue(); }
    };


    private _procFileChangeEvent = async(taskType: string, uri: Uri, logPad: string) =>
    {
        try
        {   this.wrapper.log.methodStart("[event] file 'change'", 1, logPad, true, [[ "file", uri.fsPath ]]);
            await executeCommand(Commands.Refresh, taskType, uri, logPad + "   ");
            this.wrapper.log.methodDone("[event] file 'change'", 1, logPad);
        }
        catch (e) { /* istanbul ignore next */ this.wrapper.log.error([ "Filesystem watcher 'file change' event error", e ]); }
        finally { /* don't await */ this.processQueue(); }
    };


    private _procFileCreateEvent = async(taskType: string, uri: Uri, logPad: string) =>
    {
        try
        {   this.wrapper.log.methodStart("[event] file 'create'", 1, logPad, true, [[ "file", uri.fsPath ]]);
            this.wrapper.filecache.addFileToCache(taskType, uri, logPad + "   ");
            await executeCommand(Commands.Refresh, taskType, uri, logPad + "   ");
            this.wrapper.log.methodDone("[event] file 'create'", 1, logPad);
        }
        catch (e) { /* istanbul ignore next */ this.wrapper.log.error([ "Filesystem watcher 'file create' event error", e ]); }
        finally { /* don't await */ this.processQueue(); }
    };


    private _procFileDeleteEvent = async(taskType: string, uri: Uri, logPad: string) =>
    {
        try
        {   this.wrapper.log.methodStart("[event] file 'delete'", 1, logPad, true, [[ "file", uri.fsPath ]]);
            this.wrapper.filecache.removeFileFromCache(taskType, uri, logPad + "   ");
            await executeCommand(Commands.Refresh, taskType, uri, logPad + "   ");
            this.wrapper.log.methodDone("[event] file 'delete'", 1, logPad);
        }
        catch (e) { /* istanbul ignore next */ this.wrapper.log.error([ "Filesystem watcher 'file delete' event error", e ]); }
        finally { /* don't await */ this.processQueue(); }
    };


    private _procWsDirAddRemoveEvent = async(e: WorkspaceFoldersChangeEvent, logPad: string) =>
    {
        try
        {   this.wrapper.log.methodStart("workspace folder 'add/remove'", 1, logPad, true, [
                [ "# added", e.added.length ], [ "# removed", e.removed.length ]
            ]);
            const numFilesFound = await this.wrapper.filecache.addWsFolders(e.added, logPad + "   "),
                numFilesRemoved = this.wrapper.filecache.removeWsFolders(e.removed, logPad + "   ");
            this.createDirWatcher();
            if (numFilesFound > 0 || numFilesRemoved > 0)
            {
                const all =  [ ...e.added, ...e.removed ];
                await executeCommand(Commands.Refresh, undefined, all.length === 1 ? all[0].uri : false, logPad + "   ");
            }
            this.wrapper.log.methodDone("workspace folder 'add/remove'", 1, logPad, [
                [ "# of files found", numFilesFound ], [ "# of files removed", numFilesRemoved ]
            ]);
        }
        catch (e) {}
        finally { /* don't await */ this.processQueue(); }
    };

}
