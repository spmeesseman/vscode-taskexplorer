
import { Uri, TaskDefinition } from "vscode";


export interface TaskExplorerDefinition extends TaskDefinition
{
    /**
     * @property target
     * label
     */
    target?: string;
    /**
     * @property target
     * @deprecated
     * set to same as `target` for now.
     */
    script?: string;
    /**
     * @property path
     * path to file task is from
     */
    path?: string;
    /**
     * @property fileName
     * file name task is from
     */
    fileName?: string;
    /**
     * @property uri
     * uri of file task is from
     */
    uri?: Uri;
    /**
     * @property isDefault
     * Is default task in group
     */
    isDefault?: boolean;
    /**
     * @property takesArgs
     * `true` if this is type='script' and argument paremeters were found in the file content
     */
    takesArgs?: boolean;
    /**
     * @property taskItemId
     * @readonly
     *  Internal use only.
     */
    taskItemId?: string;
    /**
     * @property scriptFile
     * Specified the file itself is a script to run, e.g. bash, python
     */
    scriptFile?: boolean;
    /**
     * @property scriptType
     * The `script` task provider has multiple sub-task-types, e.g. bash, python
     */
    scriptType?: string;
    /**
     * @property cmdLine
     * The command to execute for this task
     */
    cmdLine?: string;
    /**
     * @property icon
     * @since 2.8.0
     * The icon to use for tree file nodes
     */
    icon?: string;
    /**
     * @property icon
     * @since 2.8.0
     * The icon to use for tree file nodes when UI is in dark mode.  Defaults to `icon` if not specified.
     */
    iconDark?: string;
}
