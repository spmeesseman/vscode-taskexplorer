
import { Task, TaskGroup, WorkspaceFolder, ShellExecution, Uri, window, workspace } from "vscode";
import * as path from "path";
import * as util from "../common/utils";
import * as log from "../common/log";
import { execSync } from "child_process";
import { parseStringPromise } from "xml2js";
import { configuration } from "../common/configuration";
import { filesCache } from "../cache";
import { TaskExplorerProvider } from "./provider";
import { TaskExplorerDefinition } from "../taskDefinition";


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
            const ansiPath: string = configuration.get("pathToAnsicon");
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

        return new Task(def, folder, cmdName ? cmdName : target, "ant", execution, undefined);
    }


    private async findAllAntScripts(path: string, logPad = ""): Promise<StringMap>
    {
        const scripts: StringMap = {};
        const useAnt = configuration.get<boolean>("useAnt");

        log.methodStart("find ant targets", 1, logPad, true, [["use ant", useAnt]]);

        //
        // Try running 'ant' itself to get the targets.  If fail, just custom parse
        //
        try {
            if (useAnt === true)
            {
                this.findTasksWithAnt(path, scripts);
            }
            else {
                await this.findTasksWithXml2Js(path, scripts);
            }
        }
        catch (ex) {
            this.logException(ex);
        }


        log.methodDone("find ant targets complete", 1, logPad, true);
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
            if (scriptOffset2 > 0) {
                idx = scriptOffset2;
            }
        }
        return idx;
    }


    private findTasksWithAnt(path: string, scripts: StringMap)
    {
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
        const stdout: Buffer = execSync(this.getCommand() + " -f " + path + " -p");

        if (stdout)
        {
            let text: any = stdout.toString();
            //
            // First get the default, use 2nd capturing group (returned arr-idx 2):
            //
            let defaultTask = text.match(/(Default target: )([\w\-]+)/i);
            if (defaultTask && defaultTask.length > 2) {
                defaultTask = defaultTask[2];
                defaultTask = defaultTask.trim();
            }
            //
            // Loop through all the lines and extract the task names, if it's a task
            //
            text = text.split("\n");
            for (const i in text)
            {
                if (text.hasOwnProperty(i)) { // skip over properties inherited by prototype
                    const line: string = text[i].trim();
                    if (!line || line.match(/(target[s]{0,1}:|Buildfile:)/i)) {
                        continue;
                    }
                    log.value("   Found target (ant -p)", line);
                    scripts[defaultTask === line ? line + " - Default" : line] = line;
                }
            }
        }
    }


    private logException(ex: any)
    {
        log.error([ "*** Error running/executing ant!!", "Check to ensure the path to ant/ant.bat is correct", ex?.toString() ]);
        window.showInformationMessage("Error running/executing ant!!  Check to ensure the path to ant/ant.bat is correct");
    }


    private async findTasksWithXml2Js(path: string, scripts: StringMap)
    {
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
                    log.value("   Found target (cst.)", tgt.$.name);
                    scripts[defaultTask === tgt.$.name ? tgt.$.name + " - Default" : tgt.$.name] = tgt.$.name;
                }
            }
        }
    }


    private getCommand(): string
    {
        let ant = "ant";
        if (process.platform === "win32") {
            ant = "ant.bat";
        }
        if (configuration.get("pathToAnt"))
        {
            ant = configuration.get("pathToAnt");
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


    public async readUriTasks(uri: Uri, logPad: string): Promise<Task[]>
    {
        const result: Task[] = [],
              folder = workspace.getWorkspaceFolder(uri) as WorkspaceFolder;

        log.methodStart("read ant file uri task", 1, logPad, true, [["path", uri.fsPath], ["project folder", folder.name]]);

        if (folder)
        {
            const scripts = await this.findAllAntScripts(uri.fsPath, logPad + "   ");
            for (const s of Object.keys(scripts))
            {
                const task = this.createTask(scripts[s] ? scripts[s] : s, s, folder, uri);
                task.group = TaskGroup.Build;
                result.push(task);
            }
        }

        log.methodDone("read ant file uri task", 1, logPad, true);
        return result;
    }

}
