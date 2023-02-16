/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { log } from "../log/log";
import { TeWrapper } from "../wrapper";
import { persistCache } from "../fileCache";
import { IDictionary } from "../../interface";
import { pushIfNotExists } from "../utils/utils";
import { registerFileWatcher } from "./fileWatcher";
import { setContext, ContextKeys } from "../context";
import { Commands, executeCommand } from "../command";
import { configuration } from "../utils/configuration";
import { getScriptTaskTypes, getTaskTypeRealName } from "../utils/taskTypeUtils";
import { ExtensionContext, ConfigurationChangeEvent, workspace, window } from "vscode";

let _wrapper: TeWrapper;
let watcherEnabled = true;
let processingConfigEvent = false;
const enabledTasks = configuration.get<IDictionary<boolean>>("enabledTasks", {});
const pathToPrograms = configuration.get<IDictionary<string>>("pathToPrograms", {});


export function enableConfigWatcher(enable: boolean)
{
    watcherEnabled = enable;
}


export const isProcessingConfigChange = () => processingConfigEvent;


async function processConfigChanges(ctx: ExtensionContext, e: ConfigurationChangeEvent)
{
    log.methodStart("Process config changes", 1, "", true);

    // context = ctx;
    processingConfigEvent = true;

    let refresh = false;
    let refresh2 = false; // Uses 1st param 'false' in refresh(), for cases where task files have not changed
    const refreshTaskTypes: string[] = [];
    const registerChange = (taskType: string) => pushIfNotExists(refreshTaskTypes, taskType);

    //
    // if the application has called 'enableConfigWatcher' to disable, then there's nothing to do
    //
    if (!watcherEnabled)
    {
        log.write("   Config watcher is disabled", 1);
        log.methodDone("Process config changes", 1, "");
        processingConfigEvent = false;
        return;
    }

    //
    // Main excludes list changes requires global refresh
    //
    if (e.affectsConfiguration("taskexplorer.exclude") || e.affectsConfiguration("taskexplorer.excludeTask"))
    {
        log.write("   the 'exclude/excludeTask' setting has changed", 1);
        log.value("      exclude changed", e.affectsConfiguration("taskexplorer.exclude"), 1);
        log.value("      excludeTask changed", e.affectsConfiguration("taskexplorer.excludeTask"), 1);
        refresh = true;
    }

    //
    // User Tasks / specialFolders.showUserTasks
    // Other specialFolder config events are process in tree/folderCache module
    //
    if (e.affectsConfiguration("taskexplorer.specialFolders.showUserTasks"))
    {
        log.write("   the 'specialFolders.showUserTasks' setting has changed", 1);
        log.value("      new value", configuration.get<boolean>("specialFolders.showUserTasks"), 1);
        refresh = true;
    }

    //
    // Path changes to task programs require task executions to be re-set up
    //
    if (!refresh)
    {   //
        // Task Types
        //
        if (e.affectsConfiguration("taskexplorer.enabledTasks"))
        {
            const newEnabledTasks = configuration.get<IDictionary<boolean>>("enabledTasks");
            for (const p of Object.keys(enabledTasks))
            {
                const taskType = getTaskTypeRealName(p),
                      oldValue = enabledTasks[p],
                      newValue = newEnabledTasks[p];
                if (newValue !== oldValue)
                {
                    log.write(`   the 'enabledTasks.${taskType}' setting has changed`, 1);
                    log.value("      new value", newValue, 1);
                    await registerFileWatcher(ctx, taskType, false, newValue, "   ");
                    registerChange(taskType);
                }
            }
            Object.assign(enabledTasks, newEnabledTasks);
        }

        //
        // Groupings changes require global refresh
        //
        if (e.affectsConfiguration("taskexplorer.groupWithSeparator") || e.affectsConfiguration("taskexplorer.groupSeparator") ||
            e.affectsConfiguration("taskexplorer.groupMaxLevel") || e.affectsConfiguration("taskexplorer.groupStripTaskLabel"))
        {
            log.write("   A tree grouping setting has changed", 1);
            log.value("      groupWithSeparator changed", configuration.get<boolean>("groupWithSeparator"), 1);
            log.value("      groupSeparator changed", configuration.get<boolean>("groupSeparator"), 1);
            log.value("      groupMaxLevel changed", configuration.get<boolean>("groupMaxLevel"), 1);
            log.value("      groupStripTaskLabel changed", configuration.get<boolean>("groupStripTaskLabel"), 1);
            refresh2 = true; // refresh2 will rebuild the tree but won't trigger a file cache build and/or task provider invalidation
        }

        //
        // Workspace/project folder sorting
        //
        if (e.affectsConfiguration("taskexplorer.sortProjectFoldersAlpha"))
        {
            log.write("   the 'sortProjectFoldersAlpha' setting has changed", 1);
            log.value("      new value", configuration.get<boolean>("sortProjectFoldersAlpha"), 1);
            refresh2 = true; // refresh2 will rebuild the tree but won't trigger a file cache build and/or task provider invalidation
        }

        //
        // Program paths
        //
        if (e.affectsConfiguration("taskexplorer.pathToPrograms"))
        {
            const newPathToPrograms = configuration.get<IDictionary<string>>("pathToPrograms");
            for (const p of Object.keys(pathToPrograms))
            {
                const taskType = getTaskTypeRealName(p),
                      oldValue = pathToPrograms[p],
                      newValue = newPathToPrograms[p];
                if (newValue !== oldValue)
                {
                    log.write(`   the 'pathToPrograms.${taskType}' setting has changed`, 1);
                    log.value("      new value", newValue, 1);
                    if (taskType !== "ansicon" && taskType !== "curl") {// these paths are ont 'task types'
                        registerChange(taskType);
                    }
                    else if (taskType === "curl") {
                        registerChange("jenkins");
                    }
                    else { registerChange("ant"); }
                }
            }
            Object.assign(pathToPrograms, newPathToPrograms);
        }

        //
        // Extra Bash Globs (for extensionless script files)
        //
        if (e.affectsConfiguration("taskexplorer.globPatternsBash") && !refreshTaskTypes.includes("bash"))
        {
            log.write("   the 'globPatternsBash' setting has changed", 1);
            await registerFileWatcher(ctx, "bash", false, configuration.get<boolean>("enabledTasks.bash"), "   ");
            registerChange("bash");
        }

        //
        // Extra Apache Ant Globs (for non- build.xml files)s
        //
        if ((e.affectsConfiguration("taskexplorer.includeAnt") || e.affectsConfiguration("taskexplorer.globPatternsAnt")) && !refreshTaskTypes.includes("ant"))
        {
            log.write("   the 'globPatternsAnt' setting has changed", 1);
            await registerFileWatcher(ctx, "ant", false, configuration.get<boolean>("enabledTasks.ant"), "   ");
            registerChange("ant");
        }

        //
        // Whether or not to use 'ansicon'when running 'ant' tasks
        //
        if (e.affectsConfiguration("taskexplorer.enableAnsiconForAnt"))
        {
            const newValue = configuration.get<boolean>("enableAnsiconForAnt");
            log.write("   the '.enableAnsiconForAnt' setting has changed", 1);
            log.value("      new value", newValue, 1);
            if (newValue) {
                window.showInformationMessage("For Ant/Ansicon configuration change to take effect, close all open terminals");
            }
            registerChange("ant");
        }

        //
        // Whether or not to use the 'ant' program to detect ant tasks (default is xml2js parser)
        //
        if (e.affectsConfiguration("taskexplorer.useAnt"))
        {
            log.write("   the 'useAnt' setting has changed", 1);
            log.value("      new value", configuration.get<boolean>("useAnt"), 1);
            registerChange("ant");
        }

        //
        // Whether or not to use the 'gulp' program to detect gulp tasks (default is custom parser)
        //
        if (e.affectsConfiguration("taskexplorer.useGulp"))
        {
            log.write("   the 'useGulp' setting has changed", 1);
            log.value("      new value", configuration.get<boolean>("useGulp"), 1);
            registerChange("gulp");
        }

        //
        // NPM Package Manager change (NPM / Yarn)
        // Do a global refresh since we don't provide the npm tasks, VSCode itself does
        //
        if (e.affectsConfiguration("npm.packageManager"))
        {
            log.write("   the 'npm.packageManager' setting has changed", 1);
            log.value("      new value", configuration.getVs<boolean>("npm.packageManager"), 1);
            registerChange("npm");
        }

        //
        // Hidden VSCode workspace tasks.  tasks.json task definitions can be marked with the `hiddem`
        // flag but the flag is not visible via the Task API Task definition, the file must be read
        // and parsed by the application to locate the value.
        //
        if (e.affectsConfiguration("taskexplorer.showHiddenWsTasks"))
        {
            log.write("   the 'npm.showHiddenWsTasks' setting has changed", 1);
            log.value("      new value", configuration.get<boolean>("showHiddenWsTasks"), 1);
            registerChange("Workspace");
        }

        //
        // Integrated shell.  This should bethe last check in this if() block, since it
        // is the only change in the block that can set 'refresh'.
        //
        if (e.affectsConfiguration("terminal.integrated.shell.windows") ||
            e.affectsConfiguration("terminal.integrated.shell.linux") ||
            e.affectsConfiguration("terminal.integrated.shell.osx"))
        {   //
            // Script type task defs will change with terminal change
            //
            log.write("   a terminal shell setting has changed", 1);
            log.value("      windows shell", configuration.getVs<boolean>("terminal.integrated.shell.windows"), 2);
            log.value("      linux shell", configuration.getVs<boolean>("terminal.integrated.shell.linux"), 2);
            log.value("      osx shell", configuration.getVs<boolean>("terminal.integrated.shell.osx"), 2);
            getScriptTaskTypes().forEach(t => { if (enabledTasks[t]) registerChange(t); });
        }
    }

    //
    // Explorer / sidebar view
    //
    if (e.affectsConfiguration("taskexplorer.enableExplorerView"))
    {
        const newValue = configuration.get<boolean>("enableExplorerView");
        log.write("   the 'enableExplorerView' setting has changed", 1);
        log.value("      new value", newValue, 1);
        await setContext(ContextKeys.Enabled, configuration.get<boolean>("enableExplorerView") ||
                                              configuration.get<boolean>("enableSideBar"));
    }
    if (e.affectsConfiguration("taskexplorer.enableSideBar"))
    {
        const newValue = configuration.get<boolean>("enableSideBar");
        log.write("   the 'enableSideBar' setting has changed", 1);
        log.value("      new value", newValue, 1);
        await setContext(ContextKeys.Enabled, configuration.get<boolean>("enableExplorerView") ||
                                              configuration.get<boolean>("enableSideBar"));
    }

    //
    // Persistent file caching
    //
    if (e.affectsConfiguration("taskexplorer.enablePersistentFileCaching"))
    {
        const newValue = configuration.get<boolean>("enablePersistentFileCaching");
        log.write("   the 'enablePersistentFileCaching' setting has changed", 1);
        log.value("      new value", newValue, 1);
        persistCache(!newValue);
    }

    //
    // Refresh tree depending on specific settings changes
    //
    try
    {   if (refresh || refreshTaskTypes.length > 3)
        {
            await executeCommand(Commands.Refresh, undefined, false, "   ");
        }
        else if (refreshTaskTypes.length > 0)
        {
            for (const t of refreshTaskTypes) {
                await executeCommand(Commands.Refresh, t, undefined, "   ");
            }
        }
        else if (refresh2) {
            await executeCommand(Commands.Refresh, false, undefined, "   ");
        }
        else {
            log.write("   Current changes require no processing", 1);
        }
    }
    catch (e) {
        /* istanbul ignore next */
        log.error(e);
    }

    processingConfigEvent = false;
    log.methodDone("Process config changes", 1);
}


export const registerConfigWatcher = (wrapper: TeWrapper) =>
{
    _wrapper = wrapper;
    const d = workspace.onDidChangeConfiguration(async e => { await processConfigChanges(wrapper.context, e); });
    wrapper.context.subscriptions.push(d);
};
