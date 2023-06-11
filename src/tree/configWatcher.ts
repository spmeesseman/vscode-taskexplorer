/* eslint-disable prefer-arrow/prefer-arrow-functions */

/**
 * @class TeConfigWatcher
 * @since 2.0.0
 *
 * Watches all configuration parameters that can cause a a tree refresh
 */

import { TeWrapper } from "../lib/wrapper";
import { executeCommand } from "../lib/command/command";
import { IDictionary, ITeTreeConfigWatcher } from "../interface";
import { getScriptTaskTypes, getTaskTypeRealName } from "../lib/utils/taskUtils";
import { ConfigurationChangeEvent, window, Disposable, Event, EventEmitter, workspace } from "vscode";


export class TeTreeConfigWatcher implements ITeTreeConfigWatcher, Disposable
{
    private _disposables: Disposable[];
    private _watcherEnabled = true;
    private _processingConfigEvent = false;
    private _enabledTasks: IDictionary<boolean>;
    private _pathToPrograms: IDictionary<string>;
    private readonly _onReady: EventEmitter<void>;


    constructor(private readonly wrapper: TeWrapper)
    {
		this._onReady = new EventEmitter<void>();
        this._enabledTasks = wrapper.config.get<IDictionary<boolean>>("enabledTasks", {});
        this._pathToPrograms = wrapper.config.get<IDictionary<string>>("pathToPrograms", {});
        this._disposables = [
            this._onReady,
            workspace.onDidChangeConfiguration(this.processConfigChanges, this)
        ];
    }

    dispose = () => this._disposables.forEach(d => d.dispose());


    get isBusy(): boolean {
        return this._processingConfigEvent;
    }

    get onReady(): Event<void> {
        return this._onReady.event;
    }


    enableConfigWatcher = (enable: boolean) => this._watcherEnabled = enable;


