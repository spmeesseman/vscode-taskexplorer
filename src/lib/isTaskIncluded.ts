
import { Task} from "vscode";
import * as path from "path";
import * as json5 from "json5";
import * as log from "../common/log";
import * as util from "../common/utils";
import { providersExternal } from "../extension";
import { configuration } from "../common/configuration";
import { getTaskName } from "./getTaskName";
import { existsSync, readFileSync } from "fs";


function isNpmInstallTask(task: Task): boolean
{
    return task.source === "npm" && task.name === getTaskName("install", task.definition.path);
}


export function isTaskIncluded(task: Task, relativePath: string, logPad = ""): boolean | string
{
    const isScopeWsFolder = util.isWorkspaceFolder(task.scope);

    log.methodStart(`Check task inclusion for '${task.source}/${task.name}'`, 3, logPad, false, [
        [ "scope is ws folder", isScopeWsFolder ], [ "relative path", relativePath ]
    ]);

    //
    // We have our own provider for Gulp and Grunt tasks...
    // Ignore VSCode provided gulp and grunt tasks, which are always and only from a gulp/gruntfile
    // in a workspace folder root directory.  All internally provided tasks will have the 'uri' property
    // set in its task definition,VSCode provided Grunt/Gulp tasks will not
    //
    if (!task.definition.uri && (task.source === "gulp" || task.source === "grunt"))
    {
        log.write(`   skipping vscode provided ${task.source} task`, 3, logPad);
        return false;
    }

    //
    // Check enabled and npm install task
    // This will ignore tasks from other providers as well, unless it has registered
    // as an external provider via Task Explorer API
    //
    const srcEnabled = util.isTaskTypeEnabled(task.source);
    log.value("   enabled in settings", srcEnabled, 3, logPad);
    if (!srcEnabled)
    {
        log.write(`   skipping this task (${task.source} disabled in settings)`, 3, logPad);
        return false;
    }

    //
    // Check task excludes array
    //
    const excludeTask = configuration.get<string[]>("excludeTask");
    if (excludeTask && excludeTask.length > 0)
    {

        const fExcludeTasks = excludeTask.filter(et => !!et && util.isString(et) && et.length > 1);
        for (const rgxPattern of fExcludeTasks)
        {
            if ((new RegExp(rgxPattern)).test(task.name))
            {
                log.write("   skipping this task (by 'excludeTask' setting)", 3, logPad);
                log.methodDone('Check task inclusion', 3, logPad);
                return false;
            }
        }
    }

    //
    // TSC tasks are returned with no path value, the relative path is in the task name:
    //
    //     watch - tsconfig.json
    //     watch - .vscode-test\vscode-1.32.3\resources\app\tsconfig.schema.json
    //
    if (task.source === "tsc" && isScopeWsFolder)
    {
        if (task.name.indexOf(" - ") !== -1 && task.name.indexOf(" - tsconfig.json") === -1)
        {
            relativePath = path.dirname(task.name.substring(task.name.indexOf(" - ") + 3));
            if (util.isExcluded(path.join(task.scope.uri.path, relativePath)))
            {
                log.write("   skipping this tsc task (remapped subfolder)", 3, logPad);
                log.methodDone('Check task inclusion', 3, logPad);
                return false;
            }
            return relativePath;
        }
    }

    //
    // External tasks registered via Task Explorer API
    //
    if (providersExternal.get(task.source)) {
        return !!task.definition && !!task.name && !!task.execution;
    }

    //
    // Check VSCode /workspace tasks for 'hide' property
    //
    if (task.source === "Workspace" && isScopeWsFolder)
    {
        const showHiddenWsTasks = configuration.get<boolean>("showHiddenWsTasks", true);
        if (!showHiddenWsTasks) // && task.definition.hide === true)
        {   //
            // Note: VSCode workspace task provider does not publish the 'hide' property anywhere
            // in the task,, it[s definition, detail, anywhere.  Stupid. So we have to JSON parse
            // the tasks.json file to see if the hideproperty is set.
            //
            const tasksFile = path.join(task.scope.uri.fsPath, ".vscode", "tasks.json");
            if (existsSync(tasksFile))
            {
                try
                {   const json = readFileSync(tasksFile).toString();
                    const tasksJso = json5.parse(json);
                    const wsTask = tasksJso.tasks.find((t: any) => t.label === task.name || t.script === task.name);
                    if (wsTask && wsTask.hide === true) {
                        log.write("   skipping this task (by 'showHiddenWsTasks' setting)", 2, logPad);
                        log.methodDone('Check task inclusion', 2, logPad);
                        return false;
                    }
                }
                catch (e: any) { log.error(e); }
            }
        }
    }

    //
    // Check enabled and npm install task
    // This will ignore tasks from other providers as well, unless it has registered
    // as an external provider via Task Explorer API
    //
    const isNpmInstall = isNpmInstallTask(task);
    log.value("   is npm install task", isNpmInstall, 3, logPad);
    if ((srcEnabled || !isScopeWsFolder) && !isNpmInstall)
    {
        log.write('   Task is included', 3, logPad);
        log.methodDone('Check task inclusion', 3, logPad);
        return true;
    }
    if (isNpmInstall && srcEnabled) {
        log.methodDone('Check task inclusion', 3, logPad);
        return "npm-install";
    }

    log.write("   skipping this task", 3, logPad);
    log.methodDone('Check task inclusion', 3, logPad);
    return false;
}
