
import * as util from "../lib/utils/utils";
import * as log from "../lib/utils/log";
import constants from "../lib/constants";
import { configuration } from "../lib/utils/configuration";
import { getTaskFiles, removeFileFromCache } from "../cache";
import { Uri, Task, WorkspaceFolder, TaskProvider } from "vscode";
import { isTaskIncluded } from "../lib/isTaskIncluded";
import { getLicenseManager } from "../extension";


export abstract class TaskExplorerProvider implements TaskProvider
{
    abstract createTask(target: string, cmd: string | undefined, folder: WorkspaceFolder, uri: Uri, xArgs?: string[], logPad?: string): Task | undefined;
    abstract getDocumentPosition(taskName: string | undefined, documentText: string | undefined): number;
    abstract readUriTasks(uri: Uri, logPad: string): Promise<Task[]>;


    public cachedTasks: Task[] | undefined;
    public invalidating = false;
    public providerName = "***";
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
    public getGlobPattern(subType?: string)
    {
        return constants[`GLOB_${this.providerName.replace(/\-/g, "").toUpperCase()}`];
    }


    public async provideTasks()
    {
        this.logQueueId = this.providerName + (++this.callCount);
        log.methodStart(`provide ${this.providerName} tasks`, 1, "   ", false, [[ "call count", ++this.callCount ]], this.logQueueId);
        if (!this.cachedTasks)
        {
            const licMgr = getLicenseManager();
            this.cachedTasks = await this.readTasks("      ");
            if (licMgr && !licMgr.isLicensed())
            {
                const maxTasks = licMgr.getMaxNumberOfTasksByType(this.providerName);
                if (this.cachedTasks.length > maxTasks)
                {
                    const rmvCount = this.cachedTasks.length - maxTasks;
                    log.write(`   removing ${rmvCount} tasks, max ${ this.providerName} task count reached (no license)`, 1, "   ", this.logQueueId);
                    this.cachedTasks.splice(maxTasks, rmvCount);
                    util.showMaxTasksReachedMessage(util.getTaskTypeFriendlyName(this.providerName, true));
                }
            }
        }
        log.methodDone(`provide ${this.providerName} tasks`, 1, "   ", false, undefined, this.logQueueId);
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

        log.methodStart(`read ${this.providerName} tasks`, 1, logPad, false, [[ "enabled", enabled ]], this.logQueueId);

        if (enabled && paths)
        {
            for (const fObj of paths.values())
            {
                if (!util.isExcluded(fObj.uri.path) && !visitedFiles.includes(fObj.uri.fsPath) && util.pathExists(fObj.uri.fsPath))
                {
                    visitedFiles.push(fObj.uri.fsPath);
                    const tasks = (await this.readUriTasks(fObj.uri, logPad + "   ")).filter(t => isTaskIncluded(t, t.definition.path));
                    log.write(`   processed ${this.providerName} file`, 3, logPad, this.logQueueId);
                    log.value("      file", fObj.uri.fsPath, 3, logPad, this.logQueueId);
                    log.value("      targets in file", tasks.length, 3, logPad, this.logQueueId);
                    allTasks.push(...tasks);
                }
            }
        }

        log.methodDone(`read ${this.providerName} tasks`, 1, logPad, false, [[ "# of tasks parsed", allTasks.length ]], this.logQueueId);

        return allTasks;
    }


    public resolveTask(_task: Task): Task | undefined
    {
        return undefined;
    }


    public async invalidate(uri?: Uri, logPad = ""): Promise<void>
    {
        log.methodStart(`invalidate ${this.providerName} tasks cache`, 1, logPad, false,
            [[ "uri", uri?.path ], [ "has cached tasks", !!this.cachedTasks ]]
        );

        if (uri && this.invalidating) {
            this.queue.push(uri);
            return;
        }
        this.invalidating = true;

        if (this.cachedTasks)
        {
            const enabled = util.isTaskTypeEnabled(this.providerName);
            // if (!enabled)
            // {
            //     // if (this.providerName === "script") {
            //     //     someday.  we still kill the whole script typegroup (i.e. batch, bash, python, etc)
            //     // }
            //     // else {
            //         // uri = undefined;
            //     // }
            // }
            if (enabled && uri)
            {
                const pathExists = util.pathExists(uri.fsPath);
                //
                // Remove tasks of type '' from the 'tasks'array
                //
                this.cachedTasks.slice().reverse().forEach((item, index, object) =>
                {
                    const cstDef = item.definition; // leave`enabled` below, for one day when we invalidate only a specific script type
                    if (!enabled || (cstDef.uri && (cstDef.uri.fsPath === uri.fsPath || !util.pathExists(cstDef.uri.fsPath))) ||
                        (cstDef.path && !isTaskIncluded(item, cstDef.path)))
                    {
                        if (item.source !== "Workspace" || item.definition.type === this.providerName) {
                            log.write(`   removing cached task '${item.source}/${item.name}'`, 4, logPad);
                            (this.cachedTasks as Task[]).splice(object.length - 1 - index, 1);
                        }
                    }
                });

                if (pathExists && !configuration.get<string[]>("exclude", []).includes(uri.path))
                // if (pathExists && !util.isExcluded(uri.path))
                {    // leave`enabled` below, for one day when we invalidate only a specific script type
                    const tasks = enabled ? (await this.readUriTasks(uri, logPad + "   ")).filter(t => isTaskIncluded(t, t.definition.path)) : [];
                    //
                    // If the implementation of the readUri() method awaits, it can theoretically reset
                    // this.cachedTasks under certain circumstances via invalidation by the tree that's
                    // called into by the main VSCode thread. So ensure it's defined before the push()...
                    //
                    /* istanbul ignore next */
                    this.cachedTasks?.push(...tasks);
                }
                else if (!pathExists) {
                    await removeFileFromCache(this.providerName, uri, "   ");
                }

                this.cachedTasks = this.cachedTasks && this.cachedTasks.length > 0 ? this.cachedTasks : undefined;
            }
            else {
                this.cachedTasks = undefined;
            }
        }

        log.methodDone(`invalidate ${this.providerName} tasks cache`, 1, logPad);
        this.invalidating = false;
        await this.processQueue();
    }


    private async processQueue()
    {
        if (this.queue.length > 0) {
            await this.invalidate(this.queue.shift());
        }
    }

}
