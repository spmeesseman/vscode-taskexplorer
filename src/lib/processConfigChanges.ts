/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as util from "../common/utils";
import constants from "../common/constants";
import { configuration } from "../common/configuration";
import { ExtensionContext, ConfigurationChangeEvent, commands } from "vscode";
import { registerFileWatcher } from "./fileWatcher";
import { refreshTree } from "./refreshTree";
import { registerExplorer } from "./registerExplorer";
import { TaskExplorerApi } from "../interface";

let teApi: TaskExplorerApi;
let watcherEnabled = true;
const enabledTasks = configuration.get<any>("enabledTasks", {});
const pathToPrograms = configuration.get<any>("pathToPrograms", {});


export function enableConfigWatcher(enable = true)
{
    watcherEnabled = enable;
}


export async function processConfigChanges(context: ExtensionContext, e: ConfigurationChangeEvent)
{
    let refresh = false;
    const refreshTaskTypes: string[] = [];
    if (!teApi) {
        teApi = await commands.executeCommand("taskExplorer.getApi")  as TaskExplorerApi;
    }

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
        return;
    }

    //
    // if the 'autoRefresh' settings if turned off, then there's nothing to do
    //
    if (configuration.get<boolean>("autoRefresh") === false) {
        teApi.log.write("   Auto refresh by config changes is disabled in settings", 1);
        teApi.log.methodDone("Process config changes", 1, "");
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
    // Show/hide last tasks
    //
    if (e.affectsConfiguration("taskExplorer.showLastTasks"))
    {   /* istanbul ignore else */
        if (configuration.get<boolean>("enableSideBar") && teApi.sidebar)
        {
            await teApi.sidebar.showSpecialTasks(configuration.get<boolean>("showLastTasks"), false, true);
        }
        /* istanbul ignore else */
        if (configuration.get<boolean>("enableExplorerView") && teApi.explorer)
        {
            await teApi.explorer.showSpecialTasks(configuration.get<boolean>("showLastTasks"), false, true);
        }
    }

    //
    // Enable/disable task types
    //
    if (!refresh && e.affectsConfiguration("taskExplorer.enabledTasks"))
    {
        let didSetScriptTypeForRefresh = false;
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
                    const isScriptType = util.isScriptType(taskType);
                    const ignoreModify = isScriptType || taskType === "app-publisher" || taskType === "maven";
                    await registerFileWatcher(context, taskType, util.getGlobPattern(taskType), ignoreModify, newValue);
                    if (!isScriptType || !didSetScriptTypeForRefresh) {
                        registerChange(taskType);
                    }
                    didSetScriptTypeForRefresh = didSetScriptTypeForRefresh || isScriptType;
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
            let didSetScriptTypeForRefresh = false;
            const newPathToPrograms = configuration.get<any>("pathToPrograms");
            for (const p in pathToPrograms)
            {
                if ({}.hasOwnProperty.call(pathToPrograms, p))
                {
                    const taskType = util.getTaskTypeRealName(p),
                          oldValue = pathToPrograms[p],
                          newValue = newPathToPrograms[p];
                    if (newValue !== oldValue) {
                        const isScriptType = util.isScriptType(taskType);
                        if (!isScriptType || !didSetScriptTypeForRefresh) {
                            registerChange(taskType);
                        }
                        didSetScriptTypeForRefresh = didSetScriptTypeForRefresh || isScriptType;
                    }
                }
            }
        }

        //
        // Extra Bash Globs (for extensionless script files)
        //
        if (e.affectsConfiguration("taskExplorer.globPatternsBash"))
        {   /* istanbul ignore else */
            if (refreshTaskTypes.includes("bash") === false)
            {
                await registerFileWatcher(context, "bash",
                                        util.getCombinedGlobPattern(constants.GLOB_BASH, configuration.get<string[]>("globPatternsBash", [])),
                                        false, configuration.get<boolean>("enabledTasks.bash"));
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
                await registerFileWatcher(context, "ant", util.getCombinedGlobPattern(constants.GLOB_ANT, antGlobs),
                                        false, configuration.get<boolean>("enabledTasks.ant"));
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
        // Enabled/disable sidebar view
        //
        if (e.affectsConfiguration("taskExplorer.enableSideBar"))
        {
            if (configuration.get<boolean>("enableSideBar"))
            {   /* istanbul ignore else */
                if (teApi.sidebar) {
                    // TODO - remove/add view on enable/disable view
                    refresh = true;
                }
                else {
                    teApi.sidebar = registerExplorer("taskExplorerSideBar", context);
                }
            }
            // else {
            //     teApi.sidebar = undefined;
            // }
        }

        //
        // Enabled/disable explorer view
        //
        if (e.affectsConfiguration("taskExplorer.enableExplorerView"))
        {
            if (configuration.get<boolean>("enableExplorerView"))
            {   /* istanbul ignore else */
                if (teApi.explorer) {
                    // TODO - remove/add view on enable/disable view
                    refresh = true;
                }
                else {
                    teApi.explorer = registerExplorer("taskExplorer", context);
                }
            }
            // else {
            //     teApi.explorer = undefined;
            // }
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

    if (refresh) {
        await refreshTree();
    }
    else if (refreshTaskTypes.length > 0) {
        for (const t of refreshTaskTypes) {
            await refreshTree(t);
        }
    }

    teApi.log.methodDone("Process config changes", 1, "");
}
