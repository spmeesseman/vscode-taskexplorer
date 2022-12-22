
import { Task} from "vscode";
import * as path from "path";
import * as log from "../common/log";
import * as util from "../common/utils";
import { providersExternal } from "../extension";
import { configuration } from "../common/configuration";
import { getTaskName } from "./getTaskName";


function isNpmInstallTask(task: Task): boolean
{
    return task.source === "npm" && task.name === getTaskName("install", task.definition.path);
}


export function isTaskIncluded(task: Task, relativePath: string, logPad = ""): boolean | string
{
    //
    // We have our own provider for Gulp and Grunt tasks...
    // Ignore VSCode provided gulp and grunt tasks, which are always and only from a gulp/gruntfile
    // in a workspace folder root directory.  All internally provided tasks will have the 'uri' property
    // set in its task definition,VSCode provided Grunt/Gulp tasks will not
    //
    if (!task.definition.uri && (task.source === "gulp" || task.source === "grunt"))
    {
        log.write(`   skipping vscode provided ${task.source} task`, 2, logPad);
        return false;
    }

    //
    // TSC tasks are returned with no path value, the relative path is in the task name:
    //
    //     watch - tsconfig.json
    //     watch - .vscode-test\vscode-1.32.3\resources\app\tsconfig.schema.json
    //
    if (task.source === "tsc" && util.isWorkspaceFolder(task.scope))
    {
        if (task.name.indexOf(" - ") !== -1 && task.name.indexOf(" - tsconfig.json") === -1)
        {
            relativePath = path.dirname(task.name.substring(task.name.indexOf(" - ") + 3));
            if (util.isExcluded(path.join(task.scope.uri.path, relativePath)))
            {
                log.write("   skipping this tsc task (remapped subfolder)", 2, logPad);
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
    // Check task excludes array
    //
    const excludeTask = configuration.get<string[]>("excludeTask");
    if (excludeTask && excludeTask.length > 0)
    {
        const fExcludeTasks = excludeTask.filter(et => !!et && util.isString(et) && et.length > 1);
        for (const rgxPattern of fExcludeTasks) {
            if ((new RegExp(rgxPattern)).test(task.name)) {
                log.write("   skipping this task (by 'excludeTask' setting)", 2, logPad);
                return false;
            }
        }
    }

    //
    // Check VSCode /workspace tasks for 'hide' property
    //
    if (task.source === "tsc")
    {
        const showHiddenWsTasks = configuration.get<boolean>("showHiddenWsTasks");
        if (!showHiddenWsTasks && task.definition.hide === true) {
            log.write("   skipping this task (by 'showHiddenWsTasks' setting)", 2, logPad);
            return false;
        }
    }

    //
    // Check enabled and npm install task
    // THis will ignore tasks from other providers as well, unless it has registered
    // as an external provider via Task Explorer API
    //
    const srcEnabled = configuration.get(util.getTaskTypeEnabledSettingName(task.source)),
            isNpmInstall = isNpmInstallTask(task);
    if ((srcEnabled || !util.isWorkspaceFolder(task.scope)) && !isNpmInstall)
    {
        return true;
    }

    log.value("   enabled in settings", srcEnabled, 2, logPad);
    log.value("   is npm install task", isNpmInstall, 2, logPad);

    if (isNpmInstall && srcEnabled) {
        return "npm-install";
    }
    log.write("   skipping this task", 2, logPad);

    return false;
}
