/* eslint-disable prefer-arrow/prefer-arrow-functions */

import { TeWrapper } from "../wrapper";
import { ContextKeys } from "../context";
import { Commands, executeCommand } from "../command/command";
import { IDictionary, ITeConfigWatcher } from "../../interface";
import { getScriptTaskTypes, getTaskTypeRealName } from "../utils/taskTypeUtils";
import { ConfigurationChangeEvent, workspace, window, Disposable } from "vscode";


export class TeConfigWatcher implements ITeConfigWatcher, Disposable
{
    private disposables: Disposable[];
    private watcherEnabled = true;
    private processingConfigEvent = false;
    private enabledTasks: IDictionary<boolean>;
    private pathToPrograms: IDictionary<string>;


    constructor(private readonly wrapper: TeWrapper)
    {
        this.enabledTasks = wrapper.config.get<IDictionary<boolean>>("enabledTasks", {});
        this.pathToPrograms = wrapper.config.get<IDictionary<string>>("pathToPrograms", {});
        this.disposables = [
            workspace.onDidChangeConfiguration(e => this.processConfigChanges(e), this)
        ];
    }

    dispose()
    {
        this.disposables.forEach((d) => {
            d.dispose();
        });
        this.disposables = [];
    }

    enableConfigWatcher = (enable: boolean) =>
    {
        this.watcherEnabled = enable;
    };

    isBusy = () => this.processingConfigEvent;


