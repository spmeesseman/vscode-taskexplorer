
import { log } from "../lib/log/log";
import { Globs } from "../lib/constants";
import { extname } from "path";
import { TeWrapper } from "../lib/wrapper";
import { isTaskIncluded } from "../lib/isTaskIncluded";
import { configuration } from "../lib/utils/configuration";
import { isDirectory, pathExistsSync } from "../lib/utils/fs";
import { Uri, Task, WorkspaceFolder, workspace } from "vscode";
import { ITaskExplorerProvider } from "../interface/ITaskProvider";
import { getTaskTypeFriendlyName } from "../lib/utils/taskTypeUtils";
import { isExcluded, isTaskTypeEnabled, showMaxTasksReachedMessage } from "../lib/utils/utils";


export abstract class TaskExplorerProvider implements ITaskExplorerProvider
{
    abstract createTask(target: string, cmd: string | undefined, folder: WorkspaceFolder, uri: Uri, xArgs?: string[], logPad?: string): Task | undefined;
    abstract getDocumentPosition(taskName: string | undefined, documentText: string | undefined): number;
    abstract readUriTasks(uri: Uri, logPad: string): Promise<Task[]>;

    public cachedTasks: Task[] | undefined;
    public providerName = "***";
    public readonly isExternal = false;
    public static logPad = "";
    protected callCount = 0;
    protected logQueueId: string | undefined;


    constructor(protected readonly wrapper: TeWrapper, name: string) {
        this.providerName = name;
    }


    protected getDocumentPositionLine(lineName: string, scriptName: string, documentText: string, advance = 0, start = 0, skipQuotes = false): number
    {
        //
        // TODO - This is crap, use regex to detect spaces between quotes
        //
        let idx = documentText.indexOf(lineName + (!skipQuotes ? "\"" : "") + scriptName + (!skipQuotes ? "\"" : ""), start);
        if (idx === -1)
        {
            idx = documentText.indexOf(lineName + (!skipQuotes ? "'" : "") + scriptName + (!skipQuotes ? "'" : ""), start);
        }
        if (advance !== 0 && idx !== -1)
        {
            idx += advance;
        }
        return idx !== -1 ? idx : 0;
    }


    /**
     * Override for external providers or custom globs (for ant/bash)
     *
     * @since 2.6.3
     */
    public getGlobPattern()
    {
        return Globs[`GLOB_${this.providerName.replace(/\-/g, "").toUpperCase()}`];
    }


    public async provideTasks()
    {
        let rmvCount;
        this.logQueueId = this.providerName + (++this.callCount);
        log.methodStart(`provide ${this.providerName} tasks`, 1, TaskExplorerProvider.logPad, true, [[ "call count", ++this.callCount ]], this.logQueueId);
        if (!this.cachedTasks)
        {
            const licMgr = this.wrapper.licenseManager;
            this.cachedTasks = await this.readTasks(TaskExplorerProvider.logPad + "   ");
            if (licMgr && !licMgr.isLicensed())
            {
                const maxTasks = licMgr.getMaxNumberOfTasks(this.providerName);
                if (this.cachedTasks.length > maxTasks)
                {
                    rmvCount = this.cachedTasks.length - maxTasks;
                    log.write(`   removing ${rmvCount} tasks, max ${ this.providerName} task count reached (no license)`, 1, TaskExplorerProvider.logPad + "   ", this.logQueueId);
                    this.cachedTasks.splice(maxTasks, rmvCount);
                    showMaxTasksReachedMessage(licMgr, getTaskTypeFriendlyName(this.providerName, true));
                }
            }
        }
        log.methodDone(`provide ${this.providerName} tasks`, 1, TaskExplorerProvider.logPad, [[ "# of tasks found", this.cachedTasks.length ]], this.logQueueId);
        log.dequeue(this.logQueueId);
        this.logQueueId = undefined;
        return this.cachedTasks;
    }


