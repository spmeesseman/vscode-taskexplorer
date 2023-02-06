/* eslint-disable prefer-arrow/prefer-arrow-functions */

import * as minimatch from "minimatch";
import log from "../log/log";
import { Commands, Globs } from "../constants";
import TaskFile from "../../tree/file";
import TaskItem from "../../tree/item";
import { configuration } from "./configuration";
import { basename, extname, sep } from "path";
import { ILicenseManager } from "../../interface/ILicenseManager";
import { WorkspaceFolder, Uri, workspace, window, commands } from "vscode";
import { executeCommand } from "../command";


export function getCombinedGlobPattern(defaultPattern: string, globs: string[]): string
{
    if (globs && globs.length > 0)
    {
        let multiFilePattern = "{" + defaultPattern;
        for (const i of globs) {
            multiFilePattern += ",";
            multiFilePattern += i;
        }
        multiFilePattern += "}";
        return multiFilePattern;
    }
    return defaultPattern;
}


export function getGroupSeparator()
{
    return configuration.get<string>("groupSeparator", Globs.DEFAULT_SEPARATOR);
}


export function getGlobPattern(taskType: string): string
{
    taskType = taskType.replace(/\W*\-/, "");
    if (taskType === "ant") {
        return getCombinedGlobPattern(Globs.GLOB_ANT,
                [ ...configuration.get<string[]>("includeAnt", []), ...configuration.get<string[]>("globPatternsAnt", []) ]);
    }
    else if (taskType === "bash") {
        return getCombinedGlobPattern(Globs.GLOB_BASH, configuration.get<string[]>("globPatternsBash", []));
    }
    else {
        return Globs["GLOB_" + taskType.toUpperCase()];
    }
}


export function getPackageManager(): string
{
    let pkgMgr = workspace.getConfiguration("npm", null).get<string>("packageManager") || "npm";
    if (pkgMgr.match(/(npm|auto)/)) { // pnpm/auto?  only other option is yarn
        pkgMgr = "npm";
    }
    return pkgMgr;
}


export function getWorkspaceProjectName(fsPath: string)
{
    let project = basename(fsPath);
    const wsf = workspace.getWorkspaceFolder(Uri.file(fsPath));
    /* istanbul ignore else */
    if (wsf) {
        project = basename(wsf.uri.fsPath);
    }
    return project;
}


export function isArray<T>(value: any): value is T[]
{
    return !!value && Array.isArray(value);
}


export function isBoolean(value: any): value is boolean
{
    return (value === false || value === true) && typeof value === "boolean";
}


export function isError(e: any): e is Error
{
    return e instanceof Error;
}


export function isExcluded(uriPath: string, logPad = "")
{
    const exclude = configuration.get<string[]>("exclude", []);

    log.methodStart("Check exclusion", 4, logPad, false, [[ "path", uriPath ]]);

    for (const pattern of exclude)
    {
        log.value("   checking pattern", pattern, 5);
        if (testPattern(uriPath, pattern))
        {
            log.methodDone("Check exclusion", 4, logPad, [[ "excluded", "yes" ]]);
            return true;
        }
        if (!extname(uriPath) && !uriPath.endsWith(sep))
        {
            if (testPattern(uriPath + sep, pattern))
            {
                log.methodDone("Check exclusion", 4, logPad, [[ "excluded", "yes" ]]);
                return true;
            }
        }
    }

    log.methodDone("Check exclusion", 4, logPad, [[ "excluded", "no" ]]);
    return false;
}


export function isFunction(value: any)
{
    return !!value && typeof value === "function";
}


export const isNumber = (n: any): n is number => (n || n === 0) && typeof n === "number" && isFinite(n);


export function isObject(value: any): value is { [key: string]: any }
{
    return !!value && (value instanceof Object || typeof value === "object") && !isArray(value);
}


export const isObjectEmpty = (value: any) =>
{
    if (value)
    {
        for (const key in value)
        {
            if ({}.hasOwnProperty.call(value, key)) {
                return false;
            }
        }
    }
    return true;
};


export function isSpecial(taskItem: TaskItem)
{
    return taskItem && taskItem.id &&
           (taskItem.id.includes(Globs.LAST_TASKS_LABEL + ":") ||
            taskItem.id.includes(Globs.FAV_TASKS_LABEL + ":") ||
            taskItem.id.includes(Globs.USER_TASKS_LABEL + ":"));
}


