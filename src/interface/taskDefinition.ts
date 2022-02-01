
import { Uri, TaskDefinition } from "vscode";


export interface TaskExplorerDefinition extends TaskDefinition
{
    /**
     * @property target
     *
     * The task 'name'.  This is also used to call the task provider's (TaskExplorerProvider /
     * ExternalExplorerProvider) createTask() function when a background task is to be created.
     */
    target?: string;
    /**
     * @property script
     *
     * Used by a `script` task provider i.e. bash, batch, python, etc.  Set to the resource
     * file path.
     */
    script?: string;
    /**
     * @property path
     *
     * Relative path to the file that the task is from, relative to the containing workspace
     * directory
     */
    path?: string;
    /**
     * @property fileName
     *
     * File name that the task is from (no path).
     */
    fileName?: string;
    /**
     * @property uri
     *
     * The `Uri` of file task is from
     */
    uri?: Uri;
    /**
     * @property isDefault
     *
     * Is default task in the file that the tasks were read from.  Will be labled in the task
     * tree as such.
     */
    isDefault?: boolean;
    /**
     * @property takesArgs
     *
     * @readonly
     *
     * Gets set to `true` if this is `script` provider and argument paremeters were found in
     * the file content.
     */
    takesArgs?: boolean;
    /**
     * @property taskItemId
     *
     * @readonly
     *
     *  Internal use only.
     */
    taskItemId?: string;
    /**
     * @property scriptFile
     *
     * Specifies the file itself is a script to run, e.g. bash, python.  The script is specified
     * by the `script` property.
     */
    scriptFile?: boolean;
    /**
     * @property scriptType
     *
     * The `script` task provider has multiple sub-task-types, e.g. bash, python
     */
    scriptType?: string;
    /**
     * @property cmdLine
     *
     * The full command that is executed for this task.  This should be the same as the command
     * line used to create the Execution.  Used by background tasks to build a new Execution item.
     */
    cmdLine?: string;
    /**
     * @property icons
     *
     * @since 2.8.0
     *
     * The icon to use for tree file / folder nodes.
     */
    icon?: string;
    /**
     * @property iconDark
     *
     * @since 2.8.0
     *
     * The icon to use for tree file / folder nodes when UI is in dark mode.  Defaults to `icon` if
     * not specified.
     */
    iconDark?: string;
}
