/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as util from "./utils/utils";
import constants from "./constants";
import { configuration } from "./utils/configuration";
import { ExtensionContext, ConfigurationChangeEvent, workspace } from "vscode";
import { registerFileWatcher } from "./fileWatcher";
import { refreshTree } from "./refreshTree";
import { registerExplorer } from "./registerExplorer";
import { ITaskExplorerApi } from "../interface";

let teApi: ITaskExplorerApi;
let watcherEnabled = true;
let processingConfigEvent = false;
const enabledTasks = configuration.get<any>("enabledTasks", {});
const pathToPrograms = configuration.get<any>("pathToPrograms", {});


export function enableConfigWatcher(enable = true)
{
    watcherEnabled = enable;
}


export const isProcessingConfigChange = () => processingConfigEvent;


async function processConfigChanges(ctx: ExtensionContext, e: ConfigurationChangeEvent)
{
    // context = ctx;
    processingConfigEvent = true;

    let refresh = false;
    const refreshTaskTypes: string[] = [];

    const registerChange = (taskType: string) => {
        /* istanbul ignore else */
        if (!refreshTaskTypes.includes(taskType)) {
            refreshTaskTypes.push(taskType);
        }
    };

    teApi.log.methodStart("Process config changes", 1, "", true);

    //
    // if the application has called 'enableConfigWatcher' to disable, then there's nothing to do
    //
    if (!watcherEnabled) {
        teApi.log.write("   Config watcher is disabled", 1);
        teApi.log.methodDone("Process config changes", 1, "");
        processingConfigEvent = false;
        return;
    }

    //
    // Check configs that may require a tree refresh...
    //

    //
    // Main excludes list changes requires global refresh
    //
    if (e.affectsConfiguration("taskExplorer.exclude") || e.affectsConfiguration("taskExplorer.excludeTask"))
    {
        teApi.log.write("   the 'exclude/excludeTask' setting has changed", 1);
        teApi.log.value("      exclude changed", e.affectsConfiguration("taskExplorer.exclude"), 2);
        teApi.log.value("      excludeTask changed", e.affectsConfiguration("taskExplorer.excludeTask"), 2);
        refresh = true;
    }

    //
    // Groupings changes require global refresh
    //
    if (!refresh && (e.affectsConfiguration("taskExplorer.groupWithSeparator") || e.affectsConfiguration("taskExplorer.groupSeparator") ||
        e.affectsConfiguration("taskExplorer.groupMaxLevel") || e.affectsConfiguration("taskExplorer.groupStripTaskLabel")))
    {
        teApi.log.write("   A tree grouping setting has changed", 1);
        teApi.log.value("      groupWithSeparator changed", configuration.get<boolean>("groupWithSeparator"), 2);
        teApi.log.value("      groupSeparator changed", configuration.get<boolean>("groupSeparator"), 2);
        teApi.log.value("      groupMaxLevel changed", configuration.get<boolean>("groupMaxLevel"), 2);
        teApi.log.value("      groupStripTaskLabel changed", configuration.get<boolean>("groupStripTaskLabel"), 2);
        refresh = true;
    }

    //
    // User Tasks / specialFolders.showUserTasks
    // Other specialFolder config events are process in tree/folderCache module
    //
    if (e.affectsConfiguration("taskExplorer.specialFolders.showUserTasks"))
    {
        teApi.log.write("   the 'specialFolders.showUserTasks' setting has changed", 1);
        teApi.log.value("      new value", configuration.get<boolean>("specialFolders.showUserTasks"), 2);
        refresh = true;
    }

    //
    // Task Types
    //
    if (!refresh && e.affectsConfiguration("taskExplorer.enabledTasks"))
    {
        const newEnabledTasks = configuration.get<any>("enabledTasks");
        for (const p in enabledTasks)
        {   /* istanbul ignore else */
            if ({}.hasOwnProperty.call(enabledTasks, p))
            {
                const taskType = util.getTaskTypeRealName(p),
                      oldValue = enabledTasks[p],
                      newValue = newEnabledTasks[p];
                if (newValue !== oldValue)
                {
                    teApi.log.write(`   the 'enabledTasks.${taskType}' setting has changed`, 1);
                    teApi.log.value("      new value", newValue, 2);
                    await registerFileWatcher(ctx, taskType, util.getGlobPattern(taskType), newValue, "   ");
                    registerChange(taskType);
                }
            }
        }
        Object.assign(enabledTasks, newEnabledTasks);
    }

    //
    // Path changes to task programs require task executions to be re-set up
    //
    if (!refresh)
    {
        if (e.affectsConfiguration("taskExplorer.pathToPrograms"))
        {
            const newPathToPrograms = configuration.get<any>("pathToPrograms");
            for (const p in pathToPrograms)
            {   /* istanbul ignore else */
                if ({}.hasOwnProperty.call(pathToPrograms, p))
                {
                    const taskType = util.getTaskTypeRealName(p),
                          oldValue = pathToPrograms[p],
                          newValue = newPathToPrograms[p];
                    if (newValue !== oldValue)
                    {
                        teApi.log.write(`   the 'pathToPrograms.${taskType}' setting has changed`, 1);
                        teApi.log.value("      new value", newValue, 2);
                        if (taskType !== "ansicon") {
                            registerChange(taskType);
                        }
                        else { registerChange("ant"); }
                    }
                }
            }
            Object.assign(pathToPrograms, newPathToPrograms);
        }

        //
        // Extra Bash Globs (for extensionless script files)
        //
        if (e.affectsConfiguration("taskExplorer.globPatternsBash"))
        {   /* istanbul ignore else */
            if (refreshTaskTypes.includes("bash") === false)
            {
                const newValue = configuration.get<string[]>("globPatternsBash", []);
                const newGlob = util.getCombinedGlobPattern(constants.GLOB_BASH, newValue);
                teApi.log.write("   the 'globPatternsBash' setting has changed", 1);
                teApi.log.value("      new glob", newGlob, 2);
                await registerFileWatcher(ctx, "bash",
                                          newGlob,
                                          configuration.get<boolean>("enabledTasks.bash"), "   ");
                registerChange("bash");
            }
        }

        //
        // Extra Apache Globs (for non- build.xml files)s
        //
        if (e.affectsConfiguration("taskExplorer.includeAnt") || e.affectsConfiguration("taskExplorer.globPatternsAnt"))
        {   /* istanbul ignore else */
            if (refreshTaskTypes.includes("ant") === false)
            {
                const antGlobs = [ ...configuration.get<string[]>("includeAnt", []), ...configuration.get<string[]>("globPatternsAnt", []) ];
                const newGlob = util.getCombinedGlobPattern(constants.GLOB_ANT, antGlobs);
                teApi.log.write("   the 'globPatternsAnt' setting has changed", 1);
                teApi.log.value("      new glob", newGlob, 2);
                await registerFileWatcher(ctx, "ant", newGlob, configuration.get<boolean>("enabledTasks.ant"), "   ");
                registerChange("ant");
            }
        }

        //
        // Whether or not to use the 'ant' program to detect ant tasks (default is xml2js parser)
        //
        if (e.affectsConfiguration("taskExplorer.useAnt")) {
            teApi.log.write("   the 'useAnt' setting has changed", 1);
            teApi.log.value("      new value", configuration.get<boolean>("useAnt"), 2);
            registerChange("ant");
        }

        //
        // Whether or not to use the 'gulp' program to detect gulp tasks (default is custom parser)
        //
        if (e.affectsConfiguration("taskExplorer.useGulp")) {
            teApi.log.write("   the 'useGulp' setting has changed", 1);
            teApi.log.value("      new value", configuration.get<boolean>("useGulp"), 2);
            registerChange("gulp");
        }

        //
        // NPM Package Manager change (NPM / Yarn)
        // Do a global refresh since we don't provide the npm tasks, VSCode itself does
        //
        if (e.affectsConfiguration("npm.packageManager", undefined)) {
            teApi.log.write("   the 'npm.packageManager' setting has changed", 1);
            teApi.log.value("      new value", configuration.getVs<boolean>("npm.packageManager"), 2);
            registerChange("npm");
        }

        //
        // Hidden VSCode workspace tasks.  tasks.json task definitions can be marked with the `hiddem`
        // flag but the flag is not visible via the Task API Task definition, the file must be read
        // and parsed by the application to locate the value.
        //
        if (e.affectsConfiguration("taskExplorer.showHiddenWsTasks")) {
            teApi.log.write("   the 'npm.showHiddenWsTasks' setting has changed", 1);
            teApi.log.value("      new value", configuration.get<boolean>("showHiddenWsTasks"), 2);
            registerChange("Workspace");
        }

        //
        // Integrated shell
        //
        if (e.affectsConfiguration("terminal.integrated.shell.windows") ||
            e.affectsConfiguration("terminal.integrated.shell.linux") ||
            e.affectsConfiguration("terminal.integrated.shell.osx")) {
            //
            // Script type task defs will change with terminal change
            //
            const enabledTasks = configuration.get<any>("enabledTasks");
            if (enabledTasks.bash || enabledTasks.batch || enabledTasks.perl || enabledTasks.powershell ||
                enabledTasks.python || enabledTasks.ruby || enabledTasks.nsis)
            {
                teApi.log.write("   a 'terminal.integrated.shell' setting has changed", 1);
                teApi.log.value("      windows shell", configuration.getVs<boolean>("terminal.integrated.shell.windows"), 2);
                teApi.log.value("      linux shell", configuration.getVs<boolean>("terminal.integrated.shell.linux"), 2);
                teApi.log.value("      osx shell", configuration.getVs<boolean>("terminal.integrated.shell.osx"), 2);
                refresh = true;
            }
        }
    }

    //
    // Explorer / sidebar view
    //
    if (e.affectsConfiguration("taskExplorer.enableExplorerView"))
    {
        teApi.log.write("   the 'enableExplorerView' setting has changed", 1);
        registerExplorer("taskExplorer", ctx, configuration.get<boolean>("enableExplorerView"), teApi, false);
    }
    if (e.affectsConfiguration("taskExplorer.enableSideBar"))
    {
        teApi.log.write("   the 'enableSideBar' setting has changed", 1);
        registerExplorer("taskExplorerSideBar", ctx, configuration.get<boolean>("enableSideBar"), teApi, false);
    }

    //
    // Refresh tree depending on specific settings changes
    //
    try
    {   if (refresh || refreshTaskTypes.length > 3)
        {
            await refreshTree(teApi, undefined, undefined, "   ");
        }
        else if (refreshTaskTypes.length > 0)
        {
            for (const t of refreshTaskTypes) {
                await refreshTree(teApi, t, undefined, "   ");
            }
        }
        else {
            teApi.log.write("   Current changes require no processing", 1);
        }
    }
    catch (e) {
        /* istanbul-ignore-next */
        teApi.log.error(e);
    }

    processingConfigEvent = false;
    teApi.log.methodDone("Process config changes", 1);
}


export const registerConfigWatcher = (context: ExtensionContext, api: ITaskExplorerApi) =>
{
    teApi = api;
    const d = workspace.onDidChangeConfiguration(async e => { await processConfigChanges(context, e); });
    context.subscriptions.push(d);
};


// const queue: ConfigurationChangeEvent[] = [];
// async function processQueue()
// {
//     const next= queue.shift();
//     if (next) {
//         await processConfigChanges(context, next);
//     }
// }