    private processConfigChanges = async(e: ConfigurationChangeEvent) =>
    {   //
        // if the application has called 'enableConfigWatcher' to disable, then there's nothing to do
        //
        if (!this._watcherEnabled)
        {
            this.wrapper.log.methodOnce("treemgr", "process config changes - disabled", 1, "");
            return;
        }

        this.wrapper.log.methodStart("process config changes", 1, "", true);

        // context = ctx;
        let refresh = false;
        let refresh2 = false; // Uses 1st param 'false' in refresh(), for cases where task files have not changed
        const refreshTaskTypes: string[] = [];
        const registerChange = (taskType: string) => this.wrapper.utils.pushIfNotExists(refreshTaskTypes, taskType);

        this._processingConfigEvent = true;

        //
        // Explorer Tree / SideBar View
        //
        let explorerTreeEnabled: boolean | undefined;
        let sidebarEnabled: boolean | undefined;
        if (this.wrapper.config.affectsConfiguration(e, "enableExplorerView"))
        {
            explorerTreeEnabled = this.wrapper.config.get<boolean>("enableExplorerView");
            this.wrapper.log.write("   the 'enableExplorerView' setting has changed", 1);
            this.wrapper.log.value("      new value", explorerTreeEnabled, 1);
        }
        if (this.wrapper.config.affectsConfiguration(e, "enableSideBar"))
        {
            sidebarEnabled = this.wrapper.config.get<boolean>("enableSideBar");
            this.wrapper.log.write("   the 'enableSideBar' setting has changed", 1);
            this.wrapper.log.value("      new value", sidebarEnabled, 1);
        }
        if (sidebarEnabled !== undefined || explorerTreeEnabled !== undefined)
        {
            const enabled  = this.wrapper.utils.isTeEnabled();
            setTimeout((e) => void this.wrapper.contextTe.setContext(this.wrapper.keys.Context.Enabled, e), 50, enabled); this._processingConfigEvent = false;
            if (!enabled) {
                this._processingConfigEvent = false;
                this._onReady.fire();
                return;
            }
        }

        //
        // Main excludes list changes requires global refresh
        //
        if (this.wrapper.config.affectsConfiguration(e, "exclude", "excludeTask"))
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
        if (this.wrapper.config.affectsConfiguration(e, "specialFolders.showUserTasks"))
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
            if (this.wrapper.config.affectsConfiguration(e, "enabledTasks"))
            {
                const newEnabledTasks = this.wrapper.config.get<IDictionary<boolean>>("enabledTasks");
                for (const p of Object.keys(this._enabledTasks))
                {
                    const taskType = getTaskTypeRealName(p),
                        oldValue = this._enabledTasks[p],
                        newValue = newEnabledTasks[p];
                    if (newValue !== oldValue)
                    {
                        this.wrapper.log.write(`   the 'enabledTasks.${taskType}' setting has changed`, 1);
                        this.wrapper.log.value("      new value", newValue, 1);
                        await this.wrapper.fileWatcher.registerFileWatcher(taskType, false, newValue, "   ");
                        registerChange(taskType);
                    }
                }
                Object.assign(this._enabledTasks, newEnabledTasks);
            }

            //
            // Groupings changes require global refresh
            //
            if (this.wrapper.config.affectsConfiguration(e, this.wrapper.keys.Config.GroupWithSeperator, this.wrapper.keys.Config.GroupSeparator, this.wrapper.keys.Config.GroupMaxLevel, this.wrapper.keys.Config.GroupStripTaskLabel))
            {
                this.wrapper.log.write("   A tree grouping setting has changed", 1);
                this.wrapper.log.value(`      ${this.wrapper.keys.Config.GroupWithSeperator} changed`, this.wrapper.config.get<boolean>(this.wrapper.keys.Config.GroupWithSeperator), 1);
                this.wrapper.log.value(`      ${this.wrapper.keys.Config.GroupSeparator} changed`, this.wrapper.config.get<boolean>(this.wrapper.keys.Config.GroupSeparator), 1);
                this.wrapper.log.value(`      ${this.wrapper.keys.Config.GroupMaxLevel} changed`, this.wrapper.config.get<boolean>(this.wrapper.keys.Config.GroupMaxLevel), 1);
                this.wrapper.log.value(`      ${this.wrapper.keys.Config.GroupStripTaskLabel} changed`, this.wrapper.config.get<boolean>(this.wrapper.keys.Config.GroupStripTaskLabel), 1);
                refresh2 = true; // refresh2 will rebuild the tree but won't trigger a file cache build and/or task provider invalidation
            }

            //
            // Workspace/project folder sorting
            //
            if (this.wrapper.config.affectsConfiguration(e, this.wrapper.keys.Config.SortProjectFoldersAlphabetically))
            {
                this.wrapper.log.write(`   the '${this.wrapper.keys.Config.SortProjectFoldersAlphabetically}' setting has changed`, 1);
                this.wrapper.log.value("      new value", this.wrapper.config.get<boolean>(this.wrapper.keys.Config.SortProjectFoldersAlphabetically), 1);
                refresh2 = true; // refresh2 will rebuild the tree but won't trigger a file cache build and/or task provider invalidation
            }

            //
            // Program paths
            //
            if (this.wrapper.config.affectsConfiguration(e, "pathToPrograms"))
            {
                const newPathToPrograms = this.wrapper.config.get<IDictionary<string>>("pathToPrograms");
                for (const p of Object.keys(this._pathToPrograms))
                {
                    const taskType = getTaskTypeRealName(p),
                        oldValue = this._pathToPrograms[p],
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
                Object.assign(this._pathToPrograms, newPathToPrograms);
            }

            //
            // Extra Bash Globs (for extensionless script files)
            //
            if (this.wrapper.config.affectsConfiguration(e, "globPatternsBash") && !refreshTaskTypes.includes("bash"))
            {
                this.wrapper.log.write("   the 'globPatternsBash' setting has changed", 1);
                await this.wrapper.fileWatcher.registerFileWatcher("bash", false, this.wrapper.config.get<boolean>("enabledTasks.bash"), "   ");
                registerChange("bash");
            }

            //
            // Extra Apache Ant Globs (for non- build.xml files)s
            //
            if (this.wrapper.config.affectsConfiguration(e, "includeAnt", "globPatternsAnt") && !refreshTaskTypes.includes("ant"))
            {
                this.wrapper.log.write("   the 'globPatternsAnt' setting has changed", 1);
                await this.wrapper.fileWatcher.registerFileWatcher("ant", false, this.wrapper.config.get<boolean>("enabledTasks.ant"), "   ");
                registerChange("ant");
            }

            //
            // Whether or not to use 'ansicon'when running 'ant' tasks
            //
            if (this.wrapper.config.affectsConfiguration(e, "enableAnsiconForAnt"))
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
            if (this.wrapper.config.affectsConfiguration(e, "useAnt"))
            {
                this.wrapper.log.write("   the 'useAnt' setting has changed", 1);
                this.wrapper.log.value("      new value", this.wrapper.config.get<boolean>("useAnt"), 1);
                registerChange("ant");
            }

            //
            // Whether or not to use the 'gulp' program to detect gulp tasks (default is custom parser)
            //
            if (this.wrapper.config.affectsConfiguration(e, "useGulp"))
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
            if (this.wrapper.config.affectsConfiguration(e, "showHiddenWsTasks"))
            {
                this.wrapper.log.write("   the 'npm.showHiddenWsTasks' setting has changed", 1);
                this.wrapper.log.value("      new value", this.wrapper.config.get<boolean>("showHiddenWsTasks"), 1);
                registerChange("Workspace");
            }

            //
            // Integrated shell.  This should bethe last check in this if() block, since it
            // is the only change in the block that can set 'refresh'.
            //
            if (e.affectsConfiguration("terminal.integrated.shell.windows") || e.affectsConfiguration("terminal.integrated.shell.linux") ||
                e.affectsConfiguration("terminal.integrated.shell.osx"))
            {   //
                // Script type task defs will change with terminal change
                //
                this.wrapper.log.write("   a terminal shell setting has changed", 1);
                this.wrapper.log.value("      windows shell", this.wrapper.config.getVs<boolean>("terminal.integrated.shell.windows"), 2);
                this.wrapper.log.value("      linux shell", this.wrapper.config.getVs<boolean>("terminal.integrated.shell.linux"), 2);
                this.wrapper.log.value("      osx shell", this.wrapper.config.getVs<boolean>("terminal.integrated.shell.osx"), 2);
                getScriptTaskTypes().forEach(t => { if (this._enabledTasks[t]) registerChange(t); });
            }
        }

        //
        // Refresh tree depending on specific settings changes
        //
        try
        {   if (refresh || refreshTaskTypes.length > 3)
            {
                await executeCommand(this.wrapper.keys.Commands.Refresh, undefined, false, "   ");
            }
            else if (refreshTaskTypes.length > 0)
            {
                for (const t of refreshTaskTypes) {
                    await executeCommand(this.wrapper.keys.Commands.Refresh, t, undefined, "   ");
                }
            }
            else if (refresh2) {
                await executeCommand(this.wrapper.keys.Commands.Refresh, false, undefined, "   ");
            }
            else {
                this.wrapper.log.write("   current changes require no processing", 1);
            }
        }
        catch (e) {
            /* istanbul ignore next */
            this.wrapper.log.error(e);
        }
        finally {
            this._processingConfigEvent = false;
            this._onReady.fire();
        }

        this.wrapper.log.methodDone("process config changes", 1);
    };

}
