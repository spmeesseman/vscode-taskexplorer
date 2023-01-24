
import log from "../lib/log/log";
import { basename, dirname } from "path";
import { TaskExplorerProvider } from "./provider";
import { getRelativePath } from "../lib/utils/pathUtils";
import { ITaskDefinition } from "../interface/ITaskDefinition";
import { Task, WorkspaceFolder, ShellExecution, Uri, workspace, ShellExecutionOptions } from "vscode";
import { configuration } from "../lib/utils/configuration";
import { env } from "process";


export class JenkinsTaskProvider extends TaskExplorerProvider implements TaskExplorerProvider
{

    constructor() { super("jenkins"); }


    public createTask(target: string, cmd: string, folder: WorkspaceFolder, uri: Uri, xArgs: string[]): Task | undefined
    {
        return undefined;
    }


    public getDocumentPosition(scriptName: string | undefined, documentText: string | undefined): number
    {
        return 0;
    }


    public async readUriTasks(uri: Uri, logPad: string): Promise<Task[]>
    {
        const tasks: Task[] = [],
              cwd = dirname(uri.fsPath),
              folder = workspace.getWorkspaceFolder(uri) as WorkspaceFolder,
              pathToCurl = configuration.get<string>("pathToPrograms.curl"),
              pathToJenkins = configuration.get<string>("pathToPrograms.jenkins");

        log.methodStart("read jenkinsfile uri task", 3, logPad, false, [
            [ "path", uri.fsPath ], [ "project folder", folder.name ], [ "path to jenkins", pathToJenkins ], [ "path to curl", pathToJenkins ]
        ], this.logQueueId);

        if (pathToJenkins && pathToCurl && env.JENKINS_API_TOKEN)
        {
            const args = [
                "-X",
                "POST",
                "-L",
                "-H",
                "Authorization: basic " + env.JENKINS_API_TOKEN,
                "-F",
                "jenkinsfile=<Jenkinsfile",
                pathToJenkins + "/pipeline-model-converter/validate"
            ];

            // const shellW32 = configuration.getVs<string>("terminal.integrated.shell.windows"),
            //       shellLnx = configuration.getVs<string>("terminal.integrated.shell.linux"),
            //       shellOsx = configuration.getVs<string>("terminal.integrated.shell.osx");

            const options: ShellExecutionOptions = { cwd };
            if (process.platform === "win32")
            {
                Object.assign(options, {
                    executable: "cmd.exe",
                    shellArgs: [ "/c" ],
                    // type: "process",
                });
            }

            const definition: ITaskDefinition =
            {
                type: "jenkins",
                script: undefined,
                target: undefined,
                fileName: basename(uri.fsPath),
                path: getRelativePath(folder, uri),
                cmdLine: "curl",
                takesArgs: false,
                uri
            };

            const exec = new ShellExecution(pathToCurl, args, options);
            tasks.push(new Task(definition, folder, "Validate Jenkinsfile", "jenkins", exec, "$msCompile"));
        }

        log.methodDone("read jenkinsfile uri tasks", 4, logPad, [[ "# of tasks found", tasks.length ]], this.logQueueId);
        return tasks;
    }

}
