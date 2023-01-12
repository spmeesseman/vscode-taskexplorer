
import * as util from "../lib/utils/utils";
import log from "../lib/utils/log";
import constants from "../lib/constants";
import { configuration } from "../lib/utils/configuration";
import { getTaskFiles, removeFileFromCache } from "../lib/cache";
import { Uri, Task, WorkspaceFolder, TaskProvider } from "vscode";
import { isTaskIncluded } from "../lib/isTaskIncluded";
import { getLicenseManager } from "../extension";
import { isDirectory, pathExistsSync } from "../lib/utils/fs";


export abstract class TaskExplorerProvider implements TaskProvider
{
    abstract createTask(target: string, cmd: string | undefined, folder: WorkspaceFolder, uri: Uri, xArgs?: string[], logPad?: string): Task | undefined;
    abstract getDocumentPosition(taskName: string | undefined, documentText: string | undefined): number;
    abstract readUriTasks(uri: Uri, logPad: string): Promise<Task[]>;


    public cachedTasks: Task[] | undefined;
    public invalidating = false;
    public providerName = "***";
    public static logPad = "";
    private queue: Uri[];
    protected callCount = 0;
    protected logQueueId: string | undefined;


    constructor(name: string) {
        this.providerName = name;
        this.queue = [];
    }


    getDocumentPositionLine(lineName: string, scriptName: string, documentText: string, advance = 0, start = 0, skipQuotes = false): number
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
        return idx;
    }


    /**
     * Override for external providers or custom globs (for ant/bash)
     *
     * @since 2.6.3
     */
    public getGlobPattern()
    {
        return constants[`GLOB_${this.providerName.replace(/\-/g, "").toUpperCase()}`];
    }


    public async provideTasks()
    {
        let rmvCount;
        this.logQueueId = this.providerName + (++this.callCount);
        log.methodStart(`provide ${this.providerName} tasks`, 1, TaskExplorerProvider.logPad, true, [[ "call count", ++this.callCount ]], this.logQueueId);
        if (!this.cachedTasks)
        {
            const licMgr = getLicenseManager();
            this.cachedTasks = await this.readTasks(TaskExplorerProvider.logPad + "   ");
            if (licMgr && !licMgr.isLicensed())
            {
                const maxTasks = licMgr.getMaxNumberOfTasks(this.providerName);
                //
                // TODO - remove below ignore tags when test for copy/move folder w/files is implemented
                //
                /* istanbul ignore if */
                if (this.cachedTasks.length > maxTasks)
                {
                    rmvCount = this.cachedTasks.length - maxTasks;
                    log.write(`   removing ${rmvCount} tasks, max ${ this.providerName} task count reached (no license)`, 1, TaskExplorerProvider.logPad + "   ", this.logQueueId);
                    this.cachedTasks.splice(maxTasks, rmvCount);
                    util.showMaxTasksReachedMessage(util.getTaskTypeFriendlyName(this.providerName, true));
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
              paths = getTaskFiles(this.providerName),
              enabled = util.isTaskTypeEnabled(this.providerName);

        log.methodStart(`read ${this.providerName} tasks`, 2, logPad, false, [[ "enabled", enabled ]], this.logQueueId);

        if (enabled && paths)
        {
            for (const fObj of paths)
            {
                if (!util.isExcluded(fObj.uri.path) && !visitedFiles.includes(fObj.uri.fsPath) && pathExistsSync(fObj.uri.fsPath))
                {
                    visitedFiles.push(fObj.uri.fsPath);
                    const tasks = (await this.readUriTasks(fObj.uri, logPad + "   ")).filter(t => isTaskIncluded(t, t.definition.path));
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
        //
        // Note that 'taskType' may be different than 'this.providerName' for 'script' type tasks (e.g.
        // batch, bash, python, etc...)
        //
        log.methodStart(`invalidate ${this.providerName} tasks cache`, 1, logPad, false,
            [[ "uri", uri?.path ], [ "has cached tasks", !!this.cachedTasks ],
            [ "current # of cached tasks", this.cachedTasks ? this.cachedTasks.length : 0 ]
        ]);

        //
        // Allof a sudden the queue is no longer filling up.I think it's from removing the try/catch
        // in Tree.ts.getChildren() around the buildTaskTree() call.  ~ line 932 as of 1/9/23
        //
        /* istanbul ignore if */
        if (uri && this.invalidating) {
            this.queue.push(uri);
            return;
        }
        this.invalidating = true;

        if (this.cachedTasks)
        {
            const enabled = util.isTaskTypeEnabled(this.providerName);
            if (enabled && uri)
            {
                const pathExists = pathExistsSync(uri.fsPath);
                //
                // Remove tasks of type '' from the 'tasks'array
                //
                this.cachedTasks.slice().reverse().forEach((item, index, object) =>
                {
                    if (this.needsRemoval(item, uri))
                    {
                        /* instanbul ignore else */
                        if (item.source !== "Workspace" || /* instanbul ignore next */item.definition.type === this.providerName) {
                            log.write(`   removing cached task '${item.source}/${item.name}'`, 4, logPad);
                            (this.cachedTasks as Task[]).splice(object.length - 1 - index, 1);
                        }
                    }
                });

                //
                // Check `excludes` for exact path which would have been entered via the context menu in
                // the the tree ui.  The check for excluded path patterns also found in the `excludes` array
                // is done by the file caching layer.
                //
                if (pathExists && !configuration.get<string[]>("exclude", []).includes(uri.path))
                {
                    const tasks = (await this.readUriTasks(uri, logPad + "   ")).filter(t => isTaskIncluded(t, t.definition.path));
                    //
                    // If the implementation of the readUri() method awaits, it can theoretically reset
                    // this.cachedTasks under certain circumstances via invalidation by the tree that's
                    // called into by the main VSCode thread. So ensure it's defined before the push()...
                    //
                    /* istanbul ignore next */
                    this.cachedTasks?.push(...tasks);
                }
                else if (!pathExists) {
                    removeFileFromCache(this.providerName, uri, "   ");
                }

                this.cachedTasks = this.cachedTasks && this.cachedTasks.length > 0 ? this.cachedTasks : undefined;
            }
            else {
                this.cachedTasks = undefined;
            }
        }

        log.methodDone(`invalidate ${this.providerName} tasks cache`, 1, logPad, [
            [ "new # of cached tasks", this.cachedTasks ? this.cachedTasks.length : 0 ]
        ]);
        this.invalidating = false;
        await this.processQueue();
    }


    private needsRemoval(item: Task, uri: Uri)
    {
        const cstDef = item.definition;
        return (cstDef.uri &&
               (cstDef.uri.fsPath === uri.fsPath || !pathExistsSync(cstDef.uri.fsPath)) ||
               (cstDef.uri.fsPath.startsWith(uri.fsPath) && /* instanbul ignore next */isDirectory(uri.fsPath))) ||
               (cstDef.uri.path && !isTaskIncluded(item, cstDef.uri.path));
    }


    private async processQueue()
    {   //
        // Allof a sudden the queue is no longer filling up.I think it's from removing the try/catch
        // in Tree.ts.getChildren() around the buildTaskTree() call.  ~ line 932 as of 1/9/23
        //
        /* istanbul ignore if */
        if (this.queue.length > 0) {
            await this.invalidate(this.queue.shift());
        }
    }

}
