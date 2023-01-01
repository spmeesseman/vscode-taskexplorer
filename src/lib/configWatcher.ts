/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as util from "../common/utils";
import constants from "../common/constants";
import { configuration } from "../common/configuration";
import { ExtensionContext, ConfigurationChangeEvent, commands, workspace } from "vscode";
import { registerFileWatcher } from "./fileWatcher";
import { refreshTree } from "./refreshTree";
import { registerExplorer } from "./registerExplorer";
import { TaskExplorerApi } from "../interface";

let teApi: TaskExplorerApi;
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

    teApi.log.methodStart("Process config changes", 1, "");

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
    // if the 'autoRefresh' settings if turned off, then there's nothing to do
    //
    if (configuration.get<boolean>("autoRefresh") === false) {
        teApi.log.write("   Auto refresh by config changes is disabled in settings", 1);
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
        teApi.log.write("   The 'exclude/excludeTask' setting has changed", 1);
        refresh = true;
    }

    //
    // Groupings changes require global refresh
    //
    if (!refresh && (e.affectsConfiguration("taskExplorer.groupWithSeparator") || e.affectsConfiguration("taskExplorer.groupSeparator") ||
        e.affectsConfiguration("taskExplorer.groupMaxLevel") || e.affectsConfiguration("taskExplorer.groupStripTaskLabel")))
    {
        teApi.log.write("   A tree grouping setting has changed", 1);
        refresh = true;
    }

    //
    // User Tasks
    //
    if (e.affectsConfiguration("taskExplorer.showUserTasks"))
    {
        refresh= true;
    }

    //
    // Last Tasks
    //
    if (e.affectsConfiguration("taskExplorer.showLastTasks"))
    {   /* istanbul ignore else */
        if (configuration.get<boolean>("enableSideBar") && teApi.sidebar)
        {
            await teApi.sidebar.showSpecialTasks(configuration.get<boolean>("showLastTasks"), false, true, undefined, "   ");
        }
        /* istanbul ignore else */
        if (configuration.get<boolean>("enableExplorerView") && teApi.explorer)
        {
            await teApi.explorer.showSpecialTasks(configuration.get<boolean>("showLastTasks"), false, true, undefined, "   ");
        }
    }

    //
    // Favorites
    //
    if (e.affectsConfiguration("taskExplorer.showFavorites"))
    {   /* istanbul ignore else */
        if (configuration.get<boolean>("enableSideBar") && teApi.sidebar)
        {
            await teApi.sidebar.showSpecialTasks(configuration.get<boolean>("showFavorites"), true, true, undefined, "   ");
        }
        /* istanbul ignore else */
        if (configuration.get<boolean>("enableExplorerView") && teApi.explorer)
        {
            await teApi.explorer.showSpecialTasks(configuration.get<boolean>("showFavorites"), true, true, undefined, "   ");
        }
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
                    if (newValue !== oldValue) {
                        registerChange(taskType);
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
                await registerFileWatcher(ctx, "bash",
                                        util.getCombinedGlobPattern(constants.GLOB_BASH, configuration.get<string[]>("globPatternsBash", [])),
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
                await registerFileWatcher(ctx, "ant", util.getCombinedGlobPattern(constants.GLOB_ANT, antGlobs),
                                          configuration.get<boolean>("enabledTasks.ant"), "   ");
                registerChange("ant");
            }
        }

        //
        // Whether or not to use the 'ant' program to detect ant tasks (default is xml2js parser)
        //
        if (e.affectsConfiguration("taskExplorer.useAnt")) {
            registerChange("ant");
        }

        //
        // Whether or not to use the 'gulp' program to detect gulp tasks (default is custom parser)
        //
        if (e.affectsConfiguration("taskExplorer.useGulp")) {
            registerChange("gulp");
        }

        //
        // NPM Package Manager change (NPM / Yarn)
        // Do a global refresh since we don't provide the npm tasks, VSCode itself does
        //
        if (e.affectsConfiguration("npm.packageManager", undefined)) {
            registerChange("npm");
        }

        //
        // if the 'autoRefresh' settings if turned off, then there's nothing to do
        //
        if (e.affectsConfiguration("taskExplorer.showHiddenWsTasks")) {
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
            if (configuration.get<boolean>("enabledTasks.bash") || configuration.get<boolean>("enabledTasks.batch") ||
                configuration.get<boolean>("enabledTasks.perl") || configuration.get<boolean>("enabledTasks.powershell") ||
                configuration.get<boolean>("enabledTasks.python") || configuration.get<boolean>("enabledTasks.ruby") ||
                configuration.get<boolean>("enabledTasks.nsis")) {
                refresh = true;
            }
        }
    }

    //
    // Explorer / sidebar view
    //
    if (e.affectsConfiguration("taskExplorer.enableExplorerView"))
    {
        registerExplorer("taskExplorer", ctx, configuration.get<boolean>("enableSideBar"), teApi);
    }
    if (e.affectsConfiguration("taskExplorer.enableSideBar"))
    {
        registerExplorer("taskExplorerSideBar", ctx, configuration.get<boolean>("enableSideBar"), teApi);
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
    }
    catch (e) {
        /** istanbul-ignore-next */
        teApi.log.error(e);
    }

    processingConfigEvent = false;
    teApi.log.methodDone("Process config changes", 1);
}


export const registerConfigWatcher = (context: ExtensionContext, api: TaskExplorerApi) =>
{
    teApi = api;
    const d = workspace.onDidChangeConfiguration(async e => {
        await processConfigChanges(context, e);
    });
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
