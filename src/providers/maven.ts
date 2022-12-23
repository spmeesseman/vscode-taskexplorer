
import * as path from "path";
import * as util from "../common/utils";
import * as log from "../common/log";
import { configuration } from "../common/configuration";
import { TaskExplorerProvider } from "./provider";
import { TaskExplorerDefinition } from "../interface/taskDefinition";
import { Task, WorkspaceFolder, ShellExecution, Uri, workspace, ShellExecutionOptions } from "vscode";


export class MavenTaskProvider extends TaskExplorerProvider implements TaskExplorerProvider
{

    constructor() { super("maven"); }


    public createTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri, xArgs: string[]): Task | undefined
    {
        return undefined;
    }


    private getDefaultDefinition(target: string | undefined, folder: WorkspaceFolder, uri: Uri): TaskExplorerDefinition
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


    private getCommand(): string
    {
        let mvn = "mvn";
        if (configuration.get("pathToPrograms.maven"))
        {
            mvn = configuration.get("pathToPrograms.maven");
        }
        return mvn;
    }


    public async readUriTasks(uri: Uri, logPad: string): Promise<Task[]>
    {
        const cwd = path.dirname(uri.fsPath),
              folder = workspace.getWorkspaceFolder(uri) as WorkspaceFolder,
              defaultDef = this.getDefaultDefinition(undefined, folder, uri),
              options: ShellExecutionOptions = { cwd };

        log.methodStart("read maven file uri task", 1, logPad, true, [["path", uri.fsPath], ["project folder", folder.name]]);

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
                cmdLine: this.getCommand() + " validate -f " + defaultDef.fileName,
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
        const executionClean = new ShellExecution(kindClean.cmdLine as string, options);
        const executionCompile = new ShellExecution(kindCompile.cmdLine as string, options);
        const executionDeploy = new ShellExecution(kindDeploy.cmdLine as string, options);
        const executionInstall = new ShellExecution(kindInstall.cmdLine as string, options);
        const executionPackage = new ShellExecution(kindPackage.cmdLine as string, options);
        const executionTest = new ShellExecution(kindTest.cmdLine as string, options);
        const executionValidate = new ShellExecution(kindValidate.cmdLine as string, options);
        const executionVerify = new ShellExecution(kindVerify.cmdLine as string, options);

        log.methodDone("read maven file uri tasks", 1, logPad, true);

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
