
import { Task, WorkspaceFolder, ShellExecution, Uri, workspace, ShellExecutionOptions } from "vscode";
import * as path from "path";
import * as util from "../common/utils";
import * as log from "../common/log";
import { filesCache } from "../cache";
import { configuration } from "../common/configuration";
import { TaskExplorerProvider } from "./provider";
import { TaskExplorerDefinition } from "../taskDefinition";


export class MavenTaskProvider extends TaskExplorerProvider implements TaskExplorerProvider
{

    constructor() { super("maven"); }


    public createTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri, xArgs: string[]): Task | undefined
    {
        return undefined;
    }


    public getDefaultDefinition(target: string | undefined, folder: WorkspaceFolder, uri: Uri): TaskExplorerDefinition
    {
        const def: TaskExplorerDefinition = {
            type: "maven",
            script: target,
            target,
            fileName: path.basename(uri.fsPath),
            path: util.getRelativePath(folder, uri),
            cmdLine: "mvn",
            takesArgs: false,
            uri
        };
        return def;
    }


    public getDocumentPosition(scriptName: string | undefined, documentText: string | undefined): number
    {
        return 0;
    }


    public async readTasks(logPad: string): Promise<Task[]>
    {
        log.methodStart("detect maven files", 1, logPad, true);

        const allTasks: Task[] = [];
        const visitedFiles: Set<string> = new Set();
        const paths = filesCache.get("maven");

        if (workspace.workspaceFolders && paths)
        {
            for (const fObj of paths)
            {
                if (!util.isExcluded(fObj.uri.path) && !visitedFiles.has(fObj.uri.fsPath))
                {
                    visitedFiles.add(fObj.uri.fsPath);
                    allTasks.push(...await this.readUriTasks(fObj.uri, logPad + "   "));
                }
            }
        }

        log.value(logPad + "   # of tasks", allTasks.length, 2, logPad);
        log.methodDone("detect maven files", 1, logPad, true);

        return allTasks;
    }


    private getCommand(): string
    {
        let mvn = "mvn";
        if (configuration.get("pathToMaven"))
        {
            mvn = configuration.get("pathToMaven");
        }
        return mvn;
    }


    public async readUriTasks(uri: Uri, logPad: string): Promise<Task[]>
    {
        const cwd = path.dirname(uri.fsPath),
              folder = workspace.getWorkspaceFolder(uri),
              args = [];

        if (!folder) {
            return [];
        }

        const defaultDef = this.getDefaultDefinition(undefined, folder, uri),
              options: ShellExecutionOptions = { cwd };

        log.methodStart("read maven file uri task", 1, logPad, true, [["path", uri?.fsPath], ["project folder", folder?.name]]);

        const kindClean: TaskExplorerDefinition = {
            ...defaultDef,
            ...{
                cmdLine: this.getCommand() + " clean -f " + defaultDef.fileName
            }
        };

        const kindCompile: TaskExplorerDefinition = {
            ...defaultDef,
            ...{
                cmdLine: this.getCommand() + " compile -f " + defaultDef.fileName
            }
        };

        const kindDeploy: TaskExplorerDefinition = {
            ...defaultDef,
            ...{
                cmdLine: this.getCommand() + " deploy -f " + defaultDef.fileName
            }
        };

        const kindInstall: TaskExplorerDefinition = {
            ...defaultDef,
            ...{
                cmdLine: this.getCommand() + " install -f " + defaultDef.fileName,
            }
        };

        const kindPackage: TaskExplorerDefinition = {
            ...defaultDef,
            ...{
                cmdLine: this.getCommand() + " package -f " + defaultDef.fileName,
            }
        };

        const kindTest: TaskExplorerDefinition = {
            ...defaultDef,
            ...{
                cmdLine: this.getCommand() + " test -f " + defaultDef.fileName,
            }
        };

        const kindValidate: TaskExplorerDefinition = {
            ...defaultDef,
            ...{
                cmdLine: this.getCommand() + " valudate -f " + defaultDef.fileName,
            }
        };

        const kindVerify: TaskExplorerDefinition = {
            ...defaultDef,
            ...{
                cmdLine: this.getCommand() + " verify -f " + defaultDef.fileName,
            }
        };

        //
        // Create the shell execution objects
        //
        const executionClean = kindClean.cmdLine ? new ShellExecution(kindClean.cmdLine, options) : undefined;
        const executionCompile = kindCompile.cmdLine ? new ShellExecution(kindCompile.cmdLine, options) : undefined;
        const executionDeploy = kindDeploy.cmdLine ? new ShellExecution(kindDeploy.cmdLine, options) : undefined;
        const executionInstall = kindInstall.cmdLine ? new ShellExecution(kindInstall.cmdLine, options) : undefined;
        const executionPackage = kindPackage.cmdLine ? new ShellExecution(kindPackage.cmdLine, options) : undefined;
        const executionTest = kindTest.cmdLine ? new ShellExecution(kindTest.cmdLine, options) : undefined;
        const executionValidate = kindValidate.cmdLine ? new ShellExecution(kindValidate.cmdLine, options) : undefined;
        const executionVerify = kindVerify.cmdLine ? new ShellExecution(kindVerify.cmdLine, options) : undefined;

        log.methodDone("read app-ublisher file uri tasks", 1, logPad, true);

        return [ new Task(kindClean, folder, "Clean", "maven", executionClean, undefined),
                 new Task(kindCompile, folder, "Compile", "maven", executionCompile, undefined),
                 new Task(kindDeploy, folder, "Deploy", "maven", executionDeploy, undefined),
                 new Task(kindInstall, folder, "Install", "maven", executionInstall, undefined),
                 new Task(kindPackage, folder, "Package", "maven", executionPackage, undefined),
                 new Task(kindTest, folder, "Test", "maven", executionTest, undefined),
                 new Task(kindValidate, folder, "Validate", "maven", executionValidate, undefined),
                 new Task(kindVerify, folder, "Verify", "maven", executionVerify, undefined) ];
    }

}
