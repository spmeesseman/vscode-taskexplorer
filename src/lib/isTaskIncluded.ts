
import log from "./log/log";
import { join } from "path";
import { providersExternal } from "../extension";
import { configuration } from "./utils/configuration";
import { Task } from "vscode";
import { pathExistsSync, readFileSync } from "./utils/fs";
import { isString, isTaskTypeEnabled, isWorkspaceFolder } from "./utils/utils";
//
// FOr JSON5, if I don't specifically import index.js with 'require', then the
// damn mjs module file is included by webpack.  I'm sure there's a way to have
// it import the commonjs module nicely, but couldn't find a way. JSON5 is needed
// to read the VSCode tasks.json file since it allows comments, and VSCode doesn't
// expose the task definition's 'hide' property.
//
const JSON5 = require("json5/dist/index.js");


export const isTaskIncluded = (task: Task, relativePath: string, logPad = "", logQueueId?: string) =>
{
    const isScopeWsFolder = isWorkspaceFolder(task.scope);

    log.methodStart(`Check task inclusion for '${task.source}/${task.name}'`, 4, logPad, false, [
        [ "scope is ws folder", isScopeWsFolder ], [ "relative path", relativePath ]
    ], logQueueId);

    //
    // We have our own provider for Gulp and Grunt tasks...
    // Ignore VSCode provided gulp and grunt tasks, which are always and only from a gulp/gruntfile
    // in a workspace folder root directory.  All internally provided tasks will have the 'uri' property
    // set in its task definition, VSCode provided Grunt/Gulp tasks will not
    //
    if (!task.definition.uri && (task.source === "grunt" || task.source === "gulp"))
    {
        log.write(`   skipping vscode provided ${task.source} task`, 4, logPad, logQueueId);
        return false;
    }

    //
    // Check enabled and npm install task
    // This will ignore tasks from other providers as well, unless it has registered
    // as an external provider via Task Explorer API
    //
    const srcEnabled = isTaskTypeEnabled(task.source);
    log.value("   enabled in settings", srcEnabled, 3, logPad, logQueueId);
    if (!srcEnabled)
    {
        log.write(`   skipping this task (${task.source} disabled in settings)`, 4, logPad, logQueueId);
        return false;
    }

    //
    // Check task excludes array
    //
    const excludeTask = configuration.get<string[]>("excludeTask", []),
          fExcludeTasks = excludeTask.filter(et => !!et && isString(et) && et.length > 1);
    for (const rgxPattern of fExcludeTasks)
    {
        if ((new RegExp(rgxPattern)).test(task.name))
        {
            log.write("   skipping this task (by 'excludeTask' setting)", 4, logPad, logQueueId);
            log.methodDone("Check task inclusion", 4, logPad, undefined, logQueueId);
            return false;
        }
    }

    //
    // External tasks registered via Task Explorer API
    //
    // TODO - remove coverage ignore tags when external providers test suite can be done
    //
    /* istanbul ignore if */
    if (providersExternal[task.source]) {
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
            // in the task,, it's definition, detail, anywhere.  Stupid. So we have to JSON parse
            // the tasks.json file to see if the hideproperty is set.
            //
            const tasksFile = join(task.scope.uri.fsPath, ".vscode", "tasks.json");
            try
            {   const json = readFileSync(tasksFile).toString();
                const tasksJso = JSON5.parse(json); // damn mjs module json5 needed for comments allowed in tasks.json
                const wsTask = tasksJso.tasks.find((t: any) => t.label === task.name || t.script === task.name);
                if (wsTask && wsTask.hide === true) {
                    log.write("   skipping this task (by 'showHiddenWsTasks' setting)", 4, logPad, logQueueId);
                    log.methodDone("Check task inclusion", 4, logPad, undefined, logQueueId);
                    return false;
                }
            }
            catch (e: any) { /* istanbul ignore next */ log.error(e); }
        }
    }

    log.write("   task is included", 4, logPad, logQueueId);
    log.methodDone("Check task inclusion", 4, logPad, undefined, logQueueId);
    return true;
};