    private processConfigChanges = async(e: ConfigurationChangeEvent) =>
    {
        this.wrapper.log.methodStart("Process config changes", 1, "", true);

        // context = ctx;
        this.processingConfigEvent = true;

        let refresh = false;
        let refresh2 = false; // Uses 1st param 'false' in refresh(), for cases where task files have not changed
        const refreshTaskTypes: string[] = [];
        const registerChange = (taskType: string) => this.wrapper.utils.pushIfNotExists(refreshTaskTypes, taskType);

        //
        // if the application has called 'enableConfigWatcher' to disable, then there's nothing to do
        //
        if (!this.watcherEnabled)
        {
            this.wrapper.log.write("   Config watcher is disabled", 1);
            this.wrapper.log.methodDone("Process config changes", 1, "");
            this.processingConfigEvent = false;
            return;
        }

        //
        // Main excludes list changes requires global refresh
        //
        if (e.affectsConfiguration("taskexplorer.exclude") || e.affectsConfiguration("taskexplorer.excludeTask"))
        {
            this.wrapper.log.write("   the 'exclude/excludeTask' setting has changed", 1);
            this.wrapper.log.value("      exclude changed", e.affectsConfiguration("taskexplorer.exclude"), 1);
            this.wrapper.log.value("      excludeTask changed", e.affectsConfiguration("taskexplorer.excludeTask"), 1);
            refresh = true;
        }

        //
        // User Tasks / specialFolders.showUserTasks
        // Other specialFolder config events are process in tree/folderCache module
        //
        if (e.affectsConfiguration("taskexplorer.specialFolders.showUserTasks"))
        {
            this.wrapper.log.write("   the 'specialFolders.showUserTasks' setting has changed", 1);
            this.wrapper.log.value("      new value", this.wrapper.config.get<boolean>("specialFolders.showUserTasks"), 1);
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
                const newEnabledTasks = this.wrapper.config.get<IDictionary<boolean>>("enabledTasks");
                for (const p of Object.keys(this.enabledTasks))
                {
                    const taskType = getTaskTypeRealName(p),
                        oldValue = this.enabledTasks[p],
                        newValue = newEnabledTasks[p];
                    if (newValue !== oldValue)
                    {
                        this.wrapper.log.write(`   the 'enabledTasks.${taskType}' setting has changed`, 1);
                        this.wrapper.log.value("      new value", newValue, 1);
                        await this.wrapper.fileWatcher.registerFileWatcher(taskType, false, newValue, "   ");
                        registerChange(taskType);
                    }
                }
                Object.assign(this.enabledTasks, newEnabledTasks);
            }

            //
            // Groupings changes require global refresh
            //
            if (e.affectsConfiguration("taskexplorer.groupWithSeparator") || e.affectsConfiguration("taskexplorer.groupSeparator") ||
                e.affectsConfiguration("taskexplorer.groupMaxLevel") || e.affectsConfiguration("taskexplorer.groupStripTaskLabel"))
            {
                this.wrapper.log.write("   A tree grouping setting has changed", 1);
                this.wrapper.log.value("      groupWithSeparator changed", this.wrapper.config.get<boolean>("groupWithSeparator"), 1);
                this.wrapper.log.value("      groupSeparator changed", this.wrapper.config.get<boolean>("groupSeparator"), 1);
                this.wrapper.log.value("      groupMaxLevel changed", this.wrapper.config.get<boolean>("groupMaxLevel"), 1);
                this.wrapper.log.value("      groupStripTaskLabel changed", this.wrapper.config.get<boolean>("groupStripTaskLabel"), 1);
                refresh2 = true; // refresh2 will rebuild the tree but won't trigger a file cache build and/or task provider invalidation
            }

            //
            // Workspace/project folder sorting
            //
            if (e.affectsConfiguration("taskexplorer.sortProjectFoldersAlpha"))
            {
                this.wrapper.log.write("   the 'sortProjectFoldersAlpha' setting has changed", 1);
                this.wrapper.log.value("      new value", this.wrapper.config.get<boolean>("sortProjectFoldersAlpha"), 1);
                refresh2 = true; // refresh2 will rebuild the tree but won't trigger a file cache build and/or task provider invalidation
            }

            //
            // Program paths
            //
            if (e.affectsConfiguration("taskexplorer.pathToPrograms"))
            {
                const newPathToPrograms = this.wrapper.config.get<IDictionary<string>>("pathToPrograms");
                for (const p of Object.keys(this.pathToPrograms))
                {
                    const taskType = getTaskTypeRealName(p),
                        oldValue = this.pathToPrograms[p],
                        newValue = newPathToPrograms[p];
                    if (newValue !== oldValue)
                    {
                        this.wrapper.log.write(`   the 'pathToPrograms.${taskType}' setting has changed`, 1);
                        this.wrapper.log.value("      new value", newValue, 1);
                        if (taskType !== "ansicon" && taskType !== "curl") {// these paths are ont 'task types'
                            registerChange(taskType);
                        }
                        else if (taskType === "curl") {
                            registerChange("jenkins");
                        }
                        else { registerChange("ant"); }
                    }
                }
                Object.assign(this.pathToPrograms, newPathToPrograms);
            }

            //
            // Extra Bash Globs (for extensionless script files)
            //
            if (e.affectsConfiguration("taskexplorer.globPatternsBash") && !refreshTaskTypes.includes("bash"))
            {
                this.wrapper.log.write("   the 'globPatternsBash' setting has changed", 1);
                await this.wrapper.fileWatcher.registerFileWatcher("bash", false, this.wrapper.config.get<boolean>("enabledTasks.bash"), "   ");
                registerChange("bash");
            }

            //
            // Extra Apache Ant Globs (for non- build.xml files)s
            //
            if ((e.affectsConfiguration("taskexplorer.includeAnt") || e.affectsConfiguration("taskexplorer.globPatternsAnt")) && !refreshTaskTypes.includes("ant"))
            {
                this.wrapper.log.write("   the 'globPatternsAnt' setting has changed", 1);
                await this.wrapper.fileWatcher.registerFileWatcher("ant", false, this.wrapper.config.get<boolean>("enabledTasks.ant"), "   ");
                registerChange("ant");
            }

            //
            // Whether or not to use 'ansicon'when running 'ant' tasks
            //
            if (e.affectsConfiguration("taskexplorer.enableAnsiconForAnt"))
            {
                const newValue = this.wrapper.config.get<boolean>("enableAnsiconForAnt");
                this.wrapper.log.write("   the '.enableAnsiconForAnt' setting has changed", 1);
                this.wrapper.log.value("      new value", newValue, 1);
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
                this.wrapper.log.write("   the 'useAnt' setting has changed", 1);
                this.wrapper.log.value("      new value", this.wrapper.config.get<boolean>("useAnt"), 1);
                registerChange("ant");
            }

            //
            // Whether or not to use the 'gulp' program to detect gulp tasks (default is custom parser)
            //
            if (e.affectsConfiguration("taskexplorer.useGulp"))
            {
                this.wrapper.log.write("   the 'useGulp' setting has changed", 1);
                this.wrapper.log.value("      new value", this.wrapper.config.get<boolean>("useGulp"), 1);
                registerChange("gulp");
            }

            //
            // NPM Package Manager change (NPM / Yarn)
            // Do a global refresh since we don't provide the npm tasks, VSCode itself does
            //
            if (e.affectsConfiguration("npm.packageManager"))
            {
                this.wrapper.log.write("   the 'npm.packageManager' setting has changed", 1);
                this.wrapper.log.value("      new value", this.wrapper.config.getVs<boolean>("npm.packageManager"), 1);
                registerChange("npm");
            }

            //
            // Hidden VSCode workspace tasks.  tasks.json task definitions can be marked with the `hiddem`
            // flag but the flag is not visible via the Task API Task definition, the file must be read
            // and parsed by the application to locate the value.
            //
            if (e.affectsConfiguration("taskexplorer.showHiddenWsTasks"))
            {
                this.wrapper.log.write("   the 'npm.showHiddenWsTasks' setting has changed", 1);
                this.wrapper.log.value("      new value", this.wrapper.config.get<boolean>("showHiddenWsTasks"), 1);
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
                this.wrapper.log.write("   a terminal shell setting has changed", 1);
                this.wrapper.log.value("      windows shell", this.wrapper.config.getVs<boolean>("terminal.integrated.shell.windows"), 2);
                this.wrapper.log.value("      linux shell", this.wrapper.config.getVs<boolean>("terminal.integrated.shell.linux"), 2);
                this.wrapper.log.value("      osx shell", this.wrapper.config.getVs<boolean>("terminal.integrated.shell.osx"), 2);
                getScriptTaskTypes().forEach(t => { if (this.enabledTasks[t]) registerChange(t); });
            }
        }

