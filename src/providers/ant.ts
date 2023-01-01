
import { Task, TaskGroup, WorkspaceFolder, ShellExecution, Uri, window, workspace } from "vscode";
import * as path from "path";
import * as util from "../common/utils";
import * as log from "../common/log";
import { execSync } from "child_process";
import { parseStringPromise } from "xml2js";
import { configuration } from "../common/configuration";
import { TaskExplorerProvider } from "./provider";
import { TaskExplorerDefinition } from "../interface/taskDefinition";
import constants from "../common/constants";


interface StringMap { [s: string]: string }


export class AntTaskProvider extends TaskExplorerProvider implements TaskExplorerProvider
{

    constructor() { super("ant"); }


    public createTask(target: string, cmdName: string, folder: WorkspaceFolder, uri: Uri, xArgs?: string[]): Task
    {
        const cwd = path.dirname(uri.fsPath),
              def = this.getDefaultDefinition(target, folder, uri);
        let args = [ target ],
            options: any = {  cwd };

        //
        // Ansicon for Windows
        //
        if (process.platform === "win32" && configuration.get("enableAnsiconForAnt") === true)
        {
            let ansicon = "ansicon.exe";
            const ansiPath: string = configuration.get("pathToPrograms.ansicon");
            if (ansiPath && util.pathExists(ansiPath))
            {
                ansicon = ansiPath;
                if (!ansicon.endsWith("ansicon.exe") && !ansicon.endsWith("\\")) {
                    ansicon = path.join(ansicon, "ansicon.exe");
                }
                else if (!ansicon.endsWith("ansicon.exe")) {
                    ansicon += "ansicon.exe";
                }
            }

            args = [ "-logger", "org.apache.tools.ant.listener.AnsiColorLogger", target ];
            options = {
                cwd,
                executable: ansicon
            };
        }

        if (def.fileName && def.fileName.toLowerCase() !== "build.xml")
        {
            args.push("-f");
            args.push(def.fileName);
        }

        const execution = new ShellExecution(this.getCommand(), args, options);

        return new Task(def, folder, cmdName, "ant", execution, undefined);
    }


    private async findAllAntScripts(path: string, logPad: string): Promise<StringMap>
    {
        const scripts: StringMap = {};
        const useAnt = configuration.get<boolean>("useAnt");

        log.methodStart("find ant targets", 2, logPad, false, [[ "use ant", useAnt ], [ "path", path ]]);

        //
        // Try running 'ant' itself to get the targets.  If fail, just custom parse
        //
        try {
            if (useAnt === true)
            {
                this.findTasksWithAnt(path, scripts, logPad + "   ");
            }
            else {
                await this.findTasksWithXml2Js(path, scripts, logPad + "   ");
            }
        }
        catch (ex) {
            this.logException(ex);
        }


        log.methodDone("find ant targets complete", 2, logPad);
        return scripts;
    }


    public getDocumentPosition(taskName: string | undefined, documentText: string | undefined): number
    {
        if (!taskName || !documentText) {
            return 0;
        }
        taskName = taskName.replace(" - Default", "");
        let idx = this.getDocumentPositionLine("name=", taskName, documentText, 6);
        if (idx > 0)
        {   //
            // Check to make sure this isnt the 'default task' position,i.e.:
            //
            //     <project basedir="." default="test-build">
            //
            const scriptOffset2 = this.getDocumentPositionLine("name=", taskName, documentText, 6, idx + 1);
            /* istanbul ignore if */
            if (scriptOffset2 > 0) {
                idx = scriptOffset2;
            }
        }
        return idx;
    }


    /**
     * Use the ant program to find tasks.  Wrapped by try/catch in findAllAntScripts().
     *
     * @param path Path to the file to parse for tasks
     * @param taskMap The task map to populate
     */
    private findTasksWithAnt(path: string, taskMap: StringMap, logPad: string)
    {
        log.methodStart("find tasks with ant", 2, logPad, false, [[ "path", path ]]);
        //
        // Execute 'ant'/'ant.bat' to find defined tasks (ant targets)
        //
        // Sample Output of ant -p :
        //
        //     Buildfile: C:\Projects\.....\build.xml
        //
        //     Main targets:
        //
        //     Other targets:
        //
        //      Clean
        //      G32ProductionSQLServer
        //      G32SQLServer
        //      G64
        //      G64AspNetCore
        //      G64Production
        //      G64ProductionSQLServer
        //      G64SQLServer
        //      init
        //
        //     Default target: G64
        //
        const  stdout = execSync(this.getCommand() + " -f " + path + " -p");
        let text: any = stdout.toString();
        //
        // First get the default, use 2nd capturing group (returned arr-idx 2):
        //
        let defaultTask = text.match(/(Default target: )([\w\-_]+)/i);
        if (defaultTask && defaultTask.length > 2)
        {
            defaultTask = defaultTask[2];
            defaultTask = defaultTask.trim();
        }
        //
        // Loop through all the lines and extract the task names, if it's a task
        //
        text = text.split("\n");
        for (const i of Object.keys(text))
        {
            const line: string = text[i].trim();
            if (!line || line.match(/(target[s]{0,1}:|Buildfile:)/i)) {
                continue;
            }
            log.value("   Found target (ant -p)", line, 3, logPad);
            taskMap[defaultTask === line ? line + " - Default" : line] = line;
        }

        log.methodDone("find tasks with ant", 2, logPad, false, [[ "# of tasks", taskMap.size ]]);
    }


