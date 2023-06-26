/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { extname } from "path";
import { TeWrapper } from "../lib/wrapper";
import { ITeFileWatcher } from "../interface";
import { executeCommand } from "../lib/command/command";
import { getTaskTypes, isConstTaskCountType, isScriptType } from "../lib/utils/taskUtils";
import {
    Disposable, FileSystemWatcher, workspace, WorkspaceFolder, Uri, WorkspaceFoldersChangeEvent, Event, EventEmitter
} from "vscode";


export class TeFileWatcher implements ITeFileWatcher, Disposable
{
    private _busy = false;
    private _skipNextEvent: string[];
    private rootPath: string | undefined;
    private currentNumWorkspaceFolders: number | undefined;

    private readonly _queueOwner = "fw";
    private readonly _disposables: Disposable[];
    private readonly _onReady: EventEmitter<void>;
    private readonly _watchers: { [taskType: string]: FileSystemWatcher } = {};
    private readonly _watcherDisposables: { [taskType: string]: Disposable[] } = {};
    private readonly _dirWatcher: { watcher?: FileSystemWatcher; onDidCreate?: Disposable; onDidDelete?: Disposable } = {};


    constructor(private readonly wrapper: TeWrapper)
    {
        this._disposables = [];
        this._skipNextEvent = [];
		this._onReady = new EventEmitter<void>();
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
        this._disposables.push(
            this._onReady,
            wrapper.eventQueue.onReady(() => this._onReady.fire(), this),
            workspace.onDidChangeWorkspaceFolders(this.onWsFoldersChange, this)
        );
    }

    dispose()
    {
        this._disposables.splice(0).forEach(d => d.dispose());
        this._dirWatcher.watcher?.dispose();
        Object.values(this._watcherDisposables).forEach(da => da.splice(0).forEach(d => d.dispose()));
        Object.values(this._watchers).filter(w => !!w).forEach(w => w.dispose());
    }


    get isBusy(): boolean {
        return this._busy || this.wrapper.eventQueue.isBusy(this._queueOwner);
    }

    get onReady(): Event<void> {
        return this._onReady.event;
    }