        //
        // Explorer / sidebar view
        //
        if (e.affectsConfiguration("taskexplorer.enableExplorerView"))
        {
            const newValue = this.wrapper.config.get<boolean>("enableExplorerView");
            this.wrapper.log.write("   the 'enableExplorerView' setting has changed", 1);
            this.wrapper.log.value("      new value", newValue, 1);
            await this.wrapper.contextTe.setContext(ContextKeys.Enabled, this.wrapper.config.get<boolean>("enableExplorerView") ||
                                                                    this.wrapper.config.get<boolean>("enableSideBar"));
        }
        if (e.affectsConfiguration("taskexplorer.enableSideBar"))
        {
            const newValue = this.wrapper.config.get<boolean>("enableSideBar");
            this.wrapper.log.write("   the 'enableSideBar' setting has changed", 1);
            this.wrapper.log.value("      new value", newValue, 1);
            await this.wrapper.contextTe.setContext(ContextKeys.Enabled, this.wrapper.config.get<boolean>("enableExplorerView") ||
                                                                    this.wrapper.config.get<boolean>("enableSideBar"));
        }

        //
        // Persistent file caching
        //
        if (e.affectsConfiguration("taskexplorer.enablePersistentFileCaching"))
        {
            const newValue = this.wrapper.config.get<boolean>("enablePersistentFileCaching");
            this.wrapper.log.write("   the 'enablePersistentFileCaching' setting has changed", 1);
            this.wrapper.log.value("      new value", newValue, 1);
            this.wrapper.filecache.persistCache(!newValue);
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
                this.wrapper.log.write("   Current changes require no processing", 1);
            }
        }
        catch (e) {
            /* istanbul ignore next */
            this.wrapper.log.error(e);
        }

        this.processingConfigEvent = false;
        this.wrapper.log.methodDone("Process config changes", 1);
    };

}