    private logException(ex: any)
    {
        log.error([ "*** Error running/executing ant!!", "Check to ensure the path to ant/ant.bat is correct", ex.toString() ]);
        window.showInformationMessage("Error running/executing ant!! Check to ensure the path to ant/ant.bat is correct and your xml is valid<br><br>" + ex.toString());
    }


    private async findTasksWithXml2Js(path: string, taskMap: StringMap, logPad: string)
    {
        log.methodStart("find tasks with xml2js", 2, logPad, false, [[ "path", path ]]);

        const buffer = util.readFileSync(path);
        //
        // Convert to JSON with Xml2Js parseString()
        //
        const text = await parseStringPromise(buffer);
        //
        // We should have a main 'project' object and a 'project.target' array
        //
        if (text && text.project && text.project.target)
        {
            const defaultTask = text.project.$.default; // Is default task?  It's always defined on the main project node
            const targets = text.project.target;
            for (const tgt of targets)                  // Check .$ and .$.name (xml2js output format)
            {
                if (tgt.$ && tgt.$.name) {
                    log.value("   Found target (cst.)", tgt.$.name, 3, logPad);
                    taskMap[defaultTask === tgt.$.name ? tgt.$.name + " - Default" : tgt.$.name] = tgt.$.name;
                }
            }
        }

        log.methodDone("find tasks with xml2js", 2, logPad, false, [[ "# of tasks", taskMap.size ]]);

        // return new Promise((resolve, reject) =>
        // {
        //     log.methodStart("find tasks with xml2js", 3, logPad, false, [["path", path]]);
        //     const buffer = util.readFileSync(path);
        //
        //     parseString(buffer, (err, text) =>
        //     {
        //         if (err){
        //             log.methodDone("find tasks with xml2js", 3, logPad, false, [["error", err.toString()]]);
        //             reject(err);
        //         }
        //         else {
        //             //
        //             // We should have a main 'project' object and a 'project.target' array
        //             //
        //             if (text && text.project && text.project.target)
        //             {
        //                 const defaultTask = text.project.$.default; // Is default task?  It's always defined on the main project node
        //                 const targets = text.project.target;
        //                 for (const tgt of targets)                  // Check .$ and .$.name (xml2js output format)
        //                 {
        //                     if (tgt.$ && tgt.$.name) {
        //                         log.value("   Found target (cst.)", tgt.$.name);
        //                         taskMap[defaultTask === tgt.$.name ? tgt.$.name + " - Default" : tgt.$.name] = tgt.$.name;
        //                     }
        //                 }
        //             }
        //             log.methodDone("find tasks with xml2js", 3, logPad, false, [["# of tasks", taskMap.size]]);
        //             resolve(taskMap);
        //         }
        //     });
        // });
    }


    private getCommand(): string
    {
        let ant = "ant";
        /* istanbul ignore else */
        if (process.platform === "win32") {
            ant = "ant.bat";
        }
        /* istanbul ignore else */
        if (configuration.get("pathToPrograms.ant"))
        {
            ant = configuration.get("pathToPrograms.ant");
            if (process.platform === "win32" && ant.endsWith("\\ant")) {
                ant += ".bat";
            }
        }
        return ant;
    }


    private getDefaultDefinition(target: string, folder: WorkspaceFolder, uri: Uri): TaskExplorerDefinition
    {
        const def: TaskExplorerDefinition = {
            type: "ant",
            script: target,
            target,
            path: util.getRelativePath(folder, uri),
            fileName: path.basename(uri.path),
            uri
        };
        return def;
    }


    public getGlobPattern()
    {
        return util.getCombinedGlobPattern(constants.GLOB_ANT,
                                           [ ...configuration.get<string[]>("includeAnt", []),
                                            ...configuration.get<string[]>("globPatternsAnt", []) ]);
    }


    public async readUriTasks(uri: Uri, logPad: string): Promise<Task[]>
    {
        const result: Task[] = [],
              folder = workspace.getWorkspaceFolder(uri) as WorkspaceFolder;

        log.methodStart("read ant file uri tasks", 1, logPad, false, [[ "path", uri.fsPath ], [ "project folder", folder.name ]]);

        /* istanbul ignore else */
        if (folder)
        {
            const scripts = await this.findAllAntScripts(uri.fsPath, logPad + "   ");
            for (const s of Object.keys(scripts))
            {
                const task = this.createTask(scripts[s], s, folder, uri);
                task.group = TaskGroup.Build;
                result.push(task);
            }
        }

        log.methodDone("read ant file uri tasks", 1, logPad);
        return result;
    }

}