    private createDirWatcher = () =>
    {
        this._dirWatcher.onDidCreate?.dispose();
        this._dirWatcher.onDidDelete?.dispose();
        this._dirWatcher.watcher?.dispose();
        this.wrapper.utils.execIf(workspace.workspaceFolders, (wsfs) =>
        {
            this._dirWatcher.watcher = workspace.createFileSystemWatcher(this.getDirWatchGlob(wsfs));
            this._dirWatcher.onDidCreate = this._dirWatcher.watcher.onDidCreate(async (e) => { await this.onDirCreate(e); }, this);
            this._dirWatcher.onDidDelete = this._dirWatcher.watcher.onDidDelete(async (e) => { await this.onDirDelete(e); }, this);
            this._disposables.push(
                this._dirWatcher.onDidCreate,
                this._dirWatcher.onDidDelete,
                this._dirWatcher.watcher
            );
        }, this);
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


    private decrementSkipEvent = (uri: Uri) => this.wrapper.utils.popIfExists(this._skipNextEvent, uri.fsPath);


    private getDirWatchGlob = (wsFolders: readonly WorkspaceFolder[]) => `**/{${wsFolders.map(wsf => wsf.name).join(",")}}/**/*`.replace("//**", "/");


    init = (logPad: string) => this.createFileWatchers(logPad);


    private onDirCreate = async(uri: Uri) =>
    {
        const isDir = this.wrapper.fs.isDirectory(uri.fsPath);
        if (isDir && !this.wrapper.utils.isExcluded(uri.fsPath) && !this.shouldSkipEvent(uri))
        {
            void this.wrapper.eventQueue.queue({
                fn: this._procDirCreateEvent,
                scope: this,
                args: [ uri, "   " ],
                owner: this._queueOwner,
                event: `createdir-${uri.fsPath}`,
                type: "create"
            });
        }
        if (isDir) {
            this.decrementSkipEvent(uri);
        }
    };


    private onDirDelete = (uri: Uri): void =>
    {   //
        // The dir is gone already, so can't lstat it to see if it was a directory or file
        // Rely on the fact if it has no extension, then it's a directory.  I supposed we
        // can track existing directories, ut ugh.  Maybe someday.
        //
        const isDir = !extname(uri.fsPath);
        if (isDir && !this.wrapper.utils.isExcluded(uri.fsPath) && !this.shouldSkipEvent(uri))
        {
            void this.wrapper.eventQueue.queue(
            {
                fn: this._procDirDeleteEvent,
                scope: this,
                args: [ uri ],
                owner: this._queueOwner,
                event: `deletedir-${uri.fsPath}`,
                type: "delete"
            });
        }
        if (isDir) {
            this.decrementSkipEvent(uri);
        }
    };


    private onFileChange = async(taskType: string, uri: Uri) =>
    {
        if (!this.wrapper.utils.isExcluded(uri.fsPath) && !this.shouldSkipEvent(uri))
        {
            void this.wrapper.eventQueue.queue(
            {
                fn: this._procFileChangeEvent,
                scope: this,
                args: [ taskType, uri, "   " ],
                owner: this._queueOwner,
                event: `changeefile-${uri.fsPath}`,
                type: "change",
                ignoreActive: true,
                waitReady: true,
                data: uri.fsPath
            });
        }
        this.decrementSkipEvent(uri);
    };


    private onFileCreate = async(taskType: string, uri: Uri) =>
    {
        if (!this.wrapper.utils.isExcluded(uri.fsPath) && !this.shouldSkipEvent(uri))
        {
            void this.wrapper.eventQueue.queue(
            {
                fn: this._procFileCreateEvent,
                scope: this,
                args: [ taskType, uri, "   " ],
                owner: this._queueOwner,
                event: `createefile-${uri.fsPath}`,
                type: "create",
                ignoreActive: true,
                waitReady: true,
                data: uri.fsPath
            });
        }
        this.decrementSkipEvent(uri);
    };


    private onFileDelete = async(taskType: string, uri: Uri) =>
    {
        if (!this.wrapper.utils.isExcluded(uri.fsPath) && !this.shouldSkipEvent(uri))
        {
            void this.wrapper.eventQueue.queue(
            {
                fn: this._procFileDeleteEvent,
                scope: this,
                args: [ taskType, uri, "   " ],
                owner: this._queueOwner,
                event: `deleteefile-${uri.fsPath}`,
                type: "delete",
                ignoreActive: true,
                waitReady: true,
                data: uri.fsPath
            });
        }
        this.decrementSkipEvent(uri);
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
            this.wrapper.log.write("   workspace folder has been added or removed, process/queue event", 1);
            //
            // Technically, there should never be a current event when program flow falls here, since
            // VSCode documentation states directly that updateWorkspaceFolders() cannot be called
            // consecutive times without waiting for the onDidChangeWorkspaceFolders event to fire,
            // which this function is a listener of.  Even so, leaving the check here, with a handy
            // dandy cheap istanbul ignore tag for coverage ignorance.
            //
            void this.wrapper.eventQueue.queue(
            {
                fn: this._procWsDirAddRemoveEvent,
                scope: this,
                args: [ e, "   " ],
                owner: this._queueOwner,
                event: "wschange",
                type: "addremove"
            });
        }

        //
        // The 'removed' and 'added' counts are both === 0, so folders were moved/re-ordered,
        // and  the 1st folder `rootPath` did not change
        //
        else {
            this.wrapper.log.write("   workspace folder order has changed", 1);
            if (!this.wrapper.config.get<boolean>(this.wrapper.keys.Config.SortProjectFoldersAlphabetically))
            {   //
                // Refresh tree only, leave file cache and provider invalidation alone.  Setting
                // the 2nd param in refresh cmd to `false` accomplishes just that.
                //
                this.wrapper.log.write("   refresh tree order", 1);
                await executeCommand(this.wrapper.keys.Commands.Refresh, false, undefined, "   ");
            }
            else {
                this.wrapper.log.write("   nothing to do", 1);
            }
        }

        this.currentNumWorkspaceFolders = workspace.workspaceFolders?.length;
        this.wrapper.log.methodDone("[event] workspace folder change", 1, "", [[ "current # of workspace folders", this.currentNumWorkspaceFolders ]]);
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
                const numFilesFound  = await this.wrapper.fileCache.buildTaskTypeCache(taskType, undefined, true, logPad + "   ");
                this.wrapper.log.write(`   ${numFilesFound} files were added to the file cache`, 1, logPad);
            }
            else {
                const numFilesRemoved = this.wrapper.fileCache.removeTaskTypeFromCache(taskType, logPad + "   ");
                this.wrapper.log.write(`   ${numFilesRemoved} files were removed from file cache`, 1, logPad);
            }
        }

        let watcher = this._watchers[taskType];
        if (watcher)
        {
            const watcherDisposable = this._watcherDisposables[taskType];
            if (watcherDisposable)
            {
                watcherDisposable.splice(0).forEach(d => d.dispose());
                delete this._watcherDisposables[taskType];
            }
        }

        if (enabled !== false)
        {   //
            // Ignore modification events for some task types (script type, e.g. 'bash', 'python' etc)
            // app-publisher and maven only get watched for invalid syntax.  they always have same # of tasks for a file.
            //
            const ignoreModify = isScriptType(taskType) || isConstTaskCountType(taskType);
            if (!watcher) {
                watcher = workspace.createFileSystemWatcher(this.wrapper.taskUtils.getGlobPattern(taskType));
                this._watchers[taskType] = watcher;
                this._disposables.push(watcher);
            }
            this._watcherDisposables[taskType] = [
                watcher.onDidDelete(async uri => this.onFileDelete(taskType, uri)),
                watcher.onDidCreate(async uri => this.onFileCreate(taskType, uri))
            ];
            if (!ignoreModify) {
                this._watcherDisposables[taskType].push(
                    watcher.onDidChange(async uri => this.onFileChange(taskType, uri))
                );
            }
        }

        this.wrapper.log.methodDone("register file watcher for task type '" + taskType + "'", 1, logPad);
    };


    private shouldSkipEvent = (uri: Uri) => this._skipNextEvent.includes(uri.fsPath) || this._skipNextEvent.includes("*");


    private _procDirCreateEvent = async (uri: Uri, logPad: string) =>
    {
        this.wrapper.log.methodStart("[event] directory 'create'", 1, logPad, true, [[ "dir", uri.fsPath ]]);
        const numFilesFound = await this.wrapper.fileCache.addFolder(uri, logPad + "   ");
        if (numFilesFound > 0) {
            await executeCommand(this.wrapper.keys.Commands.Refresh, undefined, uri, logPad + "   ");
        }
        this.wrapper.log.methodDone("[event] directory 'create'", 1, logPad);
    };


    private _procDirDeleteEvent = async (uri: Uri, logPad: string) =>
    {
        this.wrapper.log.methodStart("[event] directory 'delete'", 1, logPad, true, [[ "dir", uri.fsPath ]]);
        const numFilesRemoved = this.wrapper.fileCache.removeFolderFromCache(uri, logPad + "   ");
        if (numFilesRemoved > 0) {
            await executeCommand(this.wrapper.keys.Commands.Refresh, undefined, uri, logPad + "   ");
        }
        this.wrapper.log.methodDone("[event] directory 'delete'", 1, logPad);
    };


    private _procFileChangeEvent = async(taskType: string, uri: Uri, logPad: string) =>
    {
        this.wrapper.log.methodStart("[event] file 'change'", 1, logPad, true, [[ "file", uri.fsPath ]]);
        await executeCommand(this.wrapper.keys.Commands.Refresh, taskType, uri, logPad + "   ");
        this.wrapper.log.methodDone("[event] file 'change'", 1, logPad);
    };


    private _procFileCreateEvent = async(taskType: string, uri: Uri, logPad: string) =>
    {
        this.wrapper.log.methodStart("[event] file 'create'", 1, logPad, true, [[ "file", uri.fsPath ]]);
        this.wrapper.fileCache.addFileToCache(taskType, uri, logPad + "   ");
        await executeCommand(this.wrapper.keys.Commands.Refresh, taskType, uri, logPad + "   ");
        this.wrapper.log.methodDone("[event] file 'create'", 1, logPad);
    };


    private _procFileDeleteEvent = async(taskType: string, uri: Uri, logPad: string) =>
    {
        this.wrapper.log.methodStart("[event] file 'delete'", 1, logPad, true, [[ "file", uri.fsPath ]]);
        this.wrapper.fileCache.removeFileFromCache(taskType, uri, logPad + "   ");
        await executeCommand(this.wrapper.keys.Commands.Refresh, taskType, uri, logPad + "   ");
        this.wrapper.log.methodDone("[event] file 'delete'", 1, logPad);
    };


    private _procWsDirAddRemoveEvent = async(e: WorkspaceFoldersChangeEvent, logPad: string) =>
    {
        this.wrapper.log.methodStart("workspace folder 'add/remove'", 1, logPad, true, [
            [ "# added", e.added.length ], [ "# removed", e.removed.length ]
        ]);
        const numFilesFound = await this.wrapper.fileCache.addWsFolders(e.added, logPad + "   "),
            numFilesRemoved = this.wrapper.fileCache.removeWsFolders(e.removed, logPad + "   ");
        this.createDirWatcher();
        if (numFilesFound > 0 || numFilesRemoved > 0)
        {
            const all =  [ ...e.added, ...e.removed ];
            await executeCommand(this.wrapper.keys.Commands.Refresh, undefined, all.length === 1 ? all[0].uri : false, logPad + "   ");
        }
        this.wrapper.log.methodDone("workspace folder 'add/remove'", 1, logPad, [
            [ "# of files found", numFilesFound ], [ "# of files removed", numFilesRemoved ]
        ]);
    };

}