export function isString(value: any, notEmpty = false): value is string
{
    return (!!value || (value === "" && !notEmpty)) && (value instanceof String || typeof value === "string");
}


export const isTaskFile = (t: any): t is TaskFile => t instanceof TaskFile;


/**
 * @param taskType Task type, e.g. `npm`, `apppublisher`, `grunt`, `bash`, etc
 * @returns `true` if enabled, `false` if disabled
 */
export function isTaskTypeEnabled(taskType: string)
{
    const settingName = "enabledTasks." + taskType.replace(/\-/g, "").toLowerCase();
    return configuration.get<boolean>(settingName, false);
}


export const isUri = (u: any): u is Uri => !!u && u instanceof Uri;


export function isWorkspaceFolder(value: any): value is WorkspaceFolder
{
    return value && typeof value !== "number";
}


export function lowerCaseFirstChar(s: string, removeSpaces: boolean)
{
    let fs = "";
    /* istanbul ignore else */
    if (s)
    {
        fs = s[0].toString().toLowerCase();
        if (s.length > 1) {
            fs += s.substring(1);
        }
        if (removeSpaces) {
            fs = fs.replace(/ /g, "");
        }
    }
    return fs;
}


export function pushIfNotExists(arr: any[], item: any)
{
    if (!arr.includes(item)) { arr.push(item); }
}


export function pluralize(s: string, count: number)
    // options?: {
    //     infix?: string; /** Controls the character/string between the count and the string */
    //     format?: (count: number) => string | undefined; /** Formats the count */
    //     only?: boolean; /** Controls if only the string should be included */
    //     plural?: string; /** Controls the plural version of the string */
    //     zero?: string; /** Controls the string for a zero value */
    // })
{
    return `${count} ${s}${count === 1 ? "" : "s"}`;
	// if (!isObject(options)) return `${count} ${s}${count === 1 ? "" : "s"}`;
	// const suffix = count === 1 ? s : options.plural ?? `${s}s`;
	// if (options.only) return suffix;
	// return `${count === 0 ? options.zero ?? count : options.format?.(count) ?? count}${options.infix ?? " "}${suffix}`;
}


// export const removeFromArray = <T>(arr: T[], cb: (value: any, index: number, array: T[]) => void)
// {
//     const shallowReverse = arr.slice().reverse();
//     for (const item of shallowReverse)
//     {
//         fn(item, index, object);
//     }
//     shallowReverse.forEach((item, index, object) =>
//     {
//         fn(item, index, object);
//     });
// };

export function removeFromArray(arr: any[], item: any)
{
    let idx = -1;
    let idx2 = -1;

    if (!arr.includes(item)) {
        return;
    }

    for (const each of arr)
    {
        idx++;
        if (item === each) {
            idx2 = idx;
            break;
        }
    }

    /* istanbul ignore else */
    if (idx2 !== -1 && idx2 < arr.length) {
        arr.splice(idx2, 1);
    }
}


// // Removes \ / : * ? " < > | and C0 and C1 control codes
// // eslint-disable-next-line no-control-regex
// const illegalCharsForFSRegex = /[\\/:*?"<>|\x00-\x1f\x80-\x9f]/g;
//
// export function sanitizeForFileSystem(s: string, replacement: string = '_') {
// 	if (!s) return s;
// 	return s.replace(illegalCharsForFSRegex, replacement);
// }


let maxTasksMessageShown = false;
const maxTaskTypeMessageShown: any = {};
export function showMaxTasksReachedMessage(licMgr: ILicenseManager, taskType?: string, force?: boolean)
{
    if (force || ((!maxTasksMessageShown && !taskType) || (taskType && !maxTaskTypeMessageShown[taskType] && Object.keys(maxTaskTypeMessageShown).length < 3)))
    {
        maxTasksMessageShown = true;
        licMgr.setMaxTasksReached(true);
        if (taskType)
        {
            maxTaskTypeMessageShown[taskType] = true;
        }
        const msg = `The max # of parsed ${taskType ?? ""} tasks in un-licensed mode has been reached`;
        return window.showInformationMessage(msg, "Enter License Key", "Info", "Not Now")
		.then(async (action) =>
		{
			if (action === "Enter License Key")
			{
				await executeCommand(Commands.EnterLicense);
			}
			else if (action === "Info")
			{
				await executeCommand(Commands.ShowLicensePage);
			}
		});
    }
}


export function testPattern(path: string, pattern: string): boolean
{
    return minimatch(path, pattern, { dot: true, nocase: true });
}


export const timeout = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