    protected async readTasks(logPad: string): Promise<Task[]>
    {
        const allTasks: Task[] = [],
              visitedFiles: string[] = [],
              paths = this.wrapper.filecache.getTaskFiles(this.providerName),
              enabled = isTaskTypeEnabled(this.providerName);

        log.methodStart(`read ${this.providerName} tasks`, 2, logPad, false, [[ "enabled", enabled ]], this.logQueueId);

        if (enabled && paths)
        {
            for (const fObj of paths)
            {
                if (!isExcluded(fObj.uri.path) && !visitedFiles.includes(fObj.uri.fsPath) && pathExistsSync(fObj.uri.fsPath))
                {
                    visitedFiles.push(fObj.uri.fsPath);
                    const tasks = (await this.readUriTasks(fObj.uri, logPad + "   ")).filter(t => isTaskIncluded(this.wrapper, t, t.definition.path));
                    log.write(`   processed ${this.providerName} file`, 2, logPad, this.logQueueId);
                    log.value("      file", fObj.uri.fsPath, 2, logPad, this.logQueueId);
                    log.value("      targets in file", tasks.length, 2, logPad, this.logQueueId);
                    allTasks.push(...tasks);
                }
            }
        }

        log.methodDone(`read ${this.providerName} tasks`, 2, logPad, [[ "# of tasks parsed", allTasks.length ]], this.logQueueId);

        return allTasks;
    }


    public resolveTask(_task: Task): Task | undefined
    {
        return undefined;
    }


    public async invalidate(uri?: Uri, logPad?: string): Promise<void>
    {
        const cachedTasks = this.cachedTasks as Task[];
        //
        // Note that 'taskType' may be different than 'this.providerName' for 'script' type tasks (e.g.
        // batch, bash, python, etc...)
        //
        log.methodStart(`invalidate ${this.providerName} tasks cache`, 1, logPad, false, [
            [ "uri", uri?.path ], [ "current # of cached tasks", cachedTasks.length ]
        ]);

        const enabled = isTaskTypeEnabled(this.providerName);
        if (enabled && uri)
        {
            const pathExists = pathExistsSync(uri.fsPath) && !!workspace.getWorkspaceFolder(uri) ;
            //
            // Remove tasks of type '' from the 'tasks'array
            //
            cachedTasks.slice().reverse().forEach((item, index, object) =>
            {
                if (this.needsRemoval(item, uri) && (item.source !== "Workspace" || /* istanbul ignore next */item.definition.type === this.providerName))
                {
                    log.write(`   removing cached task '${item.source}/${item.name}'`, 4, logPad);
                    (this.cachedTasks as Task[]).splice(object.length - 1 - index, 1);
                }
            });

            //
            // Check `excludes` for exact path which would have been entered via the context menu in
            // the the tree ui.  The check for excluded path patterns also found in the `excludes` array
            // is done by the file caching layer.
            //
            if (pathExists && !isDirectory(uri.fsPath) && !configuration.get<string[]>("exclude", []).includes(uri.path))
            {
                const tasks = (await this.readUriTasks(uri, logPad + "   ")).filter(t => isTaskIncluded(this.wrapper, t, t.definition.path));
                cachedTasks.push(...tasks);
            }

            this.cachedTasks = cachedTasks.length > 0 ? cachedTasks : undefined;
        }
        else {
            this.cachedTasks = undefined;
        }

        log.methodDone(`invalidate ${this.providerName} tasks cache`, 1, logPad, [
            [ "new # of cached tasks", this.cachedTasks ? this.cachedTasks.length : 0 ]
        ]);
    }


    private needsRemoval(item: Task, uri: Uri)
    {
        const cstDef = item.definition;
        return !!(cstDef.uri &&
                 (cstDef.uri.fsPath === uri.fsPath || !pathExistsSync(cstDef.uri.fsPath) || !workspace.getWorkspaceFolder(uri) ||
                 //
                 // If the directory wasdeleted, then isDirectory() fails, so for now rely on the fact
                 // that of the path doesn't have an extension, it's probably a directory.  FileWatcher
                 // does the same thing right now, ~ line 332.
                 //
                 // Might not even need this?  Depends if we remove when modify/add and I don't feel like
                 // looking right now.  Harmless but the less calls the better.
                 //
                 // (cstDef.uri.fsPath.startsWith(uri.fsPath) && /* istanbul ignore next */isDirectory(uri.fsPath)) ||
                 (cstDef.uri.fsPath.startsWith(uri.fsPath) && /* istanbul ignore next */!extname(uri.fsPath) /* ouch */) ||
                 //
                 !isTaskIncluded(this.wrapper, item, cstDef.uri.path)));
    }

}
